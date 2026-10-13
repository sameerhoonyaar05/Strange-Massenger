// ============================================================================
// STRANGE MESSENGER - MAIN APPLICATION LOGIC
// ============================================================================
// Coordinates:
// - Auth state & onboarding popup
// - Tab switching (Inbox, Compose, Sent, Profile)
// - Real-time word counter (10-400 words) & moderation warning
// - Sending letters with random delay via Supabase RPC
// - Inbox rendering with "In-Transit" countdown timers
// - Letter detail reader, reply composer, report & block
// ============================================================================

import { isConfigured, saveCredentials, clearCredentials } from './supabaseClient.js';
import {
    initAuth,
    signInWithGoogle,
    signOut,
    getCurrentUser,
    getCurrentProfile,
    completeOnboarding,
    isNicknameAvailable,
    INDIAN_STATES
} from './auth.js';
import { getPromptOfTheDay, getRandomPrompt } from './prompts.js';
import { countWords, hasLink, hasProfanity } from './badwords.js';
import { ALLOWED_MOODS, sendLetter, fetchSentLetters, getRecentLettersCount, deleteSentLetter } from './letter.js';
import {
    fetchInboxDeliveries,
    markAsRead,
    sendReply,
    fetchLetterReplies,
    reportLetter,
    blockSender,
    deleteInboxDelivery
} from './inbox.js';
import {
    playPaperRustle,
    playPaperUnfold,
    playWaxSealStamp,
    playEnvelopeFly,
    toggleSound
} from './audioEffects.js';

// Application State
let activeTab = 'inbox';
let selectedMood = 'calm';
let currentDailyPrompt = getPromptOfTheDay().text;
let inboxRefreshTimer = null;
let activeDetailDelivery = null;

// DOM Elements Cache
const DOM = {
    authBtnContainer: document.getElementById('auth-btn-container'),
    soundToggleBtn: document.getElementById('sound-toggle-btn'),
    waxSealOverlay: document.getElementById('wax-seal-overlay'),
    sealCaption: document.getElementById('seal-caption'),
    configBanner: document.getElementById('config-banner'),
    bottomNav: document.getElementById('bottom-nav'),
    tabButtons: document.querySelectorAll('.nav-item'),
    views: {
        inbox: document.getElementById('view-inbox'),
        compose: document.getElementById('view-compose'),
        sent: document.getElementById('view-sent'),
        profile: document.getElementById('view-profile')
    },
    // Compose Form
    composeForm: document.getElementById('compose-form'),
    promptTextEl: document.getElementById('prompt-text'),
    shufflePromptBtn: document.getElementById('shuffle-prompt-btn'),
    stateSelect: document.getElementById('letter-state-select'),
    moodGrid: document.getElementById('mood-grid'),
    letterTextarea: document.getElementById('letter-textarea'),
    wordCounter: document.getElementById('word-counter'),
    composeWarning: document.getElementById('compose-warning'),
    sendLetterBtn: document.getElementById('send-letter-btn'),
    sendAlert: document.getElementById('send-alert'),
    // Inbox
    inboxDeliveredContainer: document.getElementById('inbox-delivered-list'),
    inboxTransitContainer: document.getElementById('inbox-transit-list'),
    inboxEmptyState: document.getElementById('inbox-empty-state'),
    inboxBadge: document.getElementById('inbox-badge'),
    // Sent
    sentListContainer: document.getElementById('sent-list-container'),
    sentEmptyState: document.getElementById('sent-empty-state'),
    // Profile
    profileInitial: document.getElementById('profile-initial'),
    profileNickname: document.getElementById('profile-nickname'),
    profilePostmark: document.getElementById('profile-postmark'),
    statLettersSent: document.getElementById('stat-letters-sent'),
    statLettersReceived: document.getElementById('stat-letters-received'),
    signOutBtn: document.getElementById('sign-out-btn'),
    // Modals
    onboardingModal: document.getElementById('onboarding-modal'),
    onboardingForm: document.getElementById('onboarding-form'),
    onboardingNickname: document.getElementById('onboarding-nickname'),
    onboardingState: document.getElementById('onboarding-state'),
    onboardingAdult: document.getElementById('onboarding-adult'),
    onboardingNickStatus: document.getElementById('onboarding-nick-status'),
    onboardingError: document.getElementById('onboarding-error'),
    onboardingSubmitBtn: document.getElementById('onboarding-submit-btn'),
    // Letter Detail Modal
    letterModal: document.getElementById('letter-detail-modal'),
    letterModalClose: document.getElementById('letter-modal-close'),
    modalSenderNickname: document.getElementById('modal-sender-nickname'),
    modalPostmark: document.getElementById('modal-postmark'),
    modalMood: document.getElementById('modal-mood'),
    modalBody: document.getElementById('modal-body'),
    modalRepliesList: document.getElementById('modal-replies-list'),
    replyForm: document.getElementById('reply-form'),
    replyTextarea: document.getElementById('reply-textarea'),
    replyWordCounter: document.getElementById('reply-word-counter'),
    replyError: document.getElementById('reply-error'),
    btnReportLetter: document.getElementById('btn-report-letter'),
    btnBlockSender: document.getElementById('btn-block-sender'),
    btnDeleteLetter: document.getElementById('btn-delete-letter'),
    // Config Modal
    configModal: document.getElementById('config-modal'),
    configForm: document.getElementById('config-form'),
    configUrlInput: document.getElementById('config-url-input'),
    configKeyInput: document.getElementById('config-key-input'),
    configCloseBtn: document.getElementById('config-close-btn'),
    openConfigBtn: document.getElementById('open-config-btn')
};

