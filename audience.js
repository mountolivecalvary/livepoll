import { RealtimePollEngine, DEFAULT_SESSION_CODE } from "./realtime-engine.js";

const userId = localStorage.getItem("user_id") || crypto.randomUUID();
localStorage.setItem("user_id", userId);

// Read session code from URL query param
const urlParams = new URLSearchParams(window.location.search);
let sessionCode = (urlParams.get("code") || localStorage.getItem("ACTIVE_POLL_CODE") || "").trim().toUpperCase();

const modalJoinCode = document.getElementById("modal-join-code");
const inputModalCode = document.getElementById("input-modal-code");
const btnSubmitModalCode = document.getElementById("btn-submit-modal-code");

if (!sessionCode) {
  if (modalJoinCode) modalJoinCode.style.display = "flex";
  if (btnSubmitModalCode) {
    btnSubmitModalCode.onclick = () => {
      const codeVal = (inputModalCode?.value || DEFAULT_SESSION_CODE).trim().toUpperCase();
      window.location.href = `audience.html?code=${codeVal}`;
    };
  }
} else {
  localStorage.setItem("ACTIVE_POLL_CODE", sessionCode);
}

document.getElementById("btn-change-code")?.addEventListener("click", () => {
  if (modalJoinCode) {
    if (inputModalCode) inputModalCode.value = sessionCode;
    modalJoinCode.style.display = "flex";
    if (btnSubmitModalCode) {
      btnSubmitModalCode.onclick = () => {
        const codeVal = (inputModalCode?.value || DEFAULT_SESSION_CODE).trim().toUpperCase();
        window.location.href = `audience.html?code=${codeVal}`;
      };
    }
  }
});

// Fallback session code if still blank
if (!sessionCode) sessionCode = DEFAULT_SESSION_CODE;

const engine = new RealtimePollEngine(sessionCode);

// DOM Elements
const codeBadge = document.getElementById("aud-code-badge");
const bannerImg = document.getElementById("aud-banner-img");
const topicTitle = document.getElementById("aud-topic-title");
const attendanceEl = document.getElementById("attendance-count");

const qOrderEl = document.getElementById("aud-q-order");
const modePillEl = document.getElementById("aud-mode-pill");
const questionEl = document.getElementById("question");
const statusEl = document.getElementById("status");
const explanationWrapper = document.getElementById("audience-biblical-explanation-box");

const timerWrap = document.getElementById("aud-timer-wrap");
const timerText = document.getElementById("aud-timer-text");
const timerProgressFill = document.getElementById("aud-timer-progress-fill");

const customInputEl = document.getElementById("custom-text-input");
const customSubmitBtn = document.getElementById("custom-text-submit");
const customContainerEl = document.getElementById("custom-write-in-container");
const cardVotingControls = document.getElementById("card-voting-controls");

const buttons = {
  a: document.getElementById("a"),
  b: document.getElementById("b"),
  c: document.getElementById("c"),
  d: document.getElementById("d")
};

const buttonTexts = {
  a: document.getElementById("btn-text-a"),
  b: document.getElementById("btn-text-b"),
  c: document.getElementById("btn-text-c"),
  d: document.getElementById("btn-text-d")
};

if (codeBadge) codeBadge.innerText = sessionCode;

// State
let questions = [];
let currentIndex = 0;
let currentSlideMode = "VOTING";
let currentQuestion = null;
let hasVotedOnCurrentQuestion = false;
let userVotedOption = null;

// Timer State
let timerSeconds = 15;
let timerInterval = null;

// --- Load Session & Question ---
async function loadAudienceView() {
  const session = await engine.getSessionData();
  questions = await engine.getQuestions();

  if (session) {
    if (session.title && topicTitle) topicTitle.innerText = session.title;
    if (session.header_image_url && bannerImg) bannerImg.src = session.header_image_url;
    currentIndex = session.current_question_index || 0;
    currentSlideMode = session.slide_mode || "VOTING";
  }

  if (questions.length === 0) {
    currentQuestion = null;
    hasVotedOnCurrentQuestion = false;
    userVotedOption = null;
    if (questionEl) questionEl.innerText = "No questions loaded in this session yet. Waiting for presenter...";
    if (qOrderEl) qOrderEl.innerText = "0 Questions";
    if (modePillEl) modePillEl.innerText = "STANDBY";
    if (cardVotingControls) cardVotingControls.style.display = "none";
    if (customContainerEl) customContainerEl.style.display = "none";
    if (explanationWrapper) explanationWrapper.style.display = "none";
    if (statusEl) statusEl.innerText = "";
    return;
  }

  if (currentIndex >= questions.length) currentIndex = 0;
  applyQuestionState();
}

