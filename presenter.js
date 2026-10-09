import { RealtimePollEngine, DEFAULT_SESSION_CODE } from "./realtime-engine.js";
import { audioEngine } from "./audio-engine.js";

const urlParams = new URLSearchParams(window.location.search);
const sessionCode = (urlParams.get("code") || localStorage.getItem("ACTIVE_POLL_CODE") || DEFAULT_SESSION_CODE).trim().toUpperCase();

const engine = new RealtimePollEngine(sessionCode);

let currentIndex = 0;
let questions = [];
const MODES = ["VOTING", "EXPLANATION"];
let modeIndex = 0;

// DOM Elements
const pCodeBadge = document.getElementById("p-code-badge");
const pBannerImg = document.getElementById("p-banner-img");
const pTopicTitle = document.getElementById("p-topic-title");
const pOrderBadge = document.getElementById("p-order-badge");
const pModePill = document.getElementById("p-mode-pill");
const qEl = document.getElementById("pquestion");
const pAttendanceEl = document.getElementById("p-attendance-count");
const explanationViewEl = document.getElementById("pextra-explanation-card");
const pTotalVotesEl = document.getElementById("p-total-votes");

const pLinkProjector = document.getElementById("p-link-projector");
const pLinkRemote = document.getElementById("p-link-remote");
const pLinkAdmin = document.getElementById("p-link-admin");

// Timer Elements
const pTimerBox = document.getElementById("p-timer-box");
const pTimerDigits = document.getElementById("p-timer-digits");
const pTimerProgressFill = document.getElementById("p-timer-progress-fill");
const pBtnStartTimer = document.getElementById("p-btn-start-timer");
const pBtnResetTimer = document.getElementById("p-btn-reset-timer");
const pBtnSound = document.getElementById("p-btn-sound");

// Navigation Buttons
const btnPrevQ = document.getElementById("btn-prev-q");
const btnRevealExplanation = document.getElementById("btn-reveal-explanation");
const btnNextQuestion = document.getElementById("btn-next-question");
const btnEndSession = document.getElementById("btn-end-session");

// Setup Top Display
if (pCodeBadge) pCodeBadge.innerText = sessionCode;
if (pLinkProjector) pLinkProjector.href = `projector.html?code=${sessionCode}`;
if (pLinkRemote) pLinkRemote.href = `remote.html?code=${sessionCode}`;
if (pLinkAdmin) pLinkAdmin.href = `admin.html?code=${sessionCode}`;

function updateSoundBtn() {
  if (!pBtnSound) return;
  const muted = audioEngine.isMuted();
  pBtnSound.innerText = muted ? "🔇 Sound: OFF" : "🔊 Sound: ON";
}
updateSoundBtn();

pBtnSound?.addEventListener("click", () => {
  audioEngine.toggleMute();
  updateSoundBtn();
});

// --- 15-Second Timer Controller ---
const DEFAULT_DURATION = 15;
let timerSeconds = DEFAULT_DURATION;
let timerInterval = null;
let isTimerRunning = false;
let lastTickSecond = null;

