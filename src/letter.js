// ============================================================================
// STRANGE MESSENGER - LETTER COMPOSE & SEND MODULE
// ============================================================================
// Enforces:
// 1. 10 to 400 words limit
// 2. Reject links / URLs
// 3. Reject abusive / profanity words (English + Hinglish)
// 4. Mood selection (Happy, Sad, Angry, Calm, Strange)
// 5. Calls database RPC send_letter_and_match with 1-10 hour random delay
// ============================================================================

import { supabase } from './supabaseClient.js';
import { countWords, hasLink, hasProfanity } from './badwords.js';

export const ALLOWED_MOODS = [
    { id: 'calm', label: 'Calm', icon: '🕊️', desc: 'Peaceful, slow thoughts' },
    { id: 'happy', label: 'Happy', icon: '✨', desc: 'Joy, hope, gratitude' },
    { id: 'sad', label: 'Sad', icon: '🌧️', desc: 'Quiet longing, gentle grief' },
    { id: 'strange', label: 'Strange', icon: '🌌', desc: 'Mysterious, wonder, deep questions' },
    { id: 'angry', label: 'Angry', icon: '🔥', desc: 'Frustration, raw boundaries' }
];

/**
 * Checks how many letters the current user has sent in the last 24 hours.
 * @param {string} userId
 * @returns {Promise<number>}
 */
export async function getRecentLettersCount(userId) {
    try {
        const sinceTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count, error } = await supabase
            .from('letters')
            .select('id', { count: 'exact', head: true })
            .eq('sender_id', userId)
            .gte('created_at', sinceTime);

        if (error) {
            console.error("Error fetching letter count:", error);
            return 0;
        }
        return count || 0;
    } catch (e) {
        return 0;
    }
}

/**
 * Validates the letter body before submission.
 * @param {string} body - The letter content
 * @param {string} mood - Selected mood
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateLetter(body, mood) {
    if (!body || !body.trim()) {
        return { valid: false, error: "Please write something in your letter." };
    }

    const words = countWords(body);
    if (words < 10) {
        return { valid: false, error: `Your letter is too short (${words} words). Minimum 10 words required.` };
    }
    if (words > 400) {
        return { valid: false, error: `Your letter is too long (${words} words). Maximum 400 words allowed.` };
    }

    if (!mood || !ALLOWED_MOODS.some(m => m.id === mood)) {
        return { valid: false, error: "Please select a mood for your letter." };
    }

    // Check for links/URLs
    if (hasLink(body)) {
        return {
            valid: false,
            error: "Web links and URLs are not permitted. Keep letters intimate and text-only."
        };
    }

    // Check for abusive words
    const profanityCheck = hasProfanity(body);
    if (profanityCheck.hasProfanity) {
        return {
            valid: false,
            error: `Your letter contains restricted language ("${profanityCheck.detectedWord}"). Please keep letters kind and safe.`
        };
    }

    return { valid: true };
}

/**
 * Sends a letter via Supabase RPC function.
 * @param {string} body - Letter text
 * @param {string} mood - Selected mood
 * @param {string} stateName - Sender's state (postmark)
 */
export async function sendLetter(body, mood, stateName) {
    // 1. Frontend validation check
    const validation = validateLetter(body, mood);
    if (!validation.valid) {
        throw new Error(validation.error);
    }

    // Format postmark: e.g. "From Lucknow" or "From Delhi"
    const postmark = `From ${stateName}`;

    // 2. Call PostgreSQL RPC function
    // This executes atomically inside Supabase:
    // - checks 2 letters/24 hours rate limit
    // - calculates random 1-10 hours delay
    // - assigns to stranger who hasn't blocked sender
    // - assigns incoming letter in return if available
    const { data, error } = await supabase.rpc('send_letter_and_match', {
        p_body: body.trim(),
        p_mood: mood,
        p_postmark: postmark
    });

    if (error) {
        console.error("RPC Send Error:", error);
        throw new Error(error.message || "Could not deliver letter. Please try again.");
    }

    return data;
}

/**
 * Fetches sent letters by current user along with delivery status.
 * @param {string} userId
 */
export async function fetchSentLetters(userId) {
    try {
        // 1. Fetch user's own letters directly
        const { data: letters, error } = await supabase
            .from('letters')
            .select('id, body, mood, postmark, status, created_at')
            .eq('sender_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("fetchSentLetters error:", error.message, error.details);
            return [];
        }

        if (!letters || letters.length === 0) {
            return [];
        }

        // 2. Fetch deliveries separately to show traveling/delivered status
        try {
            const letterIds = letters.map(l => l.id);
            const { data: deliveries, error: delError } = await supabase
                .from('deliveries')
                .select('id, letter_id, deliver_at, read_at')
                .in('letter_id', letterIds);

            if (!delError && deliveries) {
                const deliveryMap = {};
                deliveries.forEach(d => {
                    if (!deliveryMap[d.letter_id]) deliveryMap[d.letter_id] = [];
                    deliveryMap[d.letter_id].push(d);
                });
                letters.forEach(letter => {
                    letter.deliveries = deliveryMap[letter.id] || [];
                });
            }
        } catch (delErr) {
            console.warn("Could not fetch delivery details for sent letters:", delErr);
        }

        // Sort newest letters first (descending by created_at)
        letters.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        return letters;
    } catch (err) {
        console.error("Error fetching sent letters:", err);
        return [];
    }
}

/**
 * Deletes a sent letter by ID (only allowed if the user is the sender).
 * @param {string} letterId
 * @param {string} userId
 */
export async function deleteSentLetter(letterId, userId) {
    try {
        const { error } = await supabase
            .from('letters')
            .delete()
            .eq('id', letterId)
            .eq('sender_id', userId);

        if (error) {
            console.error("deleteSentLetter error:", error.message, error.details);
            throw error;
        }

        return { success: true };
    } catch (err) {
        console.error("Error deleting letter:", err);
        throw err;
    }
}
