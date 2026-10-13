// ============================================================================
// STRANGE MESSENGER - INBOX & INTERACTION MODULE
// ============================================================================
// Handles:
// 1. Loading received letters (delivered & in-transit countdown)
// 2. Reading letter & marking as read
// 3. Replying back to original sender (max 400 words)
// 4. Reporting letter (3 reports auto-hides it)
// 5. Blocking sender (future letters blocked)
// ============================================================================

import { supabase } from './supabaseClient.js';
import { countWords, hasLink, hasProfanity } from './badwords.js';

/**
 * Fetches all deliveries for the current user.
 * Separates them into "Delivered Letters" and "Letters in Transit".
 * @param {string} userId
 */
export async function fetchInboxDeliveries(userId) {
    try {
        const { data, error } = await supabase
            .from('deliveries')
            .select(`
                id,
                deliver_at,
                read_at,
                created_at,
                letter:letters (
                    id,
                    body,
                    mood,
                    postmark,
                    is_hidden,
                    created_at,
                    sender_id,
                    sender:profiles!sender_id (
                        id,
                        nickname,
                        state_name
                    )
                )
            `)
            .eq('receiver_id', userId)
            .order('deliver_at', { ascending: false });

        if (error) throw error;

        const now = new Date();
        const delivered = [];
        const inTransit = [];

        (data || []).forEach(item => {
            const deliverTime = new Date(item.deliver_at);
            // Ignore hidden letters
            if (item.letter && item.letter.is_hidden) return;

            if (deliverTime <= now) {
                // If it is ready to read and letter data is available
                if (item.letter) {
                    delivered.push(item);
                }
            } else {
                // In transit (traveling)
                inTransit.push(item);
            }
        });

        // Sort delivered letters newest first
        delivered.sort((a, b) => new Date(b.deliver_at || b.created_at) - new Date(a.deliver_at || a.created_at));
        // Sort in-transit: soonest delivery arriving first
        inTransit.sort((a, b) => new Date(a.deliver_at) - new Date(b.deliver_at));

        return { delivered, inTransit };
    } catch (err) {
        console.error("Error fetching inbox deliveries:", err);
        return { delivered: [], inTransit: [] };
    }
}

/**
 * Deletes a delivered letter from the user's inbox.
 * @param {string} deliveryId
 * @param {string} userId
 */
export async function deleteInboxDelivery(deliveryId, userId) {
    try {
        const { error } = await supabase
            .from('deliveries')
            .delete()
            .eq('id', deliveryId)
            .eq('receiver_id', userId);

        if (error) {
            console.error("deleteInboxDelivery error:", error);
            throw error;
        }

        return { success: true };
    } catch (err) {
        console.error("Error deleting inbox delivery:", err);
        throw err;
    }
}

/**
 * Marks a delivered letter as read.
 * @param {string} deliveryId
 */
export async function markAsRead(deliveryId) {
    try {
        await supabase
            .from('deliveries')
            .update({ read_at: new Date().toISOString() })
            .eq('id', deliveryId)
            .is('read_at', null);
    } catch (err) {
        console.error("Error marking delivery read:", err);
    }
}

/**
 * Sends a reply back only to the original sender of the letter.
 * @param {string} letterId
 * @param {string} senderId - Original sender ID
 * @param {string} currentUserId - Responder ID
 * @param {string} replyBody - Reply message text
 */
export async function sendReply(letterId, originalSenderId, currentUserId, replyBody) {
    if (!originalSenderId) {
        throw new Error("This is a special traveler seed letter and cannot be replied to.");
    }

    if (!replyBody || !replyBody.trim()) {
        throw new Error("Reply cannot be empty.");
    }

    const words = countWords(replyBody);
    if (words < 2) {
        throw new Error("Reply must have at least 2 words.");
    }
    if (words > 400) {
        throw new Error(`Reply exceeds 400 words (${words} words).`);
    }

    if (hasLink(replyBody)) {
        throw new Error("Links are not permitted in replies.");
    }

    const profanity = hasProfanity(replyBody);
    if (profanity.hasProfanity) {
        throw new Error(`Reply contains restricted words ("${profanity.detectedWord}").`);
    }

    const { data, error } = await supabase
        .from('replies')
        .insert({
            letter_id: letterId,
            sender_id: currentUserId,
            receiver_id: originalSenderId,
            body: replyBody.trim()
        })
        .select()
        .single();

    if (error) {
        console.error("Reply error:", error);
        throw new Error(error.message || "Failed to send reply.");
    }

    return data;
}

/**
 * Fetches replies for a particular letter.
 * @param {string} letterId
 */
export async function fetchLetterReplies(letterId) {
    try {
        const { data, error } = await supabase
            .from('replies')
            .select(`
                id,
                body,
                created_at,
                sender:profiles!sender_id (
                    nickname,
                    state_name
                )
            `)
            .eq('letter_id', letterId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (e) {
        console.error("Error fetching letter replies:", e);
        return [];
    }
}

/**
 * Reports a letter for inappropriate content.
 * (Database trigger will auto-hide it if it reaches 3 reports).
 * @param {string} letterId
 * @param {string} currentUserId
 * @param {string} reason
 */
export async function reportLetter(letterId, currentUserId, reason = 'inappropriate') {
    try {
        const { error } = await supabase
            .from('reports')
            .insert({
                letter_id: letterId,
                reporter_id: currentUserId,
                reason: reason
            });

        if (error) {
            if (error.code === '23505') {
                return { success: false, message: "You have already reported this letter." };
            }
            throw error;
        }

        return { success: true, message: "Letter reported. Our community safety filter will review it." };
    } catch (e) {
        console.error("Report error:", e);
        return { success: false, message: e.message || "Could not report letter." };
    }
}

/**
 * Blocks the sender so future letters from them never reach the current user.
 * @param {string} currentUserId - The user who is blocking
 * @param {string} senderToBlockId - The sender to be blocked
 */
export async function blockSender(currentUserId, senderToBlockId) {
    if (!senderToBlockId) {
        return { success: false, message: "Cannot block a system letter." };
    }

    try {
        const { error } = await supabase
            .from('blocks')
            .insert({
                blocker_id: currentUserId,
                blocked_id: senderToBlockId
            });

        if (error && error.code !== '23505') throw error;

        return { success: true, message: "Sender blocked. You will never receive their letters again." };
    } catch (e) {
        console.error("Block error:", e);
        return { success: false, message: e.message || "Failed to block user." };
    }
}