// ============================================================================
// INITIALIZATION
// ============================================================================
export function initApp() {
    setupIndianStateDropdowns();
    setupMoodGrid();
    setupEventListeners();
    updateDailyPromptUI();

    // Check if Supabase keys are configured
    if (!isConfigured()) {
        if (DOM.configBanner) DOM.configBanner.style.display = 'block';
    } else {
        if (DOM.configBanner) DOM.configBanner.style.display = 'none';
    }

    // Initialize Auth listener
    initAuth((user, profile) => {
        handleAuthState(user, profile);
    });
}

// Populate State dropdowns with all 28 states & 8 UTs of India
function setupIndianStateDropdowns() {
    const selects = [DOM.stateSelect, DOM.onboardingState];
    selects.forEach(sel => {
        if (!sel) return;
        sel.innerHTML = '<option value="">Select your State or UT...</option>';
        INDIAN_STATES.forEach(state => {
            const opt = document.createElement('option');
            opt.value = state;
            opt.textContent = state;
            sel.appendChild(opt);
        });
    });
}

// Generate Mood Grid Options
function setupMoodGrid() {
    if (!DOM.moodGrid) return;
    DOM.moodGrid.innerHTML = '';
    ALLOWED_MOODS.forEach(mood => {
        const item = document.createElement('div');
        item.className = `mood-option ${mood.id === selectedMood ? 'selected' : ''}`;
        item.dataset.mood = mood.id;
        item.title = mood.desc;
        item.innerHTML = `
            <div class="mood-icon">${mood.icon}</div>
            <div class="mood-name">${mood.label}</div>
        `;
        item.addEventListener('click', () => {
            document.querySelectorAll('.mood-option').forEach(el => el.classList.remove('selected'));
            item.classList.add('selected');
            selectedMood = mood.id;
        });
        DOM.moodGrid.appendChild(item);
    });
}

// ============================================================================
// AUTH & ONBOARDING STATE HANDLER
// ============================================================================
function handleAuthState(user, profile) {
    if (!user) {
        // Logged Out
        DOM.authBtnContainer.innerHTML = `
            <button id="google-login-btn" class="btn btn-primary btn-sm">
                <span>Sign in with Google</span>
            </button>
        `;
        document.getElementById('google-login-btn').addEventListener('click', signInWithGoogle);
        if (DOM.onboardingModal) DOM.onboardingModal.classList.remove('active');
        switchTab('inbox');
        renderLoggedOutView();
        return;
    }

    // Logged In, but needs onboarding (choose nickname & 18+ check)
    if (!profile) {
        DOM.authBtnContainer.innerHTML = `<span style="font-size:0.8rem; color:var(--ink-muted);">Setting up...</span>`;
        if (DOM.onboardingModal) DOM.onboardingModal.classList.add('active');
        return;
    }

    // Fully Onboarded User
    if (DOM.onboardingModal) DOM.onboardingModal.classList.remove('active');

    // Header badge
    DOM.authBtnContainer.innerHTML = `
        <div style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;" id="user-pill">
            <span class="postmark-stamp">${escapeHtml(profile.state_name)}</span>
            <span style="font-weight:700; font-size:0.85rem;">${escapeHtml(profile.nickname)}</span>
        </div>
    `;
    document.getElementById('user-pill')?.addEventListener('click', () => switchTab('profile'));

    // Populate user state in compose dropdown
    if (DOM.stateSelect && profile.state_name) {
        DOM.stateSelect.value = profile.state_name;
    }

    // Load Data
    loadInboxData();
    loadSentData();
    updateProfileView(user, profile);
}