function applyQuestionState() {
  const q = questions[currentIndex];
  if (!q) return;

  const isNewQuestion = !currentQuestion || currentQuestion.id !== q.id;
  currentQuestion = q;

  if (isNewQuestion) {
    hasVotedOnCurrentQuestion = false;
    userVotedOption = null;
    if (statusEl) statusEl.innerText = "";
    if (customInputEl) {
      customInputEl.value = "";
      customInputEl.disabled = false;
    }
    if (customSubmitBtn) customSubmitBtn.disabled = false;
  }

  if (qOrderEl) {
    qOrderEl.innerText = `Question ${q.question_order || currentIndex + 1} of ${questions.length}`;
  }

  if (modePillEl) {
    modePillEl.innerText = currentSlideMode.replace("_", " ");
    modePillEl.style.background = currentSlideMode === "EXPLANATION" ? "#dcfce7" : "#ede9fe";
    modePillEl.style.color = currentSlideMode === "EXPLANATION" ? "#15803d" : "var(--primary)";
  }

  // Question Prompt
  if (questionEl) {
    questionEl.innerText = q.question;
  }

  // Options Text
  ["a", "b", "c", "d"].forEach((opt) => {
    const optText = q[`option_${opt}`] || `Option ${opt.toUpperCase()}`;
    if (buttonTexts[opt]) buttonTexts[opt].innerText = optText;

    const chartLbl = document.getElementById(`lbl-${opt}`);
    if (chartLbl) chartLbl.innerText = optText;

    if (buttons[opt]) {
      buttons[opt].className = "option-btn";
      buttons[opt].disabled = false;
    }
  });

  evaluateSlidePhaseDisplay();
  loadResults();
}

function evaluateSlidePhaseDisplay() {
  if (!currentQuestion) return;

  if (currentSlideMode === "VOTING") {
    if (cardVotingControls) cardVotingControls.style.display = "block";
    if (customContainerEl) customContainerEl.style.display = "flex";
    if (explanationWrapper) explanationWrapper.style.display = "none";

    if (hasVotedOnCurrentQuestion) {
      disableAllInputs();
      if (userVotedOption && buttons[userVotedOption]) {
        buttons[userVotedOption].classList.add("selected");
      }
      if (statusEl) statusEl.innerText = "Response recorded successfully ✓";
    }
    return;
  }

  disableAllInputs();

  if (currentSlideMode === "LOCKED") {
    if (cardVotingControls) cardVotingControls.style.display = "block";
    if (customContainerEl) customContainerEl.style.display = "none";
    if (statusEl) statusEl.innerText = "Voting is locked by presenter 🔒";
    return;
  }

  if (currentSlideMode === "EXPLANATION") {
    if (cardVotingControls) cardVotingControls.style.display = "block";
    if (customContainerEl) customContainerEl.style.display = "none";

    const correctKey = (currentQuestion.correct_option || "A").toLowerCase().trim();
    ["a", "b", "c", "d"].forEach((opt) => {
      if (buttons[opt]) {
        buttons[opt].className = opt === correctKey ? "option-btn quiz-correct-state" : "option-btn";
      }
    });

    if (currentQuestion.explanation_text && explanationWrapper) {
      const correctLetter = correctKey.toUpperCase();
      const correctText = currentQuestion[`option_${correctKey}`] || "";
      explanationWrapper.innerHTML = `
        <div class="card" style="margin-top: 0; padding: 20px; background: #f0fdf4; border-left: 5px solid #10b981;">
          <h4 style="color: #15803d; margin: 0 0 6px 0; font-size: 13px; text-transform: uppercase;">🌟 Best Biblical Answer:</h4>
          <p style="font-weight: 800; margin: 0 0 10px 0; font-size: 16px; color: #064e3b;">${correctLetter}. ${correctText}</p>
          <h4 style="color: #64748b; margin: 0 0 4px 0; font-size: 11px; text-transform: uppercase;">Why?</h4>
          <p style="margin: 0; color: #334155; line-height: 1.5; font-size: 14px;">${currentQuestion.explanation_text}</p>
        </div>
      `;
      explanationWrapper.style.display = "block";
    }
  }
}

// --- Voting Operations ---
async function vote(letterKey, buttonEl) {
  if (!currentQuestion || hasVotedOnCurrentQuestion || currentSlideMode !== "VOTING") return;
  hasVotedOnCurrentQuestion = true;
  userVotedOption = letterKey;

  disableAllInputs();
  buttonEl.classList.add("selected");
  if (statusEl) statusEl.innerText = "Recording response...";

  try {
    await engine.recordVote(currentQuestion.id, letterKey, userId);
    if (statusEl) statusEl.innerText = "Response recorded successfully ✓";
    loadResults();
  } catch (err) {
    if (statusEl) statusEl.innerText = "Error recording response. Please retry.";
    hasVotedOnCurrentQuestion = false;
  }
}

async function submitCustomVote() {
  if (!currentQuestion || hasVotedOnCurrentQuestion || currentSlideMode !== "VOTING") return;
  const customVal = customInputEl?.value?.trim();
  if (!customVal) return;

  hasVotedOnCurrentQuestion = true;
  userVotedOption = "custom";
  disableAllInputs();

  if (statusEl) statusEl.innerText = "Recording response...";

  try {
    await engine.recordVote(currentQuestion.id, customVal, userId);
    if (statusEl) statusEl.innerText = "Custom response recorded successfully ✓";
    loadResults();
  } catch (err) {
    if (statusEl) statusEl.innerText = "Error recording response.";
    hasVotedOnCurrentQuestion = false;
  }
}

