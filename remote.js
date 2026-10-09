import { RealtimePollEngine, DEFAULT_SESSION_CODE } from "./realtime-engine.js";
import { audioEngine } from "./audio-engine.js";

// Session code from URL params
const urlParams = new URLSearchParams(window.location.search);
const sessionCode = (urlParams.get("code") || localStorage.getItem("ACTIVE_POLL_CODE") || DEFAULT_SESSION_CODE).trim().toUpperCase();

const engine = new RealtimePollEngine(sessionCode);

// DOM Elements
const codeValEl = document.getElementById("remote-code-val");
const linkAdminStudio = document.getElementById("link-admin-studio");
const linkOpenProjWindow = document.getElementById("link-open-proj-window");

const qBadge = document.getElementById("remote-q-badge");
const modePill = document.getElementById("remote-mode-pill");
const qText = document.getElementById("remote-q-text");
const qSelect = document.getElementById("remote-q-select");

const timerDigits = document.getElementById("remote-timer-digits");
const timerStatusHint = document.getElementById("remote-timer-status-hint");
const btnStartTimer = document.getElementById("btn-remote-start-timer");
const btnResetTimer = document.getElementById("btn-remote-reset-timer");

const btnNext = document.getElementById("btn-remote-next");
const btnNextSub = document.getElementById("btn-remote-next-sub");
const btnPrev = document.getElementById("btn-remote-prev");
const btnReveal = document.getElementById("btn-remote-reveal");
const btnLock = document.getElementById("btn-remote-lock");
const lockLabel = document.getElementById("remote-lock-label");
const btnResetVotes = document.getElementById("btn-remote-reset-votes");

const totalVotesEl = document.getElementById("remote-total-votes");
const voteAEl = document.getElementById("remote-vote-a");
const voteBEl = document.getElementById("remote-vote-b");
const voteCEl = document.getElementById("remote-vote-c");
const voteDEl = document.getElementById("remote-vote-d");

// State
let questions = [];
let currentIndex = 0;
let currentSlideMode = "VOTING";
let sessionData = null;

// Timer State
const DEFAULT_DURATION = 15;
let timerSeconds = DEFAULT_DURATION;
let timerInterval = null;
let isTimerRunning = false;

// Setup Top Display
if (codeValEl) codeValEl.innerText = sessionCode;
if (linkAdminStudio) linkAdminStudio.href = `admin.html?code=${sessionCode}`;
if (linkOpenProjWindow) linkOpenProjWindow.href = `projector.html?code=${sessionCode}`;

// --- Timer Controller ---
function startLocalTimer(duration = DEFAULT_DURATION) {
  stopLocalTimer();
  timerSeconds = duration;
  isTimerRunning = true;
  updateTimerUI(timerSeconds);

  if (btnStartTimer) {
    btnStartTimer.innerText = "⏸ Pause Timer";
    btnStartTimer.style.background = "#f59e0b";
  }
  if (timerStatusHint) timerStatusHint.innerText = "Counting down on projector & phones...";

  timerInterval = setInterval(() => {
    timerSeconds--;
    if (timerSeconds > 0) {
      updateTimerUI(timerSeconds);
    } else {
      timerSeconds = 0;
      updateTimerUI(0);
      stopLocalTimer();
      if (timerStatusHint) timerStatusHint.innerText = "Time's up! Buzzer sounded.";
    }
  }, 1000);
}

function stopLocalTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  isTimerRunning = false;
  if (btnStartTimer) {
    btnStartTimer.innerText = "▶ Start 15s Timer";
    btnStartTimer.style.background = "#10b981";
  }
}

function resetLocalTimer(duration = DEFAULT_DURATION) {
  stopLocalTimer();
  timerSeconds = duration;
  updateTimerUI(duration);
  if (timerStatusHint) timerStatusHint.innerText = "Tick-tick sounds in last 5s • Buzzer sounds at 0s";
}

