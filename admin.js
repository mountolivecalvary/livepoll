import { RealtimePollEngine, DEFAULT_SESSION_CODE, DEFAULT_QUESTIONS, DEFAULT_HEADER_IMAGE, DEFAULT_TITLE } from "./realtime-engine.js";
import { getSupabaseConfig, updateSupabaseConfig, resetSupabaseConfig, checkSupabaseHealth } from "./supabase.js";

// Active Session Code
const urlParams = new URLSearchParams(window.location.search);
let currentCode = (urlParams.get("code") || localStorage.getItem("ACTIVE_POLL_CODE") || DEFAULT_SESSION_CODE).trim().toUpperCase();

let engine = new RealtimePollEngine(currentCode);
let questions = [];
let sessionData = null;

// DOM Elements
const adminCurrentCode = document.getElementById("admin-current-code");
const adminInputCode = document.getElementById("admin-input-code");
const btnGenCode = document.getElementById("btn-gen-code");
const adminRemoteQr = document.getElementById("admin-remote-qr");
const btnCopyJoinLink = document.getElementById("btn-copy-join-link");

const linkAdminProjector = document.getElementById("link-admin-projector");
const linkAdminRemote = document.getElementById("link-admin-remote");

const adminTopicTitle = document.getElementById("admin-topic-title");
const adminHeaderUrl = document.getElementById("admin-header-url");
const adminBannerPreview = document.getElementById("admin-banner-preview");
const btnSaveBranding = document.getElementById("btn-save-branding");

// Answered Responses Data & Reset Elements
const adminTotalResponsesCount = document.getElementById("admin-total-responses-count");
const btnClearAllResponses = document.getElementById("btn-clear-all-responses");
const adminClearStatus = document.getElementById("admin-clear-status");

const adminQuestionsList = document.getElementById("admin-questions-list");
const adminQuestionCount = document.getElementById("admin-question-count");
const btnAddQuestion = document.getElementById("btn-add-question");
const btnDeleteAllQuestions = document.getElementById("btn-delete-all-questions");
const btnDeleteAllQuestionsSidebar = document.getElementById("btn-delete-all-questions-sidebar");

// Question Modal Elements
const modalQuestion = document.getElementById("modal-question");
const modalTitle = document.getElementById("modal-title");
const btnCloseModal = document.getElementById("btn-close-modal");
const btnCancelModal = document.getElementById("btn-cancel-modal");
const btnSaveQuestion = document.getElementById("btn-save-question");

const editQId = document.getElementById("edit-q-id");
const editQPrompt = document.getElementById("edit-q-prompt");
const editOptA = document.getElementById("edit-opt-a");
const editOptB = document.getElementById("edit-opt-b");
const editOptC = document.getElementById("edit-opt-c");
const editOptD = document.getElementById("edit-opt-d");
const editCorrectOpt = document.getElementById("edit-correct-opt");
const editExplanation = document.getElementById("edit-explanation");

// JSON Import / Export & Presets
const btnLoadDefaults = document.getElementById("btn-load-defaults");
const btnExportJson = document.getElementById("btn-export-json");
const btnImportJson = document.getElementById("btn-import-json");
const fileImportJson = document.getElementById("file-import-json");

// DB Settings Modal Elements
const btnOpenDbSettings = document.getElementById("btn-open-db-settings");
const modalDbSettings = document.getElementById("modal-db-settings");
const btnCloseDbModal = document.getElementById("btn-close-db-modal");
const inputSupabaseUrl = document.getElementById("input-supabase-url");
const inputSupabaseKey = document.getElementById("input-supabase-key");
const btnTestDbConnection = document.getElementById("btn-test-db-connection");
const btnResetDbCreds = document.getElementById("btn-reset-db-creds");
const btnSaveDbCreds = document.getElementById("btn-save-db-creds");
const dbHealthResult = document.getElementById("db-health-result");
const supabaseStatusBadge = document.getElementById("supabase-status-badge");

// Host PIN Configuration
const adminHostPin = document.getElementById("admin-host-pin");
const btnSaveHostPin = document.getElementById("btn-save-host-pin");

if (adminHostPin) {
  adminHostPin.value = localStorage.getItem("POLL_CUSTOM_HOST_PIN") || "212208";
}

btnSaveHostPin?.addEventListener("click", () => {
  const pin = (adminHostPin?.value || "").trim();
  if (pin.length < 4) {
    alert("PIN should be at least 4 digits.");
    return;
  }
  localStorage.setItem("POLL_CUSTOM_HOST_PIN", pin);
  btnSaveHostPin.innerText = "✓ Saved";
  setTimeout(() => { btnSaveHostPin.innerText = "Save PIN"; }, 2000);
});