function disableAllInputs() {
  Object.values(buttons).forEach((b) => { if (b) b.disabled = true; });
  if (customInputEl) customInputEl.disabled = true;
  if (customSubmitBtn) customSubmitBtn.disabled = true;
}

// --- Live Vote Results ---
async function loadResults() {
  if (!currentQuestion) return;
  const votes = await engine.getResponses(currentQuestion.id);
  const counts = { a: 0, b: 0, c: 0, d: 0, custom: 0 };
  let total = 0;

  const textA = (currentQuestion.option_a || "").toLowerCase().trim();
  const textB = (currentQuestion.option_b || "").toLowerCase().trim();
  const textC = (currentQuestion.option_c || "").toLowerCase().trim();
  const textD = (currentQuestion.option_d || "").toLowerCase().trim();

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

  if (attendanceEl) attendanceEl.innerText = Math.max(1, total, votes.length);

  ["a", "b", "c", "d", "custom"].forEach((opt) => {
    const count = counts[opt];
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
    const countEl = document.getElementById(`cnt-${opt}`);
    const barEl = document.getElementById(`bar-${opt}`);
    if (countEl) countEl.innerText = `${count} votes (${percentage}%)`;
    if (barEl) barEl.style.width = `${percentage}%`;
  });
}

// --- 15-Second Timer Sync Controller ---
function startTimerSync(duration = 15) {
  stopTimerSync();
  timerSeconds = duration;
  if (timerWrap) timerWrap.style.display = "block";
  updateTimerUI(timerSeconds, duration);

  timerInterval = setInterval(() => {
    timerSeconds--;
    if (timerSeconds > 0) {
      updateTimerUI(timerSeconds, duration);
    } else {
      timerSeconds = 0;
      updateTimerUI(0, duration);
      stopTimerSync();

      // Lock voting when timer expires
      if (!hasVotedOnCurrentQuestion) {
        disableAllInputs();
        if (statusEl) statusEl.innerText = "Time's up! Voting closed ⏱️";
      }
    }
  }, 1000);
}

function stopTimerSync() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function resetTimerSync(duration = 15) {
  stopTimerSync();
  timerSeconds = duration;
  updateTimerUI(duration, duration);
}

function updateTimerUI(sec, total = 15) {
  if (timerText) timerText.innerText = `${sec}s`;
  const pct = Math.max(0, Math.min(100, (sec / total) * 100));
  if (timerProgressFill) {
    timerProgressFill.style.width = `${pct}%`;
    timerProgressFill.style.background = sec <= 3 ? "#ef4444" : sec <= 5 ? "#f59e0b" : "#10b981";
  }
}

// Attach Button Click Handlers
if (buttons.a) buttons.a.onclick = () => vote("a", buttons.a);
if (buttons.b) buttons.b.onclick = () => vote("b", buttons.b);
if (buttons.c) buttons.c.onclick = () => vote("c", buttons.c);
if (buttons.d) buttons.d.onclick = () => vote("d", buttons.d);
if (customSubmitBtn) customSubmitBtn.onclick = () => submitCustomVote();

// Subscribe to Realtime Engine
engine.subscribe((msg) => {
  if (!msg) return;

  if (msg.type === "STATE_UPDATE" || msg.type === "SYNC_RESPONSE") {
    if (typeof msg.currentIndex === "number") currentIndex = msg.currentIndex;
    if (msg.slideMode) currentSlideMode = msg.slideMode;
    if (msg.title && topicTitle) topicTitle.innerText = msg.title;
    if (msg.headerImageUrl && bannerImg) bannerImg.src = msg.headerImageUrl;
    if (Array.isArray(msg.questions)) {
      questions = msg.questions;
    }
    applyQuestionState();
  } else if (msg.type === "TIMER_START") {
    startTimerSync(msg.duration || 15);
  } else if (msg.type === "TIMER_RESET") {
    resetTimerSync(msg.duration || 15);
  } else if (msg.type === "TIMER_STOP") {
    stopTimerSync();
  } else if (msg.type === "VOTE_CAST" || msg.type === "VOTES_CHANGED") {
    loadResults();
  } else if (msg.type === "RESPONSES_RESET") {
    hasVotedOnCurrentQuestion = false;
    userVotedOption = null;
    if (statusEl) statusEl.innerText = "";
    if (customInputEl) {
      customInputEl.value = "";
      customInputEl.disabled = false;
    }
    if (customSubmitBtn) customSubmitBtn.disabled = false;
    applyQuestionState();
  } else if (msg.type === "QUESTIONS_CHANGED" || msg.type === "SESSION_UPDATE") {
    if (Array.isArray(msg.questions)) {
      questions = msg.questions;
      applyQuestionState();
    } else {
      loadAudienceView();
    }
  }
});

setInterval(loadResults, 2500);

loadAudienceView();
setTimeout(() => engine.requestSync(), 500);