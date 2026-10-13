// ============================================================================
// STRANGE MESSENGER - 30 DAILY WRITING PROMPTS
// ============================================================================
// Inspiring, emotional, and thoughtful prompts in English.
// Automatically selects today's prompt based on the day of the year,
// with an option to shuffle for another prompt.
// ============================================================================

export const DAILY_PROMPTS = [
    "Tell a stranger what you never had the courage to say in person.",
    "What is a small, quiet memory that still makes you smile on difficult days?",
    "Describe a moment when a complete stranger showed you unexpected kindness.",
    "If you could send a one-sentence message to your future self, what would it be?",
    "What is something you forgive yourself for, even if it took a long time?",
    "Write about the scent or sound that instantly takes you back to childhood.",
    "What is a secret dream you rarely speak out loud because you fear judgment?",
    "If your hometown had a personality, what would it say to a weary traveler?",
    "Write a letter to the person you used to be five years ago.",
    "What is the most comforting piece of advice anyone has ever given you?",
    "Describe a song that feels like it was written specifically for your soul.",
    "What made you feel genuinely grateful today, no matter how tiny it seemed?",
    "If tonight was your last quiet evening before a big journey, how would you spend it?",
    "What is something heavy you are carrying right now that you need to put down?",
    "Tell me about a friendship that ended without drama, just faded into memories.",
    "What does true peace feel like to you in physical terms?",
    "Describe the sky outside your window right now as if the reader is blind.",
    "What is a mistake you made that ended up leading you somewhere beautiful?",
    "If you could leave a note in a public library book for anyone to find, what would it say?",
    "What is something you wish people understood about you without having to explain?",
    "Write about an ordinary afternoon that somehow felt magical in retrospect.",
    "What is a promise you made to yourself that you intend to keep no matter what?",
    "How do you comfort yourself when the world feels too loud and fast?",
    "Write a thank you note to someone who will probably never know you wrote it.",
    "What is the bravest thing you have done recently that went unnoticed by everyone?",
    "If you could relive just one hour from your past without changing anything, which one?",
    "What does hope look like when everything else feels uncertain?",
    "Tell a stranger about a place on earth where you felt completely safe.",
    "What is a question you wish someone would ask you today?",
    "Leave one gentle reminder for whoever opens this letter on their screen."
];

/**
 * Returns today's prompt based on the day of the year (1 - 365).
 * Everyone visiting on the same calendar day sees the same daily prompt.
 */
export function getPromptOfTheDay() {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 0);
    const diff = now - startOfYear;
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    const index = dayOfYear % DAILY_PROMPTS.length;
    return {
        index: index + 1,
        text: DAILY_PROMPTS[index]
    };
}

/**
 * Returns a random prompt from the list.
 */
export function getRandomPrompt(excludeText = "") {
    const filtered = DAILY_PROMPTS.filter(p => p !== excludeText);
    const randomIndex = Math.floor(Math.random() * filtered.length);
    return filtered[randomIndex];
}