function updateTimerUI(sec) {
  if (timerDigits) timerDigits.innerText = sec;
}

btnStartTimer?.addEventListener("click", async () => {
  if (!isTimerRunning) {
    startLocalTimer(DEFAULT_DURATION);
    await engine.broadcast("TIMER_START", { duration: DEFAULT_DURATION });
  } else {
    stopLocalTimer();
    await engine.broadcast("TIMER_STOP");
  }
});

btnResetTimer?.addEventListener("click", async () => {
  resetLocalTimer(DEFAULT_DURATION);
  await engine.broadcast("TIMER_RESET", { duration: DEFAULT_DURATION });
});

// --- Question Navigation & Slide Modes ---
const SLIDE_STEPS = ["VOTING", "EXPLANATION"];

async function loadSession() {
  sessionData = await engine.getSessionData();
  questions = await engine.getQuestions();

  if (sessionData) {
    currentIndex = sessionData.current_question_index || 0;
    currentSlideMode = sessionData.slide_mode || "VOTING";
  }

  populateQuestionSelector();
  renderCurrentQuestion();
}

function populateQuestionSelector() {
  if (!qSelect) return;
  qSelect.innerHTML = "";
  if (questions.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.innerText = "No questions loaded";
    qSelect.appendChild(opt);
    return;
  }
  questions.forEach((q, idx) => {
    const opt = document.createElement("option");
    opt.value = idx;
    opt.innerText = `Q${idx + 1}: ${q.question.substring(0, 42)}...`;
    if (idx === currentIndex) opt.selected = true;
    qSelect.appendChild(opt);
  });
}

qSelect?.addEventListener("change", async (e) => {
  if (!e.target.value) return;
  currentIndex = parseInt(e.target.value, 10);
  currentSlideMode = "VOTING";
  resetLocalTimer(DEFAULT_DURATION);
  await saveAndBroadcastState();
});

function renderCurrentQuestion() {
  const q = questions[currentIndex];
  if (!q) {
    if (qBadge) qBadge.innerText = "0 QUESTIONS";
    if (qText) qText.innerText = "No questions in session. Use Admin Dashboard to add questions.";
    if (totalVotesEl) totalVotesEl.innerText = "0 Votes";
    if (modePill) {
      modePill.innerText = "STANDBY";
      modePill.style.background = "#ede9fe";
      modePill.style.color = "var(--primary)";
    }
    ["a", "b", "c", "d"].forEach((opt) => {
      const el = document.getElementById(`vote-${opt}`);
      if (el) el.innerText = "0 (0%)";
    });
    return;
  }

  if (qBadge) qBadge.innerText = `QUESTION ${currentIndex + 1} OF ${questions.length}`;
  if (qText) qText.innerText = q.question;
  if (modePill) {
    modePill.innerText = currentSlideMode.replace("_", " ");
    modePill.style.background = currentSlideMode === "EXPLANATION" ? "#dcfce7" : "#ede9fe";
    modePill.style.color = currentSlideMode === "EXPLANATION" ? "#15803d" : "var(--primary)";
  }

  if (lockLabel) {
    lockLabel.innerText = currentSlideMode === "LOCKED" ? "🔓 UNLOCK" : "🔒 LOCK";
  }

  if (qSelect) qSelect.value = currentIndex;

  if (btnNextSub) {
    if (currentSlideMode === "VOTING") btnNextSub.innerText = "Next: Reveal Answer";
    else btnNextSub.innerText = "Next: Question " + (currentIndex + 2);
  }

  refreshVoteCounts(q.id);
}

async function saveAndBroadcastState() {
  renderCurrentQuestion();

  const statePayload = {
    currentIndex,
    slideMode: currentSlideMode,
    title: sessionData?.title,
    headerImageUrl: sessionData?.header_image_url
  };

  // Update session record
  if (sessionData) {
    sessionData.current_question_index = currentIndex;
    sessionData.slide_mode = currentSlideMode;
    await engine.saveSessionData(sessionData);
  }

  await engine.broadcast("STATE_UPDATE", statePayload);
}