// Initialize UI
function updateSessionCodeUI(code) {
  currentCode = code.trim().toUpperCase();
  localStorage.setItem("ACTIVE_POLL_CODE", currentCode);

  if (adminCurrentCode) adminCurrentCode.innerText = currentCode;
  if (adminInputCode) adminInputCode.value = currentCode;

  const originPath = window.location.origin + window.location.pathname.replace("admin.html", "");
  const remoteUrl = `${originPath}remote.html?code=${currentCode}`;
  const audienceUrl = `${originPath}audience.html?code=${currentCode}`;
  const projectorUrl = `${originPath}projector.html?code=${currentCode}`;

  if (linkAdminProjector) linkAdminProjector.href = projectorUrl;
  if (linkAdminRemote) linkAdminRemote.href = remoteUrl;

  if (adminRemoteQr) {
    adminRemoteQr.src = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(remoteUrl)}`;
  }
}

// Preset branding helper accessible from HTML onclick
window.setPresetImage = (url, title) => {
  if (adminHeaderUrl) adminHeaderUrl.value = url;
  if (adminTopicTitle && title) adminTopicTitle.value = title;
  if (adminBannerPreview) adminBannerPreview.src = url;
};

// Live Header Image Preview
adminHeaderUrl?.addEventListener("input", (e) => {
  if (adminBannerPreview) adminBannerPreview.src = e.target.value;
});

// Generate Random Session Code
btnGenCode?.addEventListener("click", () => {
  const randomPin = Math.floor(100000 + Math.random() * 900000).toString();
  adminInputCode.value = randomPin;
  switchSession(randomPin);
});

adminInputCode?.addEventListener("change", (e) => {
  if (e.target.value.trim()) {
    switchSession(e.target.value.trim().toUpperCase());
  }
});

function switchSession(newCode) {
  engine.setSessionCode(newCode);
  updateSessionCodeUI(newCode);
  loadAdminData();
}

// Copy Audience Join Link
btnCopyJoinLink?.addEventListener("click", () => {
  const originPath = window.location.origin + window.location.pathname.replace("admin.html", "");
  const audienceUrl = `${originPath}audience.html?code=${currentCode}`;
  navigator.clipboard.writeText(audienceUrl).then(() => {
    btnCopyJoinLink.innerText = "✓ Link Copied to Clipboard!";
    setTimeout(() => {
      btnCopyJoinLink.innerText = "📋 Copy Audience Join Link";
    }, 2500);
  }).catch(() => {
    prompt("Audience Join Link:", audienceUrl);
  });
});

// Save Branding
btnSaveBranding?.addEventListener("click", async () => {
  const newTitle = (adminTopicTitle?.value || DEFAULT_TITLE).trim();
  const newHeaderImg = (adminHeaderUrl?.value || DEFAULT_HEADER_IMAGE).trim();

  sessionData = {
    ...sessionData,
    session_code: currentCode,
    title: newTitle,
    header_image_url: newHeaderImg
  };

  await engine.saveSessionData(sessionData);
  await engine.broadcast("STATE_UPDATE", {
    title: newTitle,
    headerImageUrl: newHeaderImg,
    sessionData: sessionData,
    questions: questions
  });

  btnSaveBranding.innerText = "✓ Saved & Synced Live!";
  setTimeout(() => {
    btnSaveBranding.innerText = "💾 Save Branding & Sync Screens";
  }, 2000);
});

// --- Questions CRUD Operations ---
async function loadAdminData() {
  updateSessionCodeUI(currentCode);
  sessionData = await engine.getSessionData();
  questions = await engine.getQuestions();

  if (sessionData) {
    if (adminTopicTitle) adminTopicTitle.value = sessionData.title || DEFAULT_TITLE;
    if (adminHeaderUrl) adminHeaderUrl.value = sessionData.header_image_url || DEFAULT_HEADER_IMAGE;
    if (adminBannerPreview) adminBannerPreview.src = sessionData.header_image_url || DEFAULT_HEADER_IMAGE;
  }

  renderQuestionsList();
  await updateResponseCountUI();
  checkDatabaseStatus();
}

function renderQuestionsList() {
  if (!adminQuestionsList) return;
  adminQuestionCount.innerText = questions.length;

  if (questions.length === 0) {
    adminQuestionsList.innerHTML = `
      <div style="text-align: center; padding: 40px; background: #f8fafc; border-radius: 16px; border: 2px dashed #cbd5e1;">
        <div style="font-size: 32px; margin-bottom: 8px;">📭</div>
        <p style="font-size: 16px; font-weight: 700; color: #334155; margin: 0 0 8px 0;">No questions in this session.</p>
        <p style="font-size: 13px; color: var(--text-muted); margin: 0 0 16px 0;">All questions have been cleared. Click below to add a new question or reload the Sabbath School questions.</p>
        <div style="display: flex; justify-content: center; gap: 8px; flex-wrap: wrap;">
          <button id="btn-empty-add-q" class="btn-primary" style="padding: 10px 18px;">
            + Add New Question
          </button>
          <button onclick="document.getElementById('btn-load-defaults').click()" class="btn-outline" style="padding: 10px 18px;">
            📚 Reload Sabbath School (10 Qs)
          </button>
        </div>
      </div>
    `;
    document.getElementById("btn-empty-add-q")?.addEventListener("click", () => openEditModal(-1));
    return;
  }

  adminQuestionsList.innerHTML = "";

  questions.forEach((q, idx) => {
    const card = document.createElement("div");
    card.className = "question-item-card";

    const correctLetter = (q.correct_option || "A").toUpperCase();
    const correctText = q[`option_${correctLetter.toLowerCase()}`] || "";

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
        <div style="flex: 1;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
            <span style="font-size: 12px; font-weight: 800; padding: 2px 8px; border-radius: 6px; background: #e0e7ff; color: var(--primary);">
              Q${idx + 1}
            </span>
            <span style="font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; background: #dcfce7; color: #15803d;">
              Correct: Option ${correctLetter}
            </span>
          </div>

          <div style="font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">
            ${escapeHtml(q.question)}
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 12px; color: var(--text-muted); margin-bottom: 8px;">
            <div><strong style="color:var(--color-a);">A:</strong> ${escapeHtml(q.option_a || "")}</div>
            <div><strong style="color:var(--color-b);">B:</strong> ${escapeHtml(q.option_b || "")}</div>
            <div><strong style="color:var(--color-c);">C:</strong> ${escapeHtml(q.option_c || "")}</div>
            <div><strong style="color:var(--color-d);">D:</strong> ${escapeHtml(q.option_d || "")}</div>
          </div>

          ${q.explanation_text ? `
            <div style="font-size: 12px; background: #f0fdf4; padding: 6px 10px; border-radius: 8px; color: #166534;">
              <strong>Explanation:</strong> ${escapeHtml(q.explanation_text)}
            </div>
          ` : ""}
        </div>

        <!-- Action Controls -->
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <div style="display: flex; gap: 4px;">
            <button class="btn-outline btn-move-up" data-index="${idx}" style="padding: 4px 8px; font-size: 11px;" ${idx === 0 ? "disabled" : ""} title="Move Up">▲</button>
            <button class="btn-outline btn-move-down" data-index="${idx}" style="padding: 4px 8px; font-size: 11px;" ${idx === questions.length - 1 ? "disabled" : ""} title="Move Down">▼</button>
          </div>
          <button class="btn-outline btn-edit-q" data-index="${idx}" style="padding: 6px 12px; font-size: 12px;">✏️ Edit</button>
          <button class="btn-outline btn-reset-q-votes" data-index="${idx}" data-id="${q.id}" style="padding: 6px 12px; font-size: 11px; color: #b91c1c;" title="Clear votes for this question alone">🔄 Clear Votes</button>
          <button class="btn-outline btn-del-q" data-index="${idx}" style="padding: 6px 12px; font-size: 12px; color: #dc2626;" title="Delete">🗑️ Delete</button>
        </div>
      </div>
    `;

    adminQuestionsList.appendChild(card);
  });

  // Attach event handlers
  adminQuestionsList.querySelectorAll(".btn-edit-q").forEach((btn) => {
    btn.onclick = () => openEditModal(parseInt(btn.getAttribute("data-index"), 10));
  });
  adminQuestionsList.querySelectorAll(".btn-reset-q-votes").forEach((btn) => {
    btn.onclick = async () => {
      const qId = btn.getAttribute("data-id");
      const idx = parseInt(btn.getAttribute("data-index"), 10);
      if (!qId) return;

      const votes = await engine.getResponses(qId);
      if (!confirm(`Clear all ${votes.length} votes recorded for Question ${idx + 1}?\n\n• The question text and options remain unchanged.\n• Audience members can immediately vote again on Question ${idx + 1}.`)) {
        return;
      }

      btn.disabled = true;
      btn.innerText = "⏳ Clearing...";
      try {
        await engine.resetResponses(qId);
        await updateResponseCountUI();
        btn.innerText = "✓ Cleared";
        setTimeout(() => {
          btn.disabled = false;
          btn.innerText = "🔄 Clear Votes";
        }, 2000);
      } catch (err) {
        alert("Error resetting votes: " + err.message);
        btn.disabled = false;
        btn.innerText = "🔄 Clear Votes";
      }
    };
  });
  adminQuestionsList.querySelectorAll(".btn-del-q").forEach((btn) => {
    btn.onclick = () => deleteQuestion(parseInt(btn.getAttribute("data-index"), 10));
  });
  adminQuestionsList.querySelectorAll(".btn-move-up").forEach((btn) => {
    btn.onclick = () => moveQuestion(parseInt(btn.getAttribute("data-index"), 10), -1);
  });
  adminQuestionsList.querySelectorAll(".btn-move-down").forEach((btn) => {
    btn.onclick = () => moveQuestion(parseInt(btn.getAttribute("data-index"), 10), 1);
  });
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function openEditModal(index = -1) {
  if (index >= 0 && questions[index]) {
    const q = questions[index];
    modalTitle.innerText = `Edit Question ${index + 1}`;
    editQId.value = q.id || `q-${index + 1}`;
    editQPrompt.value = q.question || "";
    editOptA.value = q.option_a || "";
    editOptB.value = q.option_b || "";
    editOptC.value = q.option_c || "";
    editOptD.value = q.option_d || "";
    editCorrectOpt.value = (q.correct_option || "A").toUpperCase();
    editExplanation.value = q.explanation_text || "";
  } else {
    modalTitle.innerText = "Add New Question";
    editQId.value = `q-${Date.now()}`;
    editQPrompt.value = "";
    editOptA.value = "";
    editOptB.value = "";
    editOptC.value = "";
    editOptD.value = "";
    editCorrectOpt.value = "A";
    editExplanation.value = "";
  }
  modalQuestion.style.display = "flex";
}

