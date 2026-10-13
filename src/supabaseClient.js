// ============================================================================
// STRANGE MESSENGER - SUPABASE CLIENT INITIALIZATION
// ============================================================================
// Loads the Supabase client using ES modules.
// Works seamlessly in both:
// 1. Direct browser serving (python -m http.server) via CDN
// 2. Vite bundler (Cloudflare Pages)
// ============================================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Priority order for Supabase URL and Anon Key:
// 1. Vite environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
// 2. window.SM_CONFIG (from config.js if present)
// 3. localStorage (allows beginner user to input keys in UI without touching code)

let supabaseUrl = '';
let supabaseAnonKey = '';

// Check Vite env
if (typeof import.meta !== 'undefined' && import.meta.env) {
    supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
}

// Check window config
if (!supabaseUrl && window.SM_CONFIG) {
    supabaseUrl = window.SM_CONFIG.SUPABASE_URL || '';
    supabaseAnonKey = window.SM_CONFIG.SUPABASE_ANON_KEY || '';
}

// Check localStorage
if (!supabaseUrl) {
    supabaseUrl = localStorage.getItem('SM_SUPABASE_URL') || '';
    supabaseAnonKey = localStorage.getItem('SM_SUPABASE_ANON_KEY') || '';
}

export function isConfigured() {
    return Boolean(supabaseUrl && supabaseAnonKey);
}

export function saveCredentials(url, anonKey) {
    supabaseUrl = url.trim();
    supabaseAnonKey = anonKey.trim();
    localStorage.setItem('SM_SUPABASE_URL', supabaseUrl);
    localStorage.setItem('SM_SUPABASE_ANON_KEY', supabaseAnonKey);
    window.location.reload();
}

export function clearCredentials() {
    localStorage.removeItem('SM_SUPABASE_URL');
    localStorage.removeItem('SM_SUPABASE_ANON_KEY');
    window.location.reload();
}

// Default dummy client if not yet configured, to avoid crash on load
export const supabase = isConfigured()
    ? createClient(supabaseUrl, supabaseAnonKey)
    : createClient('https://xyzcompany.supabase.co', 'dummy-key');

export { supabaseUrl, supabaseAnonKey };