function renderLoggedOutView() {
    if (DOM.inboxDeliveredContainer) DOM.inboxDeliveredContainer.innerHTML = '';
    if (DOM.inboxTransitContainer) DOM.inboxTransitContainer.innerHTML = '';
    if (DOM.inboxEmptyState) {
        DOM.inboxEmptyState.style.display = 'block';
        DOM.inboxEmptyState.innerHTML = `
            <div class="empty-icon">✉️</div>
            <div class="empty-title">Letters to Strangers</div>
            <p style="margin-bottom:1.25rem;">Sign in with Google to write anonymous letters and receive messages from strangers across India.</p>
            <button class="btn btn-primary" onclick="document.getElementById('google-login-btn')?.click()">Sign In to Begin</button>
        `;
    }
}

// ============================================================================
// TAB NAVIGATION
// ============================================================================
export function switchTab(tabName) {
    activeTab = tabName;
    DOM.tabButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    Object.keys(DOM.views).forEach(key => {
        if (DOM.views[key]) {
            DOM.views[key].classList.toggle('active', key === tabName);
        }
    });

    const user = getCurrentUser();
    if (!user && (tabName === 'compose' || tabName === 'sent' || tabName === 'profile')) {
        alert("Please sign in with Google first!");
        switchTab('inbox');
        return;
    }

    if (tabName === 'inbox') loadInboxData();
    if (tabName === 'sent') loadSentData();
}

// ============================================================================
// PROMPT MANAGEMENT
// ============================================================================
function updateDailyPromptUI() {
    if (DOM.promptTextEl) {
        DOM.promptTextEl.textContent = `"${currentDailyPrompt}"`;
    }
}

// ============================================================================
// COMPOSE & LIVE VALIDATION (10-400 words, no links, no bad words)
// ============================================================================
function handleLetterInput() {
    const text = DOM.letterTextarea.value;
    const words = countWords(text);

    // Live word counter
    DOM.wordCounter.textContent = `${words} / 400 words (Min 10)`;
    DOM.wordCounter.className = 'word-counter';
    if (words < 10) {
        DOM.wordCounter.classList.add('warning');
    } else if (words > 400) {
        DOM.wordCounter.classList.add('danger');
    }

    // Live content moderation check
    if (hasLink(text)) {
        DOM.composeWarning.style.display = 'flex';
        DOM.composeWarning.textContent = '⚠️ Links and URLs are not allowed in letters to preserve safety and prevent spam.';
        DOM.sendLetterBtn.disabled = true;
        return;
    }

    const profanity = hasProfanity(text);
    if (profanity.hasProfanity) {
        DOM.composeWarning.style.display = 'flex';
        DOM.composeWarning.textContent = `⚠️ Please keep your letter kind. Restricted word detected ("${profanity.detectedWord}").`;
        DOM.sendLetterBtn.disabled = true;
        return;
    }

    DOM.composeWarning.style.display = 'none';
    DOM.sendLetterBtn.disabled = (words < 10 || words > 400);
}

function triggerWaxSealCeremony() {
    return new Promise((resolve) => {
        if (!DOM.waxSealOverlay) {
            resolve();
            return;
        }

        const env = DOM.waxSealOverlay.querySelector('.vintage-envelope');
        if (env) env.classList.remove('departing');
        if (DOM.sealCaption) DOM.sealCaption.textContent = 'Folding your parchment...';

        DOM.waxSealOverlay.classList.add('active');
        playPaperRustle();

        // 1.25s: Hot wax seal pressed down with thud
        setTimeout(() => {
            if (DOM.sealCaption) DOM.sealCaption.textContent = 'Pressing crimson wax seal...';
            playWaxSealStamp();
        }, 1250);

        // 1.75s: Envelope takes flight into the world
        setTimeout(() => {
            if (DOM.sealCaption) DOM.sealCaption.textContent = 'Taking flight across India 🕊️';
            playEnvelopeFly();
            if (env) env.classList.add('departing');
        }, 1750);

        // 2.5s: Ceremony complete
        setTimeout(() => {
            DOM.waxSealOverlay.classList.remove('active');
            resolve();
        }, 2500);
    });
}