function closeEditModal() {
  modalQuestion.style.display = "none";
}

btnCloseModal?.addEventListener("click", closeEditModal);
btnCancelModal?.addEventListener("click", closeEditModal);
btnAddQuestion?.addEventListener("click", () => openEditModal(-1));

btnSaveQuestion?.addEventListener("click", async () => {
  const promptText = editQPrompt.value.trim();
  const optA = editOptA.value.trim();
  const optB = editOptB.value.trim();
  const optC = editOptC.value.trim();
  const optD = editOptD.value.trim();

  if (!promptText || !optA || !optB) {
    alert("Please enter the question text and at least Options A and B.");
    return;
  }

  const qId = editQId.value || `q-${Date.now()}`;
  const existingIndex = questions.findIndex((q) => q.id === qId);

  const updatedObj = {
    id: qId,
    session_code: currentCode,
    question_order: existingIndex >= 0 ? questions[existingIndex].question_order : questions.length + 1,
    question: promptText,
    option_a: optA,
    option_b: optB,
    option_c: optC || "N/A",
    option_d: optD || "N/A",
    correct_option: editCorrectOpt.value,
    explanation_text: editExplanation.value.trim()
  };

  if (existingIndex >= 0) {
    questions[existingIndex] = updatedObj;
  } else {
    questions.push(updatedObj);
  }

  // Normalize question orders
  questions.forEach((q, i) => { q.question_order = i + 1; });

  await engine.saveQuestions(questions);
  await engine.broadcast("QUESTIONS_CHANGED", { questions: questions });
  closeEditModal();
  renderQuestionsList();
});

