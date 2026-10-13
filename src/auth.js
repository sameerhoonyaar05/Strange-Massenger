// ============================================================================
// STRANGE MESSENGER - AUTH & ONBOARDING MODULE
// ============================================================================
// Handles:
// 1. Google OAuth sign-in via Supabase
// 2. Session detection & listener
// 3. First-time onboarding (Unique nickname 3-20 chars, State postmark, 18+ check)
// 4. Real Google name & email are NEVER exposed to other users
// ============================================================================

import { supabase, isConfigured } from './supabaseClient.js';

let currentUser = null;
let currentProfile = null;

// All Indian States & Union Territories for postmark selection
export const INDIAN_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Arah", "Bihar", "Chhattisgarh",
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
    "Karnataka", "Kerala", "Bhopal", "Madhya Pradesh", "Nagpur", "Mumbai", "Maharashtra", "Manipur",
    "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
    "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
    "Lucknow", "Prayagraj", "Varanasi", "Uttar Pradesh", "Uttarakhand", "West Bengal",
    // Union Territories
    "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
    "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

/**
 * Initiates Google OAuth Sign-In.
 */
export async function signInWithGoogle() {
    if (!isConfigured()) {
        alert("Please configure your Supabase URL & Anon Key first!");
        return;
    }

    try {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        });
        if (error) throw error;
    } catch (err) {
        console.error("Sign-in error:", err);
        alert("Google Sign-In failed: " + err.message);
    }
}

/**
 * Signs out the current user.
 */
export async function signOut() {
    try {
        await supabase.auth.signOut();
        currentUser = null;
        currentProfile = null;
        window.location.reload();
    } catch (err) {
        console.error("Sign-out error:", err);
    }
}

/**
 * Checks if a nickname is already taken by another user.
 * @param {string} nickname
 * @returns {Promise<boolean>} - True if available, false if taken
 */
export async function isNicknameAvailable(nickname) {
    const trimmed = nickname.trim();
    if (trimmed.length < 3 || trimmed.length > 20) return false;

    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('id')
            .ilike('nickname', trimmed)
            .maybeSingle();

        if (error && error.code !== 'PGRST116') {
            console.error("Nickname check error:", error);
            return false;
        }

        return !data; // If no data found, nickname is available!
    } catch (e) {
        return false;
    }
}

/**
 * Fetches user profile from database.
 * @param {string} userId
 */
export async function fetchProfile(userId) {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

        if (error) {
            console.error("Error fetching profile:", error);
            return null;
        }
        currentProfile = data;
        return data;
    } catch (e) {
        console.error("Profile exception:", e);
        return null;
    }
}

/**
 * Creates profile for first-time user after 18+ check and nickname selection.
 * @param {string} nickname
 * @param {string} stateName
 * @param {boolean} isAdult
 */
export async function completeOnboarding(nickname, stateName, isAdult) {
    if (!currentUser) throw new Error("User not authenticated");
    if (!isAdult) throw new Error("You must confirm you are 18 or older.");

    const cleanNickname = nickname.trim();
    if (cleanNickname.length < 3 || cleanNickname.length > 20) {
        throw new Error("Nickname must be between 3 and 20 characters.");
    }

    if (!INDIAN_STATES.includes(stateName)) {
        throw new Error("Please select a valid State or UT.");
    }

    // Check availability
    const available = await isNicknameAvailable(cleanNickname);
    if (!available) {
        throw new Error(`The nickname "${cleanNickname}" is already taken. Please choose another.`);
    }

    // Insert into profiles
    const { data, error } = await supabase
        .from('profiles')
        .insert({
            id: currentUser.id,
            nickname: cleanNickname,
            state_name: stateName,
            is_adult_confirmed: true
        })
        .select()
        .single();

    if (error) {
        console.error("Onboarding insert error:", error);
        throw error;
    }

    currentProfile = data;
    return data;
}

export function getCurrentUser() {
    return currentUser;
}

export function getCurrentProfile() {
    return currentProfile;
}

/**
 * Sets up auth listener and handles onboarding visibility.
 * @param {Function} onStateChanged - Callback receiving (user, profile)
 */
export function initAuth(onStateChanged) {
    if (!isConfigured()) {
        onStateChanged(null, null);
        return;
    }

    // Get current session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (session && session.user) {
            currentUser = session.user;
            currentProfile = await fetchProfile(session.user.id);
            onStateChanged(currentUser, currentProfile);
        } else {
            currentUser = null;
            currentProfile = null;
            onStateChanged(null, null);
        }
    });

    // Listen for auth changes (login, logout, token refresh)
    supabase.auth.onAuthStateChange(async (event, session) => {
        if (session && session.user) {
            currentUser = session.user;
            currentProfile = await fetchProfile(session.user.id);
            onStateChanged(currentUser, currentProfile);
        } else {
            currentUser = null;
            currentProfile = null;
            onStateChanged(null, null);
        }
    });
}