async function handleLetterSubmit(e) {
    e.preventDefault();
    const user = getCurrentUser();
    const profile = getCurrentProfile();

    if (!user || !profile) {
        alert("Please sign in first.");
        return;
    }

    const text = DOM.letterTextarea.value;
    const stateName = DOM.stateSelect.value || profile.state_name;

    if (!stateName) {
        alert("Please select your State or UT postmark.");
        return;
    }

    // Check frontend rate limit estimate (2 letters / 24 hours)
    const recentCount = await getRecentLettersCount(user.id);
    if (recentCount >= 2) {
        DOM.sendAlert.className = 'alert-banner alert-warning';
        DOM.sendAlert.style.display = 'block';
        DOM.sendAlert.textContent = 'Daily limit reached: You can send a maximum of 2 letters every 24 hours. Please wait before writing another.';
        return;
    }

    DOM.sendLetterBtn.disabled = true;
    DOM.sendLetterBtn.textContent = 'Sealing letter with wax...';
    DOM.sendAlert.style.display = 'none';

    try {
        const [result] = await Promise.all([
            sendLetter(text, selectedMood, stateName),
            triggerWaxSealCeremony()
        ]);

        DOM.sendAlert.className = 'alert-banner alert-success';
        DOM.sendAlert.style.display = 'block';
        DOM.sendAlert.innerHTML = `
            📮 <strong>Letter sealed and sent!</strong><br>
            Your letter is now traveling across India and will be delivered to a stranger in 1 to 10 hours.
            ${result.incoming_scheduled ? '<br>✨ <em>A stranger’s letter is also on its way to your inbox!</em>' : ''}
        `;

        DOM.letterTextarea.value = '';
        handleLetterInput();

        // Switch to Sent tab after ceremony
        switchTab('sent');
        setTimeout(() => {
            DOM.sendAlert.style.display = 'none';
        }, 4000);

    } catch (err) {
        if (DOM.waxSealOverlay) DOM.waxSealOverlay.classList.remove('active');
        DOM.sendAlert.className = 'alert-banner alert-danger';
        DOM.sendAlert.style.display = 'block';
        DOM.sendAlert.textContent = err.message || "Failed to deliver letter.";
    } finally {
        DOM.sendLetterBtn.disabled = false;
        DOM.sendLetterBtn.textContent = 'Seal & Send to a Stranger';
    }
}

// ============================================================================
// INBOX MODULE (DELIVERED & IN-TRANSIT COUNTDOWNS)
// ============================================================================
async function loadInboxData() {
    const user = getCurrentUser();
    if (!user) return;

    const { delivered, inTransit } = await fetchInboxDeliveries(user.id);

    // Update unread badge
    const unreadCount = delivered.filter(d => !d.read_at).length;
    if (DOM.inboxBadge) {
        if (unreadCount > 0) {
            DOM.inboxBadge.style.display = 'inline-block';
            DOM.inboxBadge.textContent = unreadCount;
        } else {
            DOM.inboxBadge.style.display = 'none';
        }
    }

    // Render In-Transit Traveling Letters
    if (DOM.inboxTransitContainer) {
        if (inTransit.length === 0) {
            DOM.inboxTransitContainer.innerHTML = '';
        } else {
            DOM.inboxTransitContainer.innerHTML = `
                <div style="font-size:0.8rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--ink-muted); margin-bottom:0.6rem;">
                    Letters Traveling to You (${inTransit.length})
                </div>
            `;
            inTransit.forEach(item => {
                const card = createInTransitCard(item);
                DOM.inboxTransitContainer.appendChild(card);
            });
        }
    }

    // Render Delivered Letters
    if (DOM.inboxDeliveredContainer) {
        DOM.inboxDeliveredContainer.innerHTML = '';
        if (delivered.length === 0 && inTransit.length === 0) {
            if (DOM.inboxEmptyState) {
                DOM.inboxEmptyState.style.display = 'block';
                DOM.inboxEmptyState.innerHTML = `
                    <div class="empty-icon">📭</div>
                    <div class="empty-title">Your Mailbox is Empty</div>
                    <p style="margin-bottom:1.25rem;">Write a short letter to a stranger — each time you send one, a stranger's letter will travel to your inbox!</p>
                    <button class="btn btn-primary btn-sm" onclick="window.appSwitchTab('compose')">Write a Letter</button>
                `;
            }
        } else {
            if (DOM.inboxEmptyState) DOM.inboxEmptyState.style.display = 'none';
            delivered.forEach(item => {
                const card = createDeliveredLetterCard(item);
                DOM.inboxDeliveredContainer.appendChild(card);
            });
        }
    }
}

function createInTransitCard(delivery) {
    const div = document.createElement('div');
    div.className = 'in-transit-card';
    const deliverTime = new Date(delivery.deliver_at).getTime();

    function updateCountdown() {
        const now = Date.now();
        const diff = deliverTime - now;
        if (diff <= 0) {
            div.innerHTML = `
                <div class="transit-icon">📬</div>
                <div><strong>A letter just arrived!</strong></div>
                <button class="btn btn-secondary btn-sm" style="margin-top:0.5rem;" onclick="window.appRefreshInbox()">Refresh Inbox</button>
            `;
            return;
        }
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        div.innerHTML = `
            <div class="transit-icon">🕊️</div>
            <div style="font-weight:600; font-size:0.95rem;">A letter is traveling to you from a stranger</div>
            <div class="transit-timer">${hours}h ${minutes}m ${seconds}s</div>
            <div style="font-size:0.75rem; color:var(--ink-muted); margin-top:0.3rem;">Traveling through the post...</div>
        `;
    }

    updateCountdown();
    // Live update interval
    const interval = setInterval(updateCountdown, 1000);
    div.dataset.intervalId = interval;
    return div;
}

