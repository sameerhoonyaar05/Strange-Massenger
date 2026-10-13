# ✉️ Strange Messenger (Letters to Strangers)

> **"Anjaan ko Message"** — Ek safe, calm aur anonymous website jahan logged-in users heartfelt letters likhte hain jo random strangers tak pahunchte hain. 100% Free (₹0 cost), no separate server, mobile-first paper aesthetic.

---

## 🌟 Features Overview

1. **Google Sign-In Only**:
   - Koi phone/SMS OTP nahi (SMS me paise lagte hain).
   - Real Google name aur email **kabhi kisi ko nahi dikhte**.
   - First login par unique Anonymous Nickname (3-20 characters) aur State postmark choose karna hota hai.
   - **18+ Age Verification** checkbox compliant with Indian DPDP Act.

2. **Letter Writing & Constraints**:
   - Minimum 10 words, Maximum 400 words (Live word counter + PostgreSQL CHECK constraint).
   - 5 English Mood tags: **Calm**, **Happy**, **Sad**, **Strange**, **Angry**.
   - 30 Daily rotating writing prompts with a shuffle button.
   - Real-time Link Blocker (`http://`, `https://`, `www.`, etc.) aur Hinglish/English Bad-Words moderation filter.

3. **Random Stranger Delivery with 1-10 Hours Delay**:
   - Postgres atomic function (`send_letter_and_match`) se randomly assign hota hai.
   - 1 se 10 ghante ka random delay (`deliver_at = now() + (1 to 10 hours)`), jisse lagta hai letter sach mein safar kar raha hai.
   - Receiver ke inbox mein letter tabhi open hota hai jab time pura hota hai (tab tak countdown timer dikhta hai).

4. **Database-Enforced Rate Limit**:
   - Har user 24 ghante mein maximum **2 letters** hi bhej sakta hai (PostgreSQL DB trigger se locked).

5. **Safety, Reports & Block System**:
   - Har letter par **Report** aur **Block** button.
   - Kisi letter ko agar 3 alag users report karte hain, toh woh **auto-hide** ho jata hai.
   - Agar kisi sender ke 3 letters hide hote hain, toh unka account **auto-flagged** ho jata hai.
   - Block karne par us stranger ke future letters aapke paas kabhi nahi aayenge.

6. **Seed Content (Cold Start Problem Solved)**:
   - Launch ke waqt naye users ko khali inbox na mile, iske liye 50 positive, warm letters alag-alag states se pehle se database mein seeded hain.

7. **Keep-Alive (Project Pause Se Bachana)**:
   - Supabase free projects 7 din inactive rehne par pause ho jate hain.
   - Humara included GitHub Action workflow har 3 din mein Supabase ko ping karta hai (₹0 / Free).

---

## 📁 Project Directory Structure

```text
random message/
├── index.html                 # Main App (Single Page Application: Inbox, Write, Sent, Profile)
├── terms.html                 # Terms of Service (Indian IT Rules & 18+ policy)
├── privacy.html               # Privacy Policy (DPDP Act 2023 compliance)
├── package.json               # Vite project configuration
├── vite.config.js             # Vite multi-page config
├── .env.example               # Environment variables template
├── README.md                  # Complete Hinglish guide
├── .github/
│   └── workflows/
│       └── keep_alive.yml     # Free GitHub Actions cron to keep Supabase awake
├── src/
│   ├── style.css              # Custom CSS: Vintage paper theme, postmarks, wax seals, mobile layout
│   ├── supabaseClient.js      # Supabase JavaScript client loader
│   ├── auth.js                # Google OAuth, Nickname uniqueness & 18+ onboarding
│   ├── badwords.js            # Link blocker & English/Hinglish profanity filter
│   ├── prompts.js             # 30 daily writing prompts
│   ├── letter.js              # Word count validation, mood selection, Supabase RPC call
│   └── inbox.js               # Received letters, traveling countdowns, replies, reports & blocks
└── supabase/
    ├── schema.sql             # All tables, constraints, RLS policies, rate limits & RPC functions
    └── seed.sql               # 30 daily prompts & 50 kind starter letters
```

---

## 🚀 STEP-BY-STEP SETUP GUIDE (Beginner-Friendly)

### STEP 1: Supabase Project Setup (5 Minutes)

