import { RealtimePollEngine, DEFAULT_SESSION_CODE } from "./realtime-engine.js";
import { audioEngine } from "./audio-engine.js";

// Parse session code from URL query params
const urlParams = new URLSearchParams(window.location.search);
const sessionCode = (urlParams.get("code") || localStorage.getItem("ACTIVE_POLL_CODE") || DEFAULT_SESSION_CODE).trim().toUpperCase();

// Initialize Realtime Engine
const engine = new RealtimePollEngine(sessionCode);

// DOM Elements
const codeBadge = document.getElementById("proj-code-badge");
const qrCodeText = document.getElementById("proj-qr-code");
const qrImg = document.getElementById("proj-qr-img");
const joinUrlText = document.getElementById("proj-join-url");
const phoneRemoteLink = document.getElementById("link-phone-remote");
const bannerImg = document.getElementById("proj-banner-img");
const topicTitle = document.getElementById("proj-topic-title");
const attendanceCount = document.getElementById("proj-attendance-count");

const qOrderBadge = document.getElementById("proj-q-order-badge");
const slideModePill = document.getElementById("proj-slide-mode-pill");
const questionText = document.getElementById("proj-question-text");
const optionsContainer = document.getElementById("proj-options-container");
const explanationContainer = document.getElementById("proj-explanation-container");

const timerBox = document.getElementById("proj-timer-box");
const timerDigits = document.getElementById("proj-timer-digits");
const timerStatus = document.getElementById("proj-timer-status");
const timerProgressFill = document.getElementById("proj-timer-progress-fill");

const totalVotesText = document.getElementById("proj-total-votes");
const btnSound = document.getElementById("btn-toggle-sound");
const btnFullscreen = document.getElementById("btn-fullscreen");

// State
let questions = [];
let currentIndex = 0;
let currentSlideMode = "VOTING";
let sessionData = null;

// Timer State
const DEFAULT_DURATION = 15;
let timerSecondsRemaining = DEFAULT_DURATION;
let timerInterval = null;
let timerIsRunning = false;
let lastTickSecond = null;