function createDeliveredLetterCard(delivery) {
    const letter = delivery.letter;
    const isUnread = !delivery.read_at;
    const card = document.createElement('div');
    card.className = `letter-card ${isUnread ? 'unread' : ''}`;

    const senderNickname = letter.sender ? letter.sender.nickname : 'A Gentle Stranger';
    const senderState = letter.postmark || (letter.sender ? `From ${letter.sender.state_name}` : 'From India');

    card.innerHTML = `
        <div class="letter-header">
            <div class="sender-info">
                <div style="display:flex; align-items:center; gap:0.5rem;">
                    <span class="sender-nickname">${escapeHtml(senderNickname)}</span>
                    ${isUnread ? '<span style="font-size:0.65rem; background:var(--accent-seal); color:#fff; padding:0.1rem 0.4rem; border-radius:8px;">NEW</span>' : ''}
                </div>
                <div><span class="postmark-stamp">${escapeHtml(senderState)}</span></div>
            </div>
            <span class="mood-pill mood-${letter.mood}">${letter.mood}</span>
        </div>
        <div class="letter-body">${escapeHtml(truncateText(letter.body, 140))}</div>
        <div class="letter-footer">
            <span>Received ${formatTimeAgo(delivery.deliver_at)}</span>
            <div style="display:flex; align-items:center; gap:0.4rem;">
                <button class="btn btn-secondary btn-sm read-btn">Read Letter →</button>
                <button class="btn btn-delete btn-sm delete-btn" title="Delete from mailbox">🗑️</button>
            </div>
        </div>
    `;

    card.querySelector('.read-btn').addEventListener('click', () => {
        openLetterDetail(delivery);
    });

    card.querySelector('.delete-btn').addEventListener('click', async (e) => {
        e.stopPropagation();
        const user = getCurrentUser();
        if (!user) return;
        const confirmDelete = confirm("Are you sure you want to remove this letter from your mailbox?");
        if (!confirmDelete) return;
        try {
            await deleteInboxDelivery(delivery.id, user.id);
            playPaperRustle();
            await loadInboxData();
            const profile = getCurrentProfile();
            updateProfileView(user, profile);
        } catch (err) {
            alert("Could not remove letter: " + err.message);
        }
    });

    return card;
}

// ============================================================================
// LETTER DETAIL MODAL & REPLIES
// ============================================================================
async function openLetterDetail(delivery) {
    activeDetailDelivery = delivery;
    const letter = delivery.letter;
    const user = getCurrentUser();

    // Mark as read
    if (!delivery.read_at) {
        delivery.read_at = new Date().toISOString();
        markAsRead(delivery.id);
        loadInboxData();
    }

    const senderNickname = letter.sender ? letter.sender.nickname : 'A Gentle Stranger';
    const senderState = letter.postmark || (letter.sender ? `From ${letter.sender.state_name}` : 'From India');

    DOM.modalSenderNickname.textContent = senderNickname;
    DOM.modalPostmark.textContent = senderState;
    DOM.modalMood.className = `mood-pill mood-${letter.mood}`;
    DOM.modalMood.textContent = letter.mood;
    DOM.modalBody.textContent = letter.body;

    // Report & Block listeners
    DOM.btnReportLetter.style.display = 'inline-flex';
    DOM.btnReportLetter.onclick = () => handleReportAction(letter.id);
    DOM.btnBlockSender.onclick = () => handleBlockAction(user.id, letter.sender_id);

    // Delete letter from mailbox
    if (DOM.btnDeleteLetter) {
        DOM.btnDeleteLetter.style.display = 'inline-flex';
        DOM.btnDeleteLetter.textContent = '🗑️ Delete from Mailbox';
        DOM.btnDeleteLetter.onclick = async () => {
            const confirmDelete = confirm("Are you sure you want to remove this letter from your mailbox?");
            if (!confirmDelete) return;
            try {
                await deleteInboxDelivery(delivery.id, user.id);
                playPaperRustle();
                DOM.letterModal.classList.remove('active');
                document.body.classList.remove('modal-open');
                await loadInboxData();
                const profile = getCurrentProfile();
                updateProfileView(user, profile);
            } catch (err) {
                alert("Could not remove letter: " + err.message);
            }
        };
    }

    // Disable block button if system letter
    if (!letter.sender_id) {
        DOM.btnBlockSender.style.display = 'none';
        DOM.replyForm.style.display = 'none';
    } else {
        DOM.btnBlockSender.style.display = 'inline-flex';
        DOM.replyForm.style.display = 'block';
    }

    // Fetch Replies
    await loadLetterReplies(letter.id);

    playPaperUnfold();
    DOM.letterModal.classList.add('active');
    document.body.classList.add('modal-open');
}