1. [supabase.com](https://supabase.com) par jao aur free account banao.
2. **"New Project"** par click karo.
   - Name: `strange-messenger`
   - Database Password: Apna ek strong password likh kar save kar lo.
   - Region: Select karo **South Asia (Mumbai)** (India ke sabse paas aur fast).
   - Pricing Plan: **Free Plan** (₹0).
3. Project create hone ke baad (1 minute lagta hai), left sidebar mein **SQL Editor** (icon `>_`) par click karo.
4. **"New Query"** par click karo.
5. Is project ki file `supabase/schema.sql` ka sara code copy karke wahan paste karo aur **"Run"** (Ctrl+Enter) daba do.
   - *Result: Saari tables, RLS policies, rate limit triggers aur delivery function ban jayenge.*
6. Ab dubara **"New Query"** par click karo.
7. File `supabase/seed.sql` ka sara code copy karke wahan paste karo aur **"Run"** daba do.
   - *Result: 30 daily prompts aur 50 sample letters database mein insert ho jayenge.*
8. Left sidebar mein **Settings (Gear icon)** → **API** par jao.
   - Yahan se **Project URL** copy karo (jaise `https://xxxx.supabase.co`).
   - Aur **Project API keys** ke andar se `anon` `public` key copy karo.

---

### STEP 2: Google Sign-In Enable Karna (Free OAuth)

Supabase mein Google Login enable karne ke liye:

1. [Google Cloud Console](https://console.cloud.google.com/) par jao (apne normal Gmail se).
2. Upar dropdown se **"New Project"** select karo aur naam do `Strange Messenger`.
3. Left menu se **APIs & Services** → **OAuth consent screen** par jao:
   - User Type: **External** select karo aur "Create" par click karo.
   - App name: `Strange Messenger`
   - User support email: Apna email select karo.
   - Developer contact email: Apna email dalo.
   - "Save and Continue" par click karte hue complete karo.
4. Left menu mein **Credentials** par click karo → **Create Credentials** → **OAuth client ID**:
   - Application type: **Web application** select karo.
   - Name: `Strange Messenger Web`
   - **Authorized redirect URIs** mein "ADD URI" click karo aur yeh dalo:
     ```text
     https://<YOUR-PROJECT-REF>.supabase.co/auth/v1/callback
     ```
     *(Apne Supabase dashboard mein Authentication → Providers → Google open karoge toh wahan yeh callback URL likha hua mil jayega).*
   - **Create** par click karo. Screen par **Client ID** aur **Client Secret** aa jayega.
5. Ab wapas [Supabase Dashboard](https://supabase.com) mein jao:
   - Left menu → **Authentication** → **Providers** → **Google** select karo.
   - **Enable Google** toggle ON karo.
   - Google se copy kiya hua **Client ID** aur **Client Secret** paste karo aur **Save** par click karo.

---

### STEP 3: Laptop Par Run Karna (Testing Locally)

Tumhare computer par Python pehle se installed hai (`Python 3.14`). Tumhe koi heavy software install karne ki zarurat nahi!

1. Terminal / PowerShell open karo aur project folder mein jao:
   ```powershell
   python -m http.server 3000
   ```
2. Chrome browser open karo aur address bar mein type karo:
   ```text
   http://localhost:3000
   ```
3. Website open ho jayegi!
4. Pehli baar kholte hi screen par upar **"⚙️ Supabase connection needed: Enter Supabase Keys"** ka button aayega.
5. Us par click karke apna **Project URL** aur **Anon Key** paste kar do aur **"Save and Connect"** daba do!
6. Webpage reload hoga aur tumhara local server Supabase ke sath fully connect ho jayega!

---

### STEP 4: 2 Accounts Se Test Kaise Karein (Verification Checklist)

1. **Account 1 (Sender)**:
   - Chrome mein `http://localhost:3000` par **"Sign in with Google"** karo.
   - Nickname chunno (jaise: `Raat Ka Musafir`), State select karo (jaise `Uttar Pradesh`), aur 18+ checkbox tick karke submit karo.
   - **Write** tab par jao, prompt dekho ya shuffle karo.
   - Ek 20-30 words ka letter likho aur mood select karo (jaise `Calm`).
   - Link dalkar dekho (`google.com`) — screen par warning aayegi aur button disable ho jayega! Link hatao.
   - **"Seal & Send to a Stranger"** par click karo.
   - Sent tab mein letter ka tracking status dekho: *"Traveling in transit..."*.
2. **Account 2 (Receiver)**:
   - Ek **Incognito Window** (Ctrl+Shift+N) open karo aur doosre Google account se login karo.
   - Naya nickname chunno (jaise: `Pahaadi Panchhi`) aur State select karo (`Himachal Pradesh`).
   - Inbox mein check karo — seeded starter letters ya Account 1 ka letter travel karta hua dikhega!
   - Letter read karo, **Reply** bhej kar dekho (reply sirf Account 1 ko jayega).
   - **Report** aur **Block** button test karo.

---

### STEP 5: Cloudflare Pages Par 100% Free Host Karna (Live on Internet)

Jab tum test kar lo aur website ko internet par live karna chaho taaki sab log use kar sakein:

1. [github.com](https://github.com) par ek naya private ya public repository banao (jaise `strange-messenger`).
2. Is folder ka sara code GitHub par push kar do.
3. [dash.cloudflare.com](https://dash.cloudflare.com) par jao (Free account banao).
4. Left sidebar mein **Workers & Pages** → **Create application** → **Pages** → **Connect to Git** par click karo.
5. Apna GitHub repository `strange-messenger` select karo.
6. Build settings:
   - Framework preset: **None** (Static)
   - Build command: *(Khali chhod do)*
   - Build output directory: `.`
   - Environment variables (optional): `VITE_SUPABASE_URL` aur `VITE_SUPABASE_ANON_KEY` add kar sakte ho.
7. **"Save and Deploy"** par click karo.
8. 30 seconds ke andar tumhari website live ho jayegi aur tumhe ek free link mil jayega (jaise `https://strange-messenger.pages.dev`)!
9. **Important:** Cloudflare ka jo URL mile (`https://strange-messenger.pages.dev`), usko Supabase ke **Authentication → URL Configuration → Site URL** aur **Redirect URLs** mein zaroor add kar dena, aur Google Cloud Console ke Authorized Redirect URIs mein bhi.

---

### STEP 6: GitHub Actions Keep-Alive (Project Ko Active Rakhna)

Supabase ko 7 din baad sleep par jane se bachane ke liye:

1. Apne GitHub repository mein jao → **Settings** → **Secrets and variables** → **Actions**.
2. **"New repository secret"** click karo:
   - Name: `SUPABASE_URL` | Value: Tumhara Supabase URL
3. Doosra secret add karo:
   - Name: `SUPABASE_ANON_KEY` | Value: Tumhara Supabase Anon Key
4. Bas! File `.github/workflows/keep_alive.yml` automatically har 3 din mein Supabase ko ping karegi aur tumhara project saalon saal bina kisi kharche ke 24/7 chalta rahega.

---

## 🛡️ License & Credit
Student Project for learning and human connection • Built with HTML, CSS, JavaScript, Vite, and Supabase.