async function deleteQuestion(index) {
  if (confirm(`Are you sure you want to delete Question ${index + 1}?`)) {
    const deletedQ = questions[index];
    questions.splice(index, 1);
    questions.forEach((q, i) => { q.question_order = i + 1; });
    if (deletedQ && deletedQ.id) {
      await engine.resetResponses(deletedQ.id);
    }
    await engine.saveQuestions(questions);
    await engine.broadcast("QUESTIONS_CHANGED", { questions: questions });
    renderQuestionsList();
    await updateResponseCountUI();
  }
}

async function handleDeleteAllQuestions() {
  if (questions.length === 0) {
    alert("There are no questions in this session to delete.");
    return;
  }

  const count = questions.length;
  const confirmed = confirm(
    `⚠️ DELETE ALL QUESTIONS?\n\n` +
    `Are you sure you want to permanently delete ALL ${count} question(s) with all options and explanations?\n\n` +
    `• All question prompts, choices A-D, answers, and explanations will be deleted.\n` +
    `• All recorded audience votes will also be cleared.\n` +
    `• Connected screens (Projector, Remote, Audience) will be reset to standby.\n\n` +
    `Click OK to proceed with deleting all questions.`
  );
  if (!confirmed) return;

  if (btnDeleteAllQuestions) {
    btnDeleteAllQuestions.disabled = true;
    btnDeleteAllQuestions.innerText = "⏳ Deleting...";
  }
  if (btnDeleteAllQuestionsSidebar) {
    btnDeleteAllQuestionsSidebar.disabled = true;
    btnDeleteAllQuestionsSidebar.innerText = "⏳ Deleting...";
  }

  try {
    await engine.deleteAllQuestions();
    questions = [];
    renderQuestionsList();
    await updateResponseCountUI();

    if (adminClearStatus) {
      adminClearStatus.style.display = "block";
      adminClearStatus.style.color = "#15803d";
      adminClearStatus.innerText = "✓ All questions, options, and explanations were successfully deleted!";
      setTimeout(() => {
        adminClearStatus.style.display = "none";
      }, 4000);
    }
  } catch (err) {
    alert("Error deleting questions: " + err.message);
  } finally {
    if (btnDeleteAllQuestions) {
      btnDeleteAllQuestions.disabled = false;
      btnDeleteAllQuestions.innerText = "🗑️ Delete All Questions";
    }
    if (btnDeleteAllQuestionsSidebar) {
      btnDeleteAllQuestionsSidebar.disabled = false;
      btnDeleteAllQuestionsSidebar.innerText = "🗑️ Delete All Questions (Options & Explanations)";
    }
  }
}