async function openSentLetterDetail(letter) {
    activeDetailDelivery = null;
    const profile = getCurrentProfile();
    const senderNickname = profile ? profile.nickname : 'You';
    const user = getCurrentUser();

    DOM.modalSenderNickname.textContent = `${senderNickname} (You)`;
    DOM.modalPostmark.textContent = letter.postmark || 'From India';
    DOM.modalMood.className = `mood-pill mood-${letter.mood}`;
    DOM.modalMood.textContent = letter.mood;
    DOM.modalBody.textContent = letter.body;

    // Senders cannot report, block, or reply to their own sent letter
    DOM.btnReportLetter.style.display = 'none';
    DOM.btnBlockSender.style.display = 'none';
    DOM.replyForm.style.display = 'none';

    // Allow sender to delete their sent letter
    if (DOM.btnDeleteLetter) {
        DOM.btnDeleteLetter.style.display = 'inline-flex';
        DOM.btnDeleteLetter.textContent = '🗑️ Delete Sent Letter';
        DOM.btnDeleteLetter.onclick = async () => {
            if (!user) return;
            const confirmDelete = confirm("Are you sure you want to permanently delete this sent letter?");
            if (!confirmDelete) return;
            try {
                await deleteSentLetter(letter.id, user.id);
                playPaperRustle();
                DOM.letterModal.classList.remove('active');
                document.body.classList.remove('modal-open');
                await loadSentData();
                updateProfileView(user, profile);
            } catch (err) {
                alert("Could not delete letter: " + err.message);
            }
        };
    }

    // Fetch Replies strangers sent to this letter
    await loadLetterReplies(letter.id);

    playPaperUnfold();
    DOM.letterModal.classList.add('active');
    document.body.classList.add('modal-open');
}

async function loadLetterReplies(letterId) {
    const replies = await fetchLetterReplies(letterId);
    if (!DOM.modalRepliesList) return;

    if (replies.length === 0) {
        DOM.modalRepliesList.innerHTML = `<div style="font-size:0.8rem; color:var(--ink-muted); font-style:italic;">No replies yet.</div>`;
    } else {
        DOM.modalRepliesList.innerHTML = '';
        replies.forEach(rep => {
            const senderNick = rep.sender ? rep.sender.nickname : 'Stranger';
            const bubble = document.createElement('div');
            bubble.className = 'reply-bubble';
            bubble.innerHTML = `
                <div class="reply-meta">${escapeHtml(senderNick)} • ${formatTimeAgo(rep.created_at)}</div>
                <div>${escapeHtml(rep.body)}</div>
            `;
            DOM.modalRepliesList.appendChild(bubble);
        });
    }
}

async function handleReplySubmit(e) {
    e.preventDefault();
    if (!activeDetailDelivery || !activeDetailDelivery.letter) return;

    const user = getCurrentUser();
    const letter = activeDetailDelivery.letter;
    const replyText = DOM.replyTextarea.value.trim();

    DOM.replyError.style.display = 'none';

    try {
        await sendReply(letter.id, letter.sender_id, user.id, replyText);
        DOM.replyTextarea.value = '';
        if (DOM.replyWordCounter) DOM.replyWordCounter.textContent = '0 / 400 words';
        await loadLetterReplies(letter.id);
        alert("Your reply has been sent back to the original sender!");
    } catch (err) {
        DOM.replyError.style.display = 'block';
        DOM.replyError.textContent = err.message;
    }
}

async function handleReportAction(letterId) {
    const user = getCurrentUser();
    if (!user) return;

    const reason = prompt("Why are you reporting this letter?\n(e.g., Harassment, Personal Info, Explicit, Spam)");
    if (!reason || !reason.trim()) return;

    const res = await reportLetter(letterId, user.id, reason.trim());
    alert(res.message);
    if (res.success) {
        DOM.letterModal.classList.remove('active');
        document.body.classList.remove('modal-open');
        loadInboxData();
    }
}

async function handleBlockAction(currentUserId, senderId) {
    if (!senderId) {
        alert("Cannot block a system traveler letter.");
        return;
    }

    const confirmBlock = confirm("Are you sure you want to block this stranger? Their future letters will never reach your inbox.");
    if (!confirmBlock) return;

    const res = await blockSender(currentUserId, senderId);
    alert(res.message);
    DOM.letterModal.classList.remove('active');
    document.body.classList.remove('modal-open');
    loadInboxData();
}

