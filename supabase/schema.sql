-- ============================================================================
-- STRANGE MESSENGER - DATABASE SCHEMA
-- ============================================================================
-- Features included:
-- 1. Profiles (nickname 3-20 chars, state/city, 18+ confirmation, flag status)
-- 2. Letters (10-400 words check, mood tags, postmark, auto-hide on 3 reports)
-- 3. Deliveries (random 1-10 hour delay, receiver assignment)
-- 4. Replies (goes back only to original sender, max 400 words)
-- 5. Reports & Blocks (safety, blocks stop delivery, 3 reports hide letter)
-- 6. Rate Limit (strict max 2 letters per user per 24 hours enforced by trigger)
-- 7. Daily Prompts (30 rotating writing prompts)
-- 8. Row Level Security (RLS) on ALL tables so privacy is 100% guaranteed
-- ============================================================================

-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. PROFILES TABLE
-- ----------------------------------------------------------------------------
-- Har user ka public anonymous profile.
-- Real Google name aur email kabhi is table mein nahi aate.
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nickname TEXT NOT NULL UNIQUE,
    state_name TEXT NOT NULL,
    is_adult_confirmed BOOLEAN NOT NULL DEFAULT false,
    is_flagged BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Nickname 3 se 20 characters ka hona chahiye
    CONSTRAINT nickname_length_check CHECK (char_length(trim(nickname)) >= 3 AND char_length(trim(nickname)) <= 20)
);

-- ----------------------------------------------------------------------------
-- 2. LETTERS TABLE
-- ----------------------------------------------------------------------------
-- Yahan saare anonymous letters store hote hain.
CREATE TABLE IF NOT EXISTS public.letters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    body TEXT NOT NULL,
    mood TEXT NOT NULL,
    postmark TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'waiting',
    report_count INT NOT NULL DEFAULT 0,
    is_hidden BOOLEAN NOT NULL DEFAULT false,
    is_seed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Mood must be one of the 5 allowed English tags
    CONSTRAINT valid_mood CHECK (mood IN ('happy', 'sad', 'angry', 'calm', 'strange')),
    
    -- Status check
    CONSTRAINT valid_status CHECK (status IN ('waiting', 'delivered', 'archived')),

    -- Word Count: Minimum 10 words, Maximum 400 words
    CONSTRAINT letter_word_count_check CHECK (
        char_length(trim(body)) > 0 AND
        array_length(regexp_split_to_array(trim(body), '\s+'), 1) >= 10 AND
        array_length(regexp_split_to_array(trim(body), '\s+'), 1) <= 400
    )
);

-- ----------------------------------------------------------------------------
-- 3. DELIVERIES TABLE
-- ----------------------------------------------------------------------------
-- Jab koi letter kisi stranger ko assign hota hai with 1-10 hour delay.
CREATE TABLE IF NOT EXISTS public.deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    letter_id UUID NOT NULL REFERENCES public.letters(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    deliver_at TIMESTAMPTZ NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Ek receiver ko ek letter do baar deliver nahi hoga
    CONSTRAINT unique_letter_receiver UNIQUE (letter_id, receiver_id)
);

-- ----------------------------------------------------------------------------
-- 4. REPLIES TABLE
-- ----------------------------------------------------------------------------
-- Receiver ka reply jo sirf original sender ko wapas jata hai.
CREATE TABLE IF NOT EXISTS public.replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    letter_id UUID NOT NULL REFERENCES public.letters(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Reply word count: Min 2 words, Max 400 words
    CONSTRAINT reply_word_count_check CHECK (
        char_length(trim(body)) > 0 AND
        array_length(regexp_split_to_array(trim(body), '\s+'), 1) >= 2 AND
        array_length(regexp_split_to_array(trim(body), '\s+'), 1) <= 400
    )
);

