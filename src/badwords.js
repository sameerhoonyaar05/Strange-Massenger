// ============================================================================
// STRANGE MESSENGER - CONTENT MODERATION & BAD WORDS FILTER
// ============================================================================
// 1. Link Blocker: Rejects any URL, domain name, or web link.
// 2. Bad Words Filter: Filters common abusive words in English and Hinglish.
// ============================================================================

// Regex pattern to catch URLs, links, IP addresses, and common domain extensions
const URL_REGEX = /(https?:\/\/|www\d{0,3}\.|\.com|\.org|\.in|\.net|\.xyz|\.co|\.app|\.io|\.me|[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?)/i;

// Bad words list: English + Hinglish abusive/harassing words
// Keeping the list focused on profanity, harassment, and hate speech
const BAD_WORDS_LIST = [
    // English
    'abuse', 'asshole', 'bastard', 'bitch', 'bullshit', 'cunt', 'dick', 'fuck', 'fucking',
    'fucker', 'motherfucker', 'nigger', 'nigga', 'pussy', 'slut', 'whore', 'kill yourself',
    'kys', 'suicide', 'die', 'murder', 'rape', 'rapist',
    // Hinglish (Common abusive terms)
    'bhosdike', 'bhosadike', 'madarchod', 'mc', 'bc', 'behenchod', 'bhenchod', 'chutiya',
    'chutiye', 'harami', 'kameene', 'kutta', 'kaminey', 'gandu', 'laude', 'lodu', 'randi',
    'suar', 'saale', 'teri maa', 'behnchod', 'bhadwe', 'choot', 'gaand', 'tatte', 'chodu'
];

/**
 * Checks if the given text contains any URL or website link.
 * @param {string} text - The input text to check
 * @returns {boolean} - True if a link is detected, false otherwise
 */
export function hasLink(text) {
    if (!text) return false;
    return URL_REGEX.test(text);
}

/**
 * Checks if the given text contains any abusive words (English or Hinglish).
 * @param {string} text - The input text to check
 * @returns {{ hasProfanity: boolean, detectedWord: string | null }}
 */
export function hasProfanity(text) {
    if (!text) return { hasProfanity: false, detectedWord: null };

    // Normalize text: lowercase and remove special symbols between letters
    const cleanText = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
    const words = cleanText.split(/\s+/);

    for (const badWord of BAD_WORDS_LIST) {
        // Multi-word phrase check (e.g. "kill yourself")
        if (badWord.includes(' ')) {
            if (cleanText.includes(badWord)) {
                return { hasProfanity: true, detectedWord: badWord };
            }
        } else {
            // Single word boundary check
            if (words.includes(badWord)) {
                return { hasProfanity: true, detectedWord: badWord };
            }
        }
    }

    return { hasProfanity: false, detectedWord: null };
}

/**
 * Counts the number of words in a given string.
 * @param {string} text - The input text
 * @returns {number} - Total word count
 */
export function countWords(text) {
    if (!text || !text.trim()) return 0;
    return text.trim().split(/\s+/).filter(Boolean).length;
}