btnDeleteAllQuestions?.addEventListener("click", handleDeleteAllQuestions);
btnDeleteAllQuestionsSidebar?.addEventListener("click", handleDeleteAllQuestions);

async function moveQuestion(index, direction) {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= questions.length) return;

  const temp = questions[index];
  questions[index] = questions[targetIndex];
  questions[targetIndex] = temp;

  questions.forEach((q, i) => { q.question_order = i + 1; });
  await engine.saveQuestions(questions);
  await engine.broadcast("QUESTIONS_CHANGED", { questions: questions });
  renderQuestionsList();
}

// Load Sabbath School Preset
btnLoadDefaults?.addEventListener("click", async () => {
  if (questions.length > 0 && !confirm("Replace current questions with the 10 Sabbath School 'Share HIM' questions?")) {
    return;
  }

  const seeded = DEFAULT_QUESTIONS.map((q, idx) => ({
    ...q,
    session_code: currentCode,
    question_order: idx + 1
  }));

  questions = seeded;
  await engine.saveQuestions(questions);
  await engine.broadcast("QUESTIONS_CHANGED", { questions: questions });
  renderQuestionsList();
  alert("10 Sabbath School questions loaded successfully!");
});

// JSON Export
btnExportJson?.addEventListener("click", () => {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(questions, null, 2));
  const downloadAnchor = document.createElement("a");
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `poll_questions_${currentCode}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
});

// JSON Import
btnImportJson?.addEventListener("click", () => {
  fileImportJson?.click();
});

fileImportJson?.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (evt) => {
    try {
      const imported = JSON.parse(evt.target.result);
      if (Array.isArray(imported)) {
        questions = imported.map((q, i) => ({
          ...q,
          session_code: currentCode,
          question_order: i + 1
        }));
        await engine.saveQuestions(questions);
        await engine.broadcast("QUESTIONS_CHANGED", { questions: questions });
        renderQuestionsList();
        alert(`Successfully imported ${questions.length} questions!`);
      } else {
        alert("Invalid format: JSON file must contain an array of question objects.");
      }
    } catch (err) {
      alert("Error parsing JSON file: " + err.message);
    }
  };
  reader.readAsText(file);
});

// --- Supabase Database Settings Modal ---
function openDbModal() {
  const cfg = getSupabaseConfig();
  if (inputSupabaseUrl) inputSupabaseUrl.value = cfg.url;
  if (inputSupabaseKey) inputSupabaseKey.value = cfg.key;
  if (dbHealthResult) dbHealthResult.style.display = "none";
  modalDbSettings.style.display = "flex";
}

function closeDbModal() {
  modalDbSettings.style.display = "none";
}

btnOpenDbSettings?.addEventListener("click", openDbModal);
btnCloseDbModal?.addEventListener("click", closeDbModal);

btnTestDbConnection?.addEventListener("click", async () => {
  if (dbHealthResult) {
    dbHealthResult.style.display = "block";
    dbHealthResult.style.background = "#eff6ff";
    dbHealthResult.style.color = "#1e40af";
    dbHealthResult.innerText = "Testing Supabase REST endpoint...";
  }

  const result = await checkSupabaseHealth();
  if (result.ok) {
    dbHealthResult.style.background = "#dcfce7";
    dbHealthResult.style.color = "#15803d";
    dbHealthResult.innerText = "✓ Supabase connection verified successfully!";
  } else {
    dbHealthResult.style.background = "#fee2e2";
    dbHealthResult.style.color = "#991b1b";
    dbHealthResult.innerText = `⚠️ Connection check failed: ${result.error || "Unreachable"}. Local realtime sync remains active.`;
  }
});

btnResetDbCreds?.addEventListener("click", () => {
  if (confirm("Reset to default project credentials?")) {
    resetSupabaseConfig();
    openDbModal();
  }
});

btnSaveDbCreds?.addEventListener("click", () => {
  const newUrl = inputSupabaseUrl?.value?.trim();
  const newKey = inputSupabaseKey?.value?.trim();

  if (newUrl && newKey) {
    updateSupabaseConfig(newUrl, newKey);
    alert("Supabase credentials updated!");
    closeDbModal();
    checkDatabaseStatus();
  }
});

async function checkDatabaseStatus() {
  if (!supabaseStatusBadge) return;
  const health = await checkSupabaseHealth();
  if (health.ok) {
    supabaseStatusBadge.style.background = "#dcfce7";
    supabaseStatusBadge.style.color = "#15803d";
    supabaseStatusBadge.innerText = "● Supabase Live (Cloud DB)";
  } else {
    supabaseStatusBadge.style.background = "#fef3c7";
    supabaseStatusBadge.style.color = "#92400e";
    supabaseStatusBadge.innerText = "● Cloud Sync Live (Supabase Paused)";
    supabaseStatusBadge.title = "Supabase is offline/paused. Built-in Cloud WebSocket Sync is keeping audience phones, projectors, and remotes in real-time sync.";
  }
}

// --- Answered Responses Data & Re-Voting Management ---
async function updateResponseCountUI() {
  if (!adminTotalResponsesCount) return;
  try {
    const count = await engine.getAllResponsesCount();
    adminTotalResponsesCount.innerText = `${count} Response${count === 1 ? "" : "s"}`;
  } catch (_) {
    adminTotalResponsesCount.innerText = "0 Responses";
  }
}

btnClearAllResponses?.addEventListener("click", async () => {
  const currentCount = await engine.getAllResponsesCount();
  const confirmed = confirm(
    `Are you sure you want to delete all recorded audience answers?\n\n` +
    `• Total answered responses to clear: ${currentCount}\n` +
    `• Your questions, options, and branding will remain 100% intact.\n` +
    `• Audience screens will be instantly unlocked so they can vote again.`
  );
  if (!confirmed) return;

  btnClearAllResponses.disabled = true;
  const originalHtml = btnClearAllResponses.innerHTML;
  btnClearAllResponses.innerText = "⏳ Clearing Answered Data Alone...";

  try {
    await engine.clearAllResponses();
    await updateResponseCountUI();

    if (adminClearStatus) {
      adminClearStatus.style.display = "block";
      adminClearStatus.style.color = "#15803d";
      adminClearStatus.innerText = "✓ All answered data cleared! Audience can now re-vote.";
      setTimeout(() => {
        adminClearStatus.style.display = "none";
      }, 4000);
    }
  } catch (err) {
    alert("Error clearing responses: " + err.message);
  } finally {
    btnClearAllResponses.disabled = false;
    btnClearAllResponses.innerHTML = originalHtml;
  }
});

// Engine event listeners for real-time response count updates
engine.subscribe((msg) => {
  if (!msg) return;
  if (msg.type === "VOTE_CAST" || msg.type === "VOTES_CHANGED" || msg.type === "RESPONSES_RESET") {
    updateResponseCountUI();
  }
});

setInterval(updateResponseCountUI, 4000);

loadAdminData();