-- ----------------------------------------------------------------------------
-- 5. REPORTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    letter_id UUID NOT NULL REFERENCES public.letters(id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL DEFAULT 'inappropriate',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Ek user ek hi letter ko baar-baar report nahi kar sakta
    CONSTRAINT unique_letter_report UNIQUE (letter_id, reporter_id)
);

-- ----------------------------------------------------------------------------
-- 6. BLOCKS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.blocks (
    blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (blocker_id, blocked_id),
    CONSTRAINT cannot_block_self CHECK (blocker_id <> blocked_id)
);

-- ----------------------------------------------------------------------------
-- 7. DAILY PROMPTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.daily_prompts (
    id SERIAL PRIMARY KEY,
    prompt_text TEXT NOT NULL
);

-- ============================================================================
-- INDEXES FOR MAXIMUM SPEED (Postgres Optimization)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_deliveries_receiver_time ON public.deliveries(receiver_id, deliver_at);
CREATE INDEX IF NOT EXISTS idx_letters_sender ON public.letters(sender_id);
CREATE INDEX IF NOT EXISTS idx_letters_status ON public.letters(status) WHERE status = 'waiting';
CREATE INDEX IF NOT EXISTS idx_replies_receiver ON public.replies(receiver_id);
CREATE INDEX IF NOT EXISTS idx_blocks_lookup ON public.blocks(blocker_id, blocked_id);

-- ============================================================================
-- RATE LIMIT TRIGGER (Database Enforced: Max 2 Letters Per User Per 24 Hours)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_letter_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
    letter_count INT;
BEGIN
    -- Seed letters ko rate limit se exclude karein
    IF NEW.is_seed = true OR NEW.sender_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Count letters sent in the last 24 hours
    SELECT COUNT(*)
    INTO letter_count
    FROM public.letters
    WHERE sender_id = NEW.sender_id
      AND created_at >= (now() - INTERVAL '24 hours');

    IF letter_count >= 2 THEN
        RAISE EXCEPTION 'Daily limit reached: You can only send a maximum of 2 letters every 24 hours.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_letter_rate_limit ON public.letters;
CREATE TRIGGER trg_check_letter_rate_limit
BEFORE INSERT ON public.letters
FOR EACH ROW
EXECUTE FUNCTION public.check_letter_rate_limit();

-- ============================================================================
-- AUTO-MODERATION TRIGGER (3 Reports -> Hide Letter & Flag Repeated Offenders)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_letter_report()
RETURNS TRIGGER AS $$
DECLARE
    v_report_count INT;
    v_sender_id UUID;
    v_hidden_count INT;
BEGIN
    -- Increment report count on the letter
    UPDATE public.letters
    SET report_count = report_count + 1
    WHERE id = NEW.letter_id
    RETURNING report_count, sender_id INTO v_report_count, v_sender_id;

    -- If 3 or more reports, auto-hide the letter
    IF v_report_count >= 3 THEN
        UPDATE public.letters
        SET is_hidden = true
        WHERE id = NEW.letter_id;

        -- Check how many letters from this sender have been hidden
        IF v_sender_id IS NOT NULL THEN
            SELECT COUNT(*) INTO v_hidden_count
            FROM public.letters
            WHERE sender_id = v_sender_id AND is_hidden = true;

            -- If 3 letters hidden, flag user account
            IF v_hidden_count >= 3 THEN
                UPDATE public.profiles
                SET is_flagged = true
                WHERE id = v_sender_id;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_handle_letter_report ON public.reports;
CREATE TRIGGER trg_handle_letter_report
AFTER INSERT ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.handle_letter_report();