// ============================================================================
// SENT LETTERS MODULE
// ============================================================================
async function loadSentData() {
    const user = getCurrentUser();
    if (!user) return;

    const sentLetters = await fetchSentLetters(user.id);
    if (!DOM.sentListContainer) return;

    DOM.sentListContainer.innerHTML = '';
    if (sentLetters.length === 0) {
        if (DOM.sentEmptyState) DOM.sentEmptyState.style.display = 'block';
    } else {
        if (DOM.sentEmptyState) DOM.sentEmptyState.style.display = 'none';

        // Ensure strict newest-first sorting
        sentLetters.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        sentLetters.forEach(letter => {
            const card = document.createElement('div');
            card.className = 'letter-card';

            const deliveries = letter.deliveries || [];
            let statusText = 'Waiting for an available stranger...';
            let statusIcon = '⏳';
            if (deliveries.length > 0) {
                const delivery = deliveries[0];
                const isDelivered = new Date(delivery.deliver_at) <= new Date();
                if (isDelivered) {
                    statusText = 'Delivered to a stranger';
                    statusIcon = '✓';
                } else {
                    const transitDiff = Math.max(0, Math.round((new Date(delivery.deliver_at) - new Date()) / (1000 * 60 * 60)));
                    statusText = `Traveling in transit (${transitDiff > 0 ? `~${transitDiff}h left` : 'almost there'})...`;
                    statusIcon = '🕊️';
                }
            } else if (letter.status === 'delivered') {
                statusText = 'Delivered to a stranger';
                statusIcon = '✓';
            }

            card.innerHTML = `
                <div class="letter-header">
                    <div>
                        <span class="postmark-stamp">${escapeHtml(letter.postmark)}</span>
                        <div style="font-size:0.75rem; color:var(--ink-muted); margin-top:0.25rem;">
                            Sent on ${new Date(letter.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                        </div>
                    </div>
                    <span class="mood-pill mood-${letter.mood}">${letter.mood}</span>
                </div>
                <div class="letter-body">${escapeHtml(truncateText(letter.body, 140))}</div>
                <div class="letter-footer">
                    <span style="font-weight:600; color:var(--accent-seal);">${statusIcon} ${statusText}</span>
                    <div style="display:flex; align-items:center; gap:0.4rem;">
                        <button class="btn btn-secondary btn-sm read-btn">View Letter →</button>
                        <button class="btn btn-delete btn-sm delete-btn" title="Delete this sent letter">🗑️ Delete</button>
                    </div>
                </div>
            `;

            card.querySelector('.read-btn').addEventListener('click', () => {
                openSentLetterDetail(letter);
            });

            card.querySelector('.delete-btn').addEventListener('click', async (e) => {
                e.stopPropagation();
                const confirmDelete = confirm("Are you sure you want to permanently delete this sent letter?");
                if (!confirmDelete) return;
                try {
                    await deleteSentLetter(letter.id, user.id);
                    playPaperRustle();
                    await loadSentData();
                    const profile = getCurrentProfile();
                    updateProfileView(user, profile);
                } catch (err) {
                    alert("Could not delete letter: " + err.message);
                }
            });

            DOM.sentListContainer.appendChild(card);
        });
    }
}

// ============================================================================
// PROFILE VIEW
// ============================================================================
async function updateProfileView(user, profile) {
    if (!profile) return;
    if (DOM.profileNickname) DOM.profileNickname.textContent = profile.nickname;
    if (DOM.profileInitial) DOM.profileInitial.textContent = profile.nickname.charAt(0).toUpperCase();
    if (DOM.profilePostmark) DOM.profilePostmark.textContent = `Postmark: From ${profile.state_name}`;

    const sent = await fetchSentLetters(user.id);
    const { delivered } = await fetchInboxDeliveries(user.id);

    if (DOM.statLettersSent) DOM.statLettersSent.textContent = sent.length;
    if (DOM.statLettersReceived) DOM.statLettersReceived.textContent = delivered.length;
}

// ============================================================================
// ONBOARDING SUBMIT (NICKNAME & 18+ CONFIRMATION)
// ============================================================================
async function handleOnboardingSubmit(e) {
    e.preventDefault();
    const nickname = DOM.onboardingNickname.value.trim();
    const stateName = DOM.onboardingState.value;
    const isAdult = DOM.onboardingAdult.checked;

    DOM.onboardingError.style.display = 'none';

    if (!isAdult) {
        DOM.onboardingError.style.display = 'block';
        DOM.onboardingError.textContent = "You must confirm you are 18 or older to use Strange Messenger.";
        return;
    }

    if (nickname.length < 3 || nickname.length > 20) {
        DOM.onboardingError.style.display = 'block';
        DOM.onboardingError.textContent = "Nickname must be between 3 and 20 characters.";
        return;
    }

    if (!stateName) {
        DOM.onboardingError.style.display = 'block';
        DOM.onboardingError.textContent = "Please select your State or Union Territory.";
        return;
    }

    DOM.onboardingSubmitBtn.disabled = true;
    DOM.onboardingSubmitBtn.textContent = "Creating profile...";

    try {
        const profile = await completeOnboarding(nickname, stateName, isAdult);
        handleAuthState(getCurrentUser(), profile);
    } catch (err) {
        DOM.onboardingError.style.display = 'block';
        DOM.onboardingError.textContent = err.message || "Failed to create profile.";
    } finally {
        DOM.onboardingSubmitBtn.disabled = false;
        DOM.onboardingSubmitBtn.textContent = "Enter Strange Messenger";
    }
}