// Next Step: Reveal Explanation (Step-by-Step)
btnReveal?.addEventListener("click", async () => {
  currentSlideMode = "EXPLANATION";
  await saveAndBroadcastState();
});

// Next Question: Direct Question Jump (Jumps from one question to the next)
const btnNextQ = document.getElementById("btn-remote-next-q");
btnNextQ?.addEventListener("click", async () => {
  if (currentIndex < questions.length - 1) {
    currentIndex++;
    currentSlideMode = "VOTING";
    resetLocalTimer(DEFAULT_DURATION);
    await engine.broadcast("TIMER_RESET", { duration: DEFAULT_DURATION });
    await saveAndBroadcastState();
  } else {
    alert("This is the last question in the session.");
  }
});

// Previous Question logic (Direct jump to previous question)
btnPrev?.addEventListener("click", async () => {
  if (currentSlideMode === "EXPLANATION") {
    currentSlideMode = "VOTING";
  } else if (currentIndex > 0) {
    currentIndex--;
    currentSlideMode = "VOTING";
    resetLocalTimer(DEFAULT_DURATION);
    await engine.broadcast("TIMER_RESET", { duration: DEFAULT_DURATION });
  }

  await saveAndBroadcastState();
});

// Lock / Unlock Voting
btnLock?.addEventListener("click", async () => {
  currentSlideMode = currentSlideMode === "LOCKED" ? "VOTING" : "LOCKED";
  await saveAndBroadcastState();
});

// Re-poll current question
btnResetVotes?.addEventListener("click", async () => {
  const q = questions[currentIndex];
  if (!q) return;
  if (confirm("Reset and clear all audience votes for this question?")) {
    await engine.resetResponses(q.id);
    refreshVoteCounts(q.id);
  }
});

// --- Live Vote Count Monitor ---
async function refreshVoteCounts(questionId) {
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

  if (totalVotesEl) totalVotesEl.innerText = `${total} Votes`;

  const getPct = (cnt) => (total > 0 ? `${cnt} (${Math.round((cnt / total) * 100)}%)` : `${cnt} (0%)`);
  if (voteAEl) voteAEl.innerText = getPct(counts.a);
  if (voteBEl) voteBEl.innerText = getPct(counts.b);
  if (voteCEl) voteCEl.innerText = getPct(counts.c);
  if (voteDEl) voteDEl.innerText = getPct(counts.d);
}

// Engine subscriptions
engine.subscribe((msg) => {
  if (!msg) return;

  if (msg.type === "STATE_UPDATE" || msg.type === "SYNC_RESPONSE") {
    if (typeof msg.currentIndex === "number") currentIndex = msg.currentIndex;
    if (msg.slideMode) currentSlideMode = msg.slideMode;
    if (Array.isArray(msg.questions)) {
      questions = msg.questions;
      populateQuestionSelector();
    }
    renderCurrentQuestion();
  } else if (msg.type === "VOTE_CAST" || msg.type === "VOTES_CHANGED" || msg.type === "RESPONSES_RESET") {
    const q = questions[currentIndex];
    if (q) refreshVoteCounts(q.id);
  } else if (msg.type === "TIMER_START") {
    if (!isTimerRunning) startLocalTimer(msg.duration || DEFAULT_DURATION);
  } else if (msg.type === "TIMER_RESET") {
    resetLocalTimer(msg.duration || DEFAULT_DURATION);
  } else if (msg.type === "QUESTIONS_CHANGED") {
    if (Array.isArray(msg.questions)) {
      questions = msg.questions;
      populateQuestionSelector();
      renderCurrentQuestion();
    } else {
      loadSession();
    }
  }
});

setInterval(() => {
  const q = questions[currentIndex];
  if (q) refreshVoteCounts(q.id);
}, 2000);

loadSession();
setTimeout(() => engine.requestSync(), 500);