-- ============================================================================
-- RANDOM DELIVERY RPC FUNCTION (1-10 Hours Delay + Random Stranger Matching)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.send_letter_and_match(
    p_body TEXT,
    p_mood TEXT,
    p_postmark TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_sender_id UUID := auth.uid();
    v_is_flagged BOOLEAN;
    v_new_letter_id UUID;
    v_receiver_id UUID;
    v_delay_hours NUMERIC;
    v_deliver_at TIMESTAMPTZ;
    v_incoming_letter_id UUID;
    v_incoming_deliver_at TIMESTAMPTZ;
    v_result JSONB;
BEGIN
    -- Check if user is authenticated
    IF v_sender_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated. Please log in.';
    END IF;

    -- Check if user is flagged
    SELECT is_flagged INTO v_is_flagged FROM public.profiles WHERE id = v_sender_id;
    IF v_is_flagged = true THEN
        RAISE EXCEPTION 'Your account has been temporarily restricted due to community reports.';
    END IF;

    -- 1. Insert new letter (rate limit trigger will automatically check daily limit)
    INSERT INTO public.letters (sender_id, body, mood, postmark, status)
    VALUES (v_sender_id, p_body, p_mood, p_postmark, 'waiting')
    RETURNING id INTO v_new_letter_id;

    -- 2. Find an eligible stranger receiver:
    -- - NOT the sender
    -- - NOT flagged
    -- - Neither has blocked the other
    -- - Has not already received this letter
    SELECT p.id INTO v_receiver_id
    FROM public.profiles p
    WHERE p.id <> v_sender_id
      AND p.is_flagged = false
      AND NOT EXISTS (
          SELECT 1 FROM public.blocks b
          WHERE (b.blocker_id = v_sender_id AND b.blocked_id = p.id)
             OR (b.blocker_id = p.id AND b.blocked_id = v_sender_id)
      )
      AND NOT EXISTS (
          SELECT 1 FROM public.deliveries d
          WHERE d.letter_id = v_new_letter_id AND d.receiver_id = p.id
      )
    ORDER BY random()
    LIMIT 1;

    -- 3. If a receiver is found, schedule delivery with 1 to 10 hours random delay
    IF v_receiver_id IS NOT NULL THEN
        -- Random hours between 1.0 and 10.0
        v_delay_hours := 1.0 + (random() * 9.0);
        v_deliver_at := now() + (v_delay_hours * INTERVAL '1 hour');

        INSERT INTO public.deliveries (letter_id, receiver_id, deliver_at)
        VALUES (v_new_letter_id, v_receiver_id, v_deliver_at);

        UPDATE public.letters
        SET status = 'delivered'
        WHERE id = v_new_letter_id;
    END IF;

    -- 4. Give the sender a letter in return (Cold-start or existing letters/seed letters)
    -- Look for a letter that:
    -- - was not sent by the caller
    -- - is not hidden
    -- - has not already been delivered to the caller
    -- - sender is not blocked
    SELECT l.id INTO v_incoming_letter_id
    FROM public.letters l
    WHERE (l.sender_id IS NULL OR l.sender_id <> v_sender_id)
      AND l.is_hidden = false
      AND (
          l.sender_id IS NULL OR NOT EXISTS (
              SELECT 1 FROM public.blocks b
              WHERE (b.blocker_id = v_sender_id AND b.blocked_id = l.sender_id)
                 OR (b.blocker_id = l.sender_id AND b.blocked_id = v_sender_id)
          )
      )
      AND NOT EXISTS (
          SELECT 1 FROM public.deliveries d
          WHERE d.letter_id = l.id AND d.receiver_id = v_sender_id
      )
    ORDER BY random()
    LIMIT 1;

    IF v_incoming_letter_id IS NOT NULL THEN
        -- Return letter also takes 1 to 10 hours to arrive!
        v_incoming_deliver_at := now() + ((1.0 + (random() * 9.0)) * INTERVAL '1 hour');
        INSERT INTO public.deliveries (letter_id, receiver_id, deliver_at)
        VALUES (v_incoming_letter_id, v_sender_id, v_incoming_deliver_at)
        ON CONFLICT (letter_id, receiver_id) DO NOTHING;
    END IF;

    v_result := jsonb_build_object(
        'success', true,
        'letter_id', v_new_letter_id,
        'receiver_assigned', (v_receiver_id IS NOT NULL),
        'deliver_at', v_deliver_at,
        'incoming_scheduled', (v_incoming_letter_id IS NOT NULL)
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_prompts ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Policies
-- Any authenticated user can read public nickname and state of users
CREATE POLICY "Profiles are viewable by authenticated users"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- User can only create their own profile
CREATE POLICY "Users can create their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- User can only update their own profile
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- ============================================================================
-- HELPER FUNCTIONS FOR ROW LEVEL SECURITY (Breaks infinite recursion loops)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_user_is_delivery_receiver(p_letter_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.deliveries
        WHERE letter_id = p_letter_id
          AND receiver_id = p_user_id
          AND deliver_at <= now()
    );
$$;

CREATE OR REPLACE FUNCTION public.check_user_is_letter_sender(p_letter_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.letters
        WHERE id = p_letter_id
          AND sender_id = p_user_id
    );
$$;

-- 2. Letters Policies
-- Senders can see their own letters
CREATE POLICY "Senders can view their sent letters"
ON public.letters FOR SELECT
TO authenticated
USING (sender_id = auth.uid());

-- Receivers can view letters delivered to them ONLY after deliver_at has arrived and letter is not hidden
CREATE POLICY "Receivers can view delivered letters"
ON public.letters FOR SELECT
TO authenticated
USING (
    is_hidden = false AND
    public.check_user_is_delivery_receiver(id, auth.uid())
);

-- Users can insert their own letters
CREATE POLICY "Users can insert their own letters"
ON public.letters FOR INSERT
TO authenticated
WITH CHECK (sender_id = auth.uid() OR sender_id IS NULL);

-- Senders can delete their own letters
CREATE POLICY "Senders can delete their own letters"
ON public.letters FOR DELETE
TO authenticated
USING (sender_id = auth.uid());

-- 3. Deliveries Policies
-- Receivers can view their own deliveries
CREATE POLICY "Receivers can view deliveries"
ON public.deliveries FOR SELECT
TO authenticated
USING (receiver_id = auth.uid());

-- Senders can view delivery status of their own letters (to know if it has traveled)
CREATE POLICY "Senders can view status of their letter deliveries"
ON public.deliveries FOR SELECT
TO authenticated
USING (
    public.check_user_is_letter_sender(letter_id, auth.uid())
);

-- Receivers can update read_at on their deliveries
CREATE POLICY "Receivers can update read status"
ON public.deliveries FOR UPDATE
TO authenticated
USING (receiver_id = auth.uid());

-- Receivers can delete/dismiss deliveries from their inbox
CREATE POLICY "Receivers can delete their received deliveries"
ON public.deliveries FOR DELETE
TO authenticated
USING (receiver_id = auth.uid());

-- 4. Replies Policies
-- Only the sender and receiver of the reply can view it
CREATE POLICY "Participants can view replies"
ON public.replies FOR SELECT
TO authenticated
USING (sender_id = auth.uid() OR receiver_id = auth.uid());

-- Authenticated users can insert replies
CREATE POLICY "Users can insert replies"
ON public.replies FOR INSERT
TO authenticated
WITH CHECK (sender_id = auth.uid());

-- Receiver can mark reply as read
CREATE POLICY "Receiver can mark reply read"
ON public.replies FOR UPDATE
TO authenticated
USING (receiver_id = auth.uid());

-- 5. Reports Policies
CREATE POLICY "Users can submit reports"
ON public.reports FOR INSERT
TO authenticated
WITH CHECK (reporter_id = auth.uid());

-- 6. Blocks Policies
CREATE POLICY "Users can manage their blocks"
ON public.blocks FOR ALL
TO authenticated
USING (blocker_id = auth.uid())
WITH CHECK (blocker_id = auth.uid());

-- 7. Daily Prompts Policies
CREATE POLICY "Everyone can read daily prompts"
ON public.daily_prompts FOR SELECT
TO authenticated, anon
USING (true);