// ============================================================================
// EVENT LISTENERS SETUP
// ============================================================================
function setupEventListeners() {
    // Navigation Tabs
    DOM.tabButtons.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Shuffle Daily Prompt
    DOM.shufflePromptBtn?.addEventListener('click', () => {
        currentDailyPrompt = getRandomPrompt(currentDailyPrompt);
        updateDailyPromptUI();
    });

    // Compose textarea live checks
    DOM.letterTextarea?.addEventListener('input', handleLetterInput);
    DOM.composeForm?.addEventListener('submit', handleLetterSubmit);

    // Reply textarea live counter
    DOM.replyTextarea?.addEventListener('input', () => {
        const words = countWords(DOM.replyTextarea.value);
        if (DOM.replyWordCounter) DOM.replyWordCounter.textContent = `${words} / 400 words`;
    });
    DOM.replyForm?.addEventListener('submit', handleReplySubmit);

    // Modal close buttons
    DOM.letterModalClose?.addEventListener('click', () => {
        playPaperRustle();
        DOM.letterModal.classList.remove('active');
        document.body.classList.remove('modal-open');
    });

    // Close modal when clicking backdrop
    DOM.letterModal?.addEventListener('click', (e) => {
        if (e.target === DOM.letterModal) {
            playPaperRustle();
            DOM.letterModal.classList.remove('active');
            document.body.classList.remove('modal-open');
        }
    });

    // Config modal close on backdrop click
    DOM.configModal?.addEventListener('click', (e) => {
        if (e.target === DOM.configModal) {
            DOM.configModal.classList.remove('active');
        }
    });

    // Sound effects toggle
    DOM.soundToggleBtn?.addEventListener('click', () => {
        const enabled = toggleSound();
        if (DOM.soundToggleBtn) {
            DOM.soundToggleBtn.textContent = enabled ? '🔊' : '🔇';
            DOM.soundToggleBtn.classList.toggle('muted', !enabled);
        }
    });

    // Onboarding Live Nickname validation
    DOM.onboardingNickname?.addEventListener('input', async () => {
        const val = DOM.onboardingNickname.value.trim();
        if (val.length < 3) {
            DOM.onboardingNickStatus.textContent = 'Minimum 3 characters';
            DOM.onboardingNickStatus.style.color = 'var(--ink-muted)';
            return;
        }
        if (val.length > 20) {
            DOM.onboardingNickStatus.textContent = 'Maximum 20 characters';
            DOM.onboardingNickStatus.style.color = 'var(--accent-seal)';
            return;
        }

        const isFree = await isNicknameAvailable(val);
        if (isFree) {
            DOM.onboardingNickStatus.textContent = '✓ Nickname available';
            DOM.onboardingNickStatus.style.color = '#2e5936';
        } else {
            DOM.onboardingNickStatus.textContent = '✗ Nickname already taken';
            DOM.onboardingNickStatus.style.color = 'var(--accent-seal)';
        }
    });

    DOM.onboardingForm?.addEventListener('submit', handleOnboardingSubmit);

    // Sign out button
    DOM.signOutBtn?.addEventListener('click', signOut);

    // Config Modal
    DOM.openConfigBtn?.addEventListener('click', () => {
        DOM.configModal.classList.add('active');
    });
    DOM.configCloseBtn?.addEventListener('click', () => {
        DOM.configModal.classList.remove('active');
    });
    DOM.configForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        saveCredentials(DOM.configUrlInput.value, DOM.configKeyInput.value);
    });

    // Global helpers for inline onclicks
    window.appSwitchTab = switchTab;
    window.appRefreshInbox = loadInboxData;
}

// ============================================================================
// UTILITIES
// ============================================================================
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function truncateText(str, maxLength) {
    if (!str) return '';
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength) + '...';
}

function formatTimeAgo(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);

    if (diffSec < 60) return 'just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    const diffDays = Math.floor(diffHour / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}

// Initialize on DOM Ready (guarantees execution even if DOMContentLoaded already fired)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