// Setup Top Bar & QR Code
function setupSessionDisplay() {
  if (codeBadge) codeBadge.innerText = sessionCode;
  if (qrCodeText) qrCodeText.innerText = sessionCode;
  if (phoneRemoteLink) phoneRemoteLink.href = `remote.html?code=${sessionCode}`;

  const hostOrigin = window.location.origin + window.location.pathname.replace("projector.html", "");
  const audienceUrl = `${hostOrigin}audience.html?code=${sessionCode}`;
  
  if (joinUrlText) {
    joinUrlText.innerText = `Join: ${window.location.host || "web"} (Code: ${sessionCode})`;
  }
  if (qrImg) {
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(audienceUrl)}`;
  }
}

// Sound Button Controller
function updateSoundButton() {
  if (!btnSound) return;
  const muted = audioEngine.isMuted();
  btnSound.innerText = muted ? "🔇 Sound: OFF" : "🔊 Sound: ON";
  btnSound.style.color = muted ? "var(--text-muted)" : "var(--primary)";
}
updateSoundButton();

btnSound?.addEventListener("click", () => {
  audioEngine.toggleMute();
  updateSoundButton();
});

// Fullscreen Button
btnFullscreen?.addEventListener("click", () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
});

// --- Timer Controller (15 Seconds Default) ---
function startTimer(duration = DEFAULT_DURATION) {
  stopTimer();
  timerSecondsRemaining = duration;
  timerIsRunning = true;
  lastTickSecond = null;

  updateTimerUI(timerSecondsRemaining, duration);
  if (timerStatus) timerStatus.innerText = "COUNTING DOWN...";

  timerInterval = setInterval(() => {
    timerSecondsRemaining--;

    if (timerSecondsRemaining > 0) {
      updateTimerUI(timerSecondsRemaining, duration);

      // Requirement: "After 10 seconds, there should be like a tick-tick sound for the last 5 seconds."
      // When 10 seconds elapse in a 15-second timer, remaining time is 5, 4, 3, 2, 1
      if (timerSecondsRemaining <= 5 && lastTickSecond !== timerSecondsRemaining) {
        lastTickSecond = timerSecondsRemaining;
        audioEngine.playWarningTick();
      }
    } else {
      // Timer hits 0: "And when the last 5 seconds get over, I should hear a buzzer sound."
      timerSecondsRemaining = 0;
      updateTimerUI(0, duration);
      stopTimer();

      audioEngine.playBuzzer();
      if (timerStatus) timerStatus.innerText = "TIME'S UP! 🛑";

      // Apply shake and flash
      if (timerBox) {
        timerBox.className = "timer-box timer-expired";
      }
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  timerIsRunning = false;
}

function resetTimer(duration = DEFAULT_DURATION) {
  stopTimer();
  timerSecondsRemaining = duration;
  updateTimerUI(duration, duration);
  if (timerStatus) timerStatus.innerText = "READY (15s)";
  if (timerBox) timerBox.className = "timer-box";
}

function updateTimerUI(seconds, total = DEFAULT_DURATION) {
  if (timerDigits) timerDigits.innerText = seconds;

  const pct = Math.max(0, Math.min(100, (seconds / total) * 100));
  if (timerProgressFill) {
    timerProgressFill.style.width = `${pct}%`;
  }

  if (!timerBox) return;

  if (seconds <= 0) {
    timerBox.className = "timer-box timer-expired";
  } else if (seconds <= 3) {
    timerBox.className = "timer-box timer-warning timer-critical";
  } else if (seconds <= 5) {
    timerBox.className = "timer-box timer-warning";
  } else {
    timerBox.className = "timer-box";
  }
}

// --- Question & Presentation Rendering ---
async function loadPresentation() {
  sessionData = await engine.getSessionData();
  questions = await engine.getQuestions();

  if (sessionData) {
    if (sessionData.title && topicTitle) topicTitle.innerText = sessionData.title;
    if (sessionData.header_image_url && bannerImg) bannerImg.src = sessionData.header_image_url;
    currentIndex = sessionData.current_question_index || 0;
    currentSlideMode = sessionData.slide_mode || "VOTING";
  }

  if (questions.length === 0) {
    if (questionText) questionText.innerText = "No questions in this session yet. Presenter is setting up...";
    if (qOrderBadge) qOrderBadge.innerText = "0 Questions";
    if (slideModePill) slideModePill.innerText = "STANDBY";
    if (explanationContainer) explanationContainer.innerHTML = "";
    if (totalVotesText) totalVotesText.innerText = "0 votes";
    ["a", "b", "c", "d"].forEach((opt) => {
      const textEl = document.getElementById(`proj-text-${opt}`);
      if (textEl) textEl.innerText = "-";
      const cardEl = document.getElementById(`proj-card-${opt}`);
      if (cardEl) {
        cardEl.style.borderColor = "#e2e8f0";
        cardEl.style.background = "#ffffff";
        cardEl.style.boxShadow = "none";
        cardEl.style.transform = "none";
      }
      const cntEl = document.getElementById(`proj-cnt-${opt}`);
      if (cntEl) cntEl.innerText = "0 votes (0%)";
      const barEl = document.getElementById(`proj-pbar-${opt}`);
      if (barEl) barEl.style.width = "0%";
    });
    return;
  }

  if (currentIndex >= questions.length) currentIndex = 0;
  renderCurrentQuestion();
}

function renderCurrentQuestion() {
  const q = questions[currentIndex];
  if (!q) return;

  if (qOrderBadge) {
    qOrderBadge.innerText = `Question ${q.question_order || currentIndex + 1} of ${questions.length}`;
  }

  if (slideModePill) {
    slideModePill.innerText = currentSlideMode.replace("_", " ");
    slideModePill.style.background = currentSlideMode === "EXPLANATION" ? "#dcfce7" : "#ede9fe";
    slideModePill.style.color = currentSlideMode === "EXPLANATION" ? "#15803d" : "var(--primary)";
  }

  if (questionText) questionText.innerText = q.question;

  // Option text rendering
  const isExplanation = currentSlideMode === "EXPLANATION";
  const correctLetter = (q.correct_option || "A").toUpperCase().trim();

  ["a", "b", "c", "d"].forEach((opt) => {
    const textEl = document.getElementById(`proj-text-${opt}`);
    const cardEl = document.getElementById(`proj-card-${opt}`);
    const optText = q[`option_${opt}`] || `Option ${opt.toUpperCase()}`;

    if (textEl) textEl.innerText = optText;
    const isThisCorrect = opt.toUpperCase() === correctLetter;

    if (cardEl) {
      if (isExplanation && isThisCorrect) {
        cardEl.style.borderColor = "var(--quiz-correct)";
        cardEl.style.background = "#f0fdf4";
        cardEl.style.boxShadow = "0 8px 24px rgba(16, 185, 129, 0.25)";
        cardEl.style.transform = "scale(1.02)";
      } else {
        cardEl.style.borderColor = "#e2e8f0";
        cardEl.style.background = "#ffffff";
        cardEl.style.boxShadow = "none";
        cardEl.style.transform = "none";
      }
    }

    const chartLbl = document.getElementById(`proj-lbl-${opt}`);
    if (chartLbl) chartLbl.innerText = optText;
  });

  renderExplanationCard(q, currentSlideMode);
  refreshVoteResults(q.id);
}

function renderExplanationCard(q, mode) {
  if (!explanationContainer) return;

  if (mode === "EXPLANATION" && q.explanation_text) {
    const correctLetter = (q.correct_option || "A").toUpperCase();
    const correctOptionText = q[`option_${correctLetter.toLowerCase()}`] || "";

    explanationContainer.innerHTML = `
      <div style="padding: 22px; background: #f0fdf4; border-left: 5px solid #10b981; border-radius: 18px; box-shadow: 0 4px 16px rgba(16, 185, 129, 0.1);">
        <div style="color: #15803d; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">
          🌟 Best Biblical Answer
        </div>
        <div style="font-size: 18px; font-weight: 800; color: #064e3b; margin-bottom: 12px;">
          ${correctLetter}. ${correctOptionText}
        </div>
        <div style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">
          Why?
        </div>
        <div style="font-size: 16px; color: #1e293b; line-height: 1.6; font-weight: 500;">
          ${q.explanation_text}
        </div>
      </div>
    `;
    explanationContainer.style.display = "block";
  } else {
    explanationContainer.style.display = "none";
  }
}

// --- Live Polling Vote Chart Calculations ---
async function refreshVoteResults(questionId) {
  if (!questionId) return;
  const currentQ = questions[currentIndex];
  if (!currentQ) return;

  const votes = await engine.getResponses(questionId);
  const counts = { a: 0, b: 0, c: 0, d: 0, custom: 0 };
  let total = 0;

  const textA = (currentQ.option_a || "").toLowerCase().trim();
  const textB = (currentQ.option_b || "").toLowerCase().trim();
  const textC = (currentQ.option_c || "").toLowerCase().trim();
  const textD = (currentQ.option_d || "").toLowerCase().trim();

  votes.forEach((v) => {
    if (v.selected_option) {
      const val = v.selected_option.toString().toLowerCase().trim();
      if (val === "a" || val === textA) { counts.a++; total++; }
      else if (val === "b" || val === textB) { counts.b++; total++; }
      else if (val === "c" || val === textC) { counts.c++; total++; }
      else if (val === "d" || val === textD) { counts.d++; total++; }
      else { counts.custom++; total++; }
    }
  });

  if (totalVotesText) totalVotesText.innerText = `${total} vote${total === 1 ? "" : "s"}`;
  if (attendanceCount) attendanceCount.innerText = Math.max(1, total, votes.length);

  ["a", "b", "c", "d", "custom"].forEach((opt) => {
    const count = counts[opt];
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    const cntEl = document.getElementById(`proj-cnt-${opt}`);
    const barEl = document.getElementById(`proj-pbar-${opt}`);

    if (cntEl) cntEl.innerText = `${count} votes (${pct}%)`;
    if (barEl) barEl.style.width = `${pct}%`;
  });
}

// --- Listen to Realtime Engine Events ---
engine.subscribe((msg) => {
  if (!msg) return;

  if (msg.type === "STATE_UPDATE" || msg.type === "SYNC_RESPONSE") {
    if (typeof msg.currentIndex === "number") currentIndex = msg.currentIndex;
    if (msg.slideMode) {
      if (currentSlideMode !== "EXPLANATION" && msg.slideMode === "EXPLANATION") {
        audioEngine.playChime();
      }
      currentSlideMode = msg.slideMode;
    }
    if (msg.title && topicTitle) topicTitle.innerText = msg.title;
    if (msg.headerImageUrl && bannerImg) bannerImg.src = msg.headerImageUrl;
    if (Array.isArray(msg.questions)) {
      questions = msg.questions;
    }
    renderCurrentQuestion();
  } else if (msg.type === "TIMER_START") {
    startTimer(msg.duration || DEFAULT_DURATION);
  } else if (msg.type === "TIMER_RESET") {
    resetTimer(msg.duration || DEFAULT_DURATION);
  } else if (msg.type === "TIMER_STOP") {
    stopTimer();
  } else if (msg.type === "VOTE_CAST" || msg.type === "VOTES_CHANGED") {
    const q = questions[currentIndex];
    if (q) refreshVoteResults(q.id);
  } else if (msg.type === "RESPONSES_RESET") {
    const q = questions[currentIndex];
    if (q) refreshVoteResults(q.id);
  } else if (msg.type === "QUESTIONS_CHANGED" || msg.type === "SESSION_UPDATE") {
    if (Array.isArray(msg.questions)) {
      questions = msg.questions;
      renderCurrentQuestion();
    } else {
      loadPresentation();
    }
  }
});

// Periodic fallback polling to maintain real-time sync
setInterval(() => {
  const q = questions[currentIndex];
  if (q) refreshVoteResults(q.id);
}, 2000);

setupSessionDisplay();
loadPresentation();
setTimeout(() => engine.requestSync(), 500);