function startTimer(duration = DEFAULT_DURATION) {
  stopTimer();
  timerSeconds = duration;
  isTimerRunning = true;
  lastTickSecond = null;
  updateTimerUI(timerSeconds, duration);

  if (pBtnStartTimer) {
    pBtnStartTimer.innerText = "⏸ Pause Timer";
    pBtnStartTimer.style.background = "#f59e0b";
  }

  timerInterval = setInterval(() => {
    timerSeconds--;
    if (timerSeconds > 0) {
      updateTimerUI(timerSeconds, duration);

      // Warning ticks for the last 5 seconds (5, 4, 3, 2, 1)
      if (timerSeconds <= 5 && lastTickSecond !== timerSeconds) {
        lastTickSecond = timerSeconds;
        audioEngine.playWarningTick();
      }
    } else {
      timerSeconds = 0;
      updateTimerUI(0, duration);
      stopTimer();
      audioEngine.playBuzzer();
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  isTimerRunning = false;
  if (pBtnStartTimer) {
    pBtnStartTimer.innerText = "▶ Start 15s Timer";
    pBtnStartTimer.style.background = "#10b981";
  }
}

function resetTimer(duration = DEFAULT_DURATION) {
  stopTimer();
  timerSeconds = duration;
  updateTimerUI(duration, duration);
}

function updateTimerUI(sec, total = DEFAULT_DURATION) {
  if (pTimerDigits) pTimerDigits.innerText = sec;
  const pct = Math.max(0, Math.min(100, (sec / total) * 100));
  if (pTimerProgressFill) pTimerProgressFill.style.width = `${pct}%`;

  if (!pTimerBox) return;
  if (sec <= 0) {
    pTimerBox.className = "timer-box timer-expired";
  } else if (sec <= 3) {
    pTimerBox.className = "timer-box timer-warning timer-critical";
  } else if (sec <= 5) {
    pTimerBox.className = "timer-box timer-warning";
  } else {
    pTimerBox.className = "timer-box";
  }
}

pBtnStartTimer?.addEventListener("click", async () => {
  if (!isTimerRunning) {
    startTimer(DEFAULT_DURATION);
    await engine.broadcast("TIMER_START", { duration: DEFAULT_DURATION });
  } else {
    stopTimer();
    await engine.broadcast("TIMER_STOP");
  }
});

pBtnResetTimer?.addEventListener("click", async () => {
  resetTimer(DEFAULT_DURATION);
  await engine.broadcast("TIMER_RESET", { duration: DEFAULT_DURATION });
});

// --- Presentation Management ---
async function loadQuestions() {
  const session = await engine.getSessionData();
  questions = await engine.getQuestions();

  if (session) {
    if (session.title && pTopicTitle) pTopicTitle.innerText = session.title;
    if (session.header_image_url && pBannerImg) pBannerImg.src = session.header_image_url;
    currentIndex = session.current_question_index || 0;
    const modeName = session.slide_mode || "VOTING";
    const foundModeIndex = MODES.indexOf(modeName);
    modeIndex = foundModeIndex >= 0 ? foundModeIndex : 0;
  }

  if (questions.length > 0) {
    if (currentIndex >= questions.length) currentIndex = 0;
    showQuestion();
  } else {
    if (qEl) qEl.innerText = "No questions found in database.";
  }
}

async function showQuestion() {
  const q = questions[currentIndex];
  if (!q) return;

  const currentMode = MODES[modeIndex];

  if (pOrderBadge) {
    pOrderBadge.innerText = `Question ${q.question_order || currentIndex + 1} of ${questions.length}`;
  }

  if (pModePill) {
    pModePill.innerText = currentMode.replace("_", " ");
    pModePill.style.background = currentMode === "EXPLANATION" ? "#dcfce7" : "#ede9fe";
    pModePill.style.color = currentMode === "EXPLANATION" ? "#15803d" : "var(--primary)";
  }

  if (qEl) {
    qEl.innerText = `[${q.question_order || currentIndex + 1}/${questions.length}] ${q.question}`;
  }

  ["a", "b", "c", "d"].forEach((opt) => {
    const lbl = document.getElementById(`plbl-${opt}`);
    if (lbl) lbl.innerText = q[`option_${opt}`] || opt.toUpperCase();
  });

  renderExplanationUI(q, currentMode);
  loadResults(q.id);

  // Sync state across all displays
  await engine.broadcast("STATE_UPDATE", {
    currentIndex,
    slideMode: currentMode,
    title: pTopicTitle?.innerText,
    headerImageUrl: pBannerImg?.src
  });

  const session = await engine.getSessionData();
  if (session) {
    session.current_question_index = currentIndex;
    session.slide_mode = currentMode;
    await engine.saveSessionData(session);
  }
}

function renderExplanationUI(q, currentMode) {
  if (!explanationViewEl) return;

  if (currentMode === "EXPLANATION" && q.explanation_text) {
    const correctLetter = (q.correct_option || "A").toUpperCase();
    const correctText = q[`option_${correctLetter.toLowerCase()}`] || "";
    explanationViewEl.innerHTML = `
      <div style="margin-top:20px; padding:20px; background:#f0fdf4; border-left:4px solid #10b981; border-radius:12px;">
        <h4 style="color:#15803d; margin:0 0 6px 0; font-size:12px; text-transform:uppercase;">🌟 Best Biblical Answer</h4>
        <p style="font-weight:700; margin:0 0 12px 0; font-size:16px;">${correctLetter}. ${correctText}</p>
        <h4 style="color:#64748b; margin:0 0 4px 0; font-size:11px; text-transform:uppercase;">Why?</h4>
        <p style="margin:0; color:#334155; line-height:1.5; font-size:15px;">${q.explanation_text}</p>
      </div>
    `;
    explanationViewEl.style.display = "block";
  } else {
    explanationViewEl.style.display = "none";
  }
}

async function loadResults(qid) {
  const currentQ = questions[currentIndex];
  if (!currentQ) return;
  const data = await engine.getResponses(qid);
  const counts = { a: 0, b: 0, c: 0, d: 0, custom: 0 };
  let total = 0;

  const textA = (currentQ.option_a || "").toString().toLowerCase().trim();
  const textB = (currentQ.option_b || "").toString().toLowerCase().trim();
  const textC = (currentQ.option_c || "").toString().toLowerCase().trim();
  const textD = (currentQ.option_d || "").toString().toLowerCase().trim();

  data.forEach((r) => {
    if (r.selected_option) {
      const val = r.selected_option.toString().toLowerCase().trim();
      if (val === "a" || val === textA) { counts.a++; total++; }
      else if (val === "b" || val === textB) { counts.b++; total++; }
      else if (val === "c" || val === textC) { counts.c++; total++; }
      else if (val === "d" || val === textD) { counts.d++; total++; }
      else { counts.custom++; total++; }
    }
  });

  if (pTotalVotesEl) pTotalVotesEl.innerText = `${total} votes`;
  if (pAttendanceEl) pAttendanceEl.innerText = Math.max(1, total, data.length);

  ["a", "b", "c", "d", "custom"].forEach((opt) => {
    const count = counts[opt];
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
    const countEl = document.getElementById(`pcnt-${opt}`);
    const barEl = document.getElementById(`pbar-${opt}`);
    if (countEl) countEl.innerText = `${count} votes (${percentage}%)`;
    if (barEl) barEl.style.width = `${percentage}%`;
  });
}

// Step 1: Reveal Explanation (Step-by-Step)
btnRevealExplanation?.addEventListener("click", async () => {
  modeIndex = 1; // EXPLANATION
  showQuestion();
});

// Step 2: Next Question (Direct Jump from one question to another)
btnNextQuestion?.addEventListener("click", async () => {
  if (currentIndex < questions.length - 1) {
    currentIndex++;
    modeIndex = 0; // VOTING
    resetTimer(DEFAULT_DURATION);
    await engine.broadcast("TIMER_RESET", { duration: DEFAULT_DURATION });
    showQuestion();
  } else {
    alert("This is the last question in the session.");
  }
});

// Previous Question (Direct Jump Back)
btnPrevQ?.addEventListener("click", async () => {
  if (modeIndex > 0) {
    modeIndex = 0; // Return to voting on current question
    showQuestion();
  } else if (currentIndex > 0) {
    currentIndex--;
    modeIndex = 0;
    resetTimer(DEFAULT_DURATION);
    await engine.broadcast("TIMER_RESET", { duration: DEFAULT_DURATION });
    showQuestion();
  }
});

btnEndSession?.addEventListener("click", async () => {
  await engine.broadcast("STATE_UPDATE", { slideMode: "LOCKED" });
  if (qEl) qEl.innerText = "Session ended by presenter.";
});

engine.subscribe((msg) => {
  if (!msg) return;
  if (msg.type === "STATE_UPDATE" || msg.type === "SYNC_RESPONSE") {
    if (typeof msg.currentIndex === "number") currentIndex = msg.currentIndex;
    if (msg.title && pTopicTitle) pTopicTitle.innerText = msg.title;
    if (msg.headerImageUrl && pBannerImg) pBannerImg.src = msg.headerImageUrl;
    if (Array.isArray(msg.questions)) {
      questions = msg.questions;
    }
    showQuestion();
  } else if (msg.type === "VOTE_CAST" || msg.type === "VOTES_CHANGED") {
    const q = questions[currentIndex];
    if (q) loadResults(q.id);
  } else if (msg.type === "TIMER_START") {
    if (!isTimerRunning) startTimer(msg.duration || DEFAULT_DURATION);
  } else if (msg.type === "TIMER_RESET") {
    resetTimer(msg.duration || DEFAULT_DURATION);
  } else if (msg.type === "QUESTIONS_CHANGED" || msg.type === "SESSION_UPDATE") {
    if (Array.isArray(msg.questions)) {
      questions = msg.questions;
      showQuestion();
    } else {
      loadQuestions();
    }
  }
});

loadQuestions();
setTimeout(() => engine.requestSync(), 500);
setInterval(() => {
  const q = questions[currentIndex];
  if (q) loadResults(q.id);
}, 2500);