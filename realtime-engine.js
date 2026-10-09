import { supabase, checkSupabaseHealth } from "./supabase.js";

// Starter / Default Questions if no database records exist
export const DEFAULT_QUESTIONS = [
  {
    id: "q-1",
    question_order: 1,
    question: "What was Jesus' primary motivation and mission throughout His earthly ministry?",
    option_a: "To achieve political leadership in Judea",
    option_b: "To reveal the Father's love and seek and save the lost",
    option_c: "To enforce strict traditional rituals",
    option_d: "To isolate believers from the surrounding world",
    correct_option: "B",
    explanation_text: "Luke 19:10 affirms: 'For the Son of Man came to seek and to save the lost.' Jesus lived to display God's unselfish grace and redeem humanity."
  },
  {
    id: "q-2",
    question_order: 2,
    question: "According to Matthew 28:19-20, what is the core mandate of the Great Commission?",
    option_a: "Build impressive buildings and monuments",
    option_b: "Make disciples of all nations, baptizing and teaching them",
    option_c: "Debate non-believers until they agree with us",
    option_d: "Keep our faith hidden to avoid controversy",
    correct_option: "B",
    explanation_text: "Jesus commanded His followers: 'Go therefore and make disciples of all nations, baptizing them... teaching them to observe all that I have commanded you.'"
  },
  {
    id: "q-3",
    question_order: 3,
    question: "In Acts 1:8, where does the power for effective Christian witness come from?",
    option_a: "Eloquent speech and persuasive arguments",
    option_b: "Personal willpower and strict discipline",
    option_c: "The baptism and presence of the Holy Spirit",
    option_d: "Wealth and social influence",
    correct_option: "C",
    explanation_text: "'You will receive power when the Holy Spirit comes on you; and you will be my witnesses...' (Acts 1:8). Human talent is powerless without the Spirit."
  },
  {
    id: "q-4",
    question_order: 4,
    question: "How did Jesus typically connect with people before inviting them to follow Him?",
    option_a: "By mingling with them, meeting their needs, and winning their confidence",
    option_b: "By publicly condemning their flaws and sins",
    option_c: "By requiring proof of righteousness before speaking to them",
    option_d: "By avoiding all contact with outcasts and sinners",
    correct_option: "A",
    explanation_text: "Christ's method alone will give true success: Savior mingled with people as one who desired their good, showed sympathy, ministered to needs, and won confidence."
  },
  {
    id: "q-5",
    question_order: 5,
    question: "What does Romans 12:2 instruct believers regarding the mindset of the world?",
    option_a: "Conform completely to societal trends",
    option_b: "Be transformed by the renewing of your mind",
    option_c: "Withdraw from all human interaction",
    option_d: "Trust exclusively in human philosophy",
    correct_option: "B",
    explanation_text: "'Do not conform to the pattern of this world, but be transformed by the renewing of your mind, that you may test and approve what God’s will is.'"
  },
  {
    id: "q-6",
    question_order: 6,
    question: "Why did Jesus emphasize the parable of the lost sheep in Luke 15?",
    option_a: "To illustrate that sheep are stubborn animals",
    option_b: "To demonstrate God's relentless pursuit of even a single lost person",
    option_c: "To scold the ninety-nine for staying behind",
    option_d: "To teach business management for shepherds",
    correct_option: "B",
    explanation_text: "God leaves the ninety-nine in the fold to search until He finds the one that wandered, celebrating with all of heaven upon its return."
  },
  {
    id: "q-7",
    question_order: 7,
    question: "What is the biblical promise for those who faithfully share the good news (Daniel 12:3)?",
    option_a: "They will acquire earthly kingdoms",
    option_b: "They will never experience trials or sadness",
    option_c: "Those who lead many to righteousness will shine like stars forever",
    option_d: "They will immediately be exempt from manual labor",
    correct_option: "C",
    explanation_text: "'Those who are wise will shine like the brightness of the heavens, and those who lead many to righteousness, like the stars for ever and ever.'"
  },
  {
    id: "q-8",
    question_order: 8,
    question: "How should believers respond when facing opposition while sharing truth (1 Peter 3:15)?",
    option_a: "With anger and retaliation",
    option_b: "With gentleness and respect, giving a reason for the hope within",
    option_c: "By running away and staying silent",
    option_d: "By arguing loudly until the opposition is silenced",
    correct_option: "B",
    explanation_text: "'Always be prepared to give an answer to everyone who asks you to give the reason for the hope that you have. But do this with gentleness and respect.'"
  },
  {
    id: "q-9",
    question_order: 9,
    question: "What is the significance of the Sabbath in the context of Christian witness and worship?",
    option_a: "A day of arbitrary legalistic burden",
    option_b: "A memorial of Creation, Redemption, and holy communion with God",
    option_c: "Only a cultural Jewish tradition that ceased at the Cross",
    option_d: "An excuse for laziness and idleness",
    correct_option: "B",
    explanation_text: "The Sabbath is a sign between God and His people (Ezekiel 20:20), celebrating Christ as both Creator and Redeemer of mankind."
  },
  {
    id: "q-10",
    question_order: 10,
    question: "What is our ultimate hope and promise as proclaimed in Revelation 21:3-4?",
    option_a: "That earth will indefinitely remain plagued with sickness",
    option_b: "God Himself will be with them; He will wipe every tear, and death will be no more",
    option_c: "Humans will evolve into deities without God",
    option_d: "All memories of life will be completely erased",
    correct_option: "B",
    explanation_text: "'He will wipe every tear from their eyes. There will be no more death or mourning or crying or pain, for the old order of things has passed away.'"
  }
];

export const DEFAULT_HEADER_IMAGE = "https://www.sabbath.school/assets/img/lessons/2026/3/_13fb.png";
export const DEFAULT_TITLE = "Share HIM";
export const DEFAULT_SESSION_CODE = "482915";

export class RealtimePollEngine {
  constructor(sessionCode = DEFAULT_SESSION_CODE) {
    this.sessionCode = (sessionCode || DEFAULT_SESSION_CODE).trim().toUpperCase();
    this.clientId = "client_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    this.broadcastChannel = null;
    this.supabaseChannel = null;
    this.relayWs = null;
    this.isRelayConnected = false;
    this.listeners = new Set();
    this.isSupabaseConnected = false;

    this.initLocalChannel();
    this.initSupabaseChannel();
    this.initCloudRelayChannel();
  }

  setSessionCode(newCode) {
    if (!newCode || newCode === this.sessionCode) return;
    this.sessionCode = newCode.trim().toUpperCase();
    if (this.broadcastChannel) {
      try { this.broadcastChannel.close(); } catch (_) {}
    }
    if (this.supabaseChannel) {
      try { supabase.removeChannel(this.supabaseChannel); } catch (_) {}
    }
    if (this.relayWs) {
      try { this.relayWs.close(); } catch (_) {}
    }
    this.initLocalChannel();
    this.initSupabaseChannel();
    this.initCloudRelayChannel();
    this.notify({ type: "SESSION_SWITCHED", sessionCode: this.sessionCode });
  }

  initLocalChannel() {
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        this.broadcastChannel = new BroadcastChannel(`poll-room-${this.sessionCode}`);
        this.broadcastChannel.onmessage = (event) => {
          this.handleIncomingMessage(event.data);
        };
      }
    } catch (err) {
      console.warn("BroadcastChannel unsupported, falling back to storage events:", err);
    }

    if (typeof window !== "undefined") {
      window.addEventListener("storage", (e) => {
        if (e.key === `poll_sync_${this.sessionCode}` && e.newValue) {
          try {
            const data = JSON.parse(e.newValue);
            this.handleIncomingMessage(data);
          } catch (_) {}
        }
      });
    }
  }

  initCloudRelayChannel() {
    try {
      if (typeof window === "undefined" || !("WebSocket" in window)) return;
      const topic = `mtolive_poll_${this.sessionCode.toLowerCase()}`;

      if (this.relayWs) {
        try { this.relayWs.close(); } catch (_) {}
      }

      this.relayWs = new WebSocket(`wss://ntfy.sh/${topic}/ws`);

      this.relayWs.onopen = () => {
        this.isRelayConnected = true;
        this.notify({ type: "RELAY_STATUS", connected: true });
        // Ask any active presenter/peer for the latest session data & questions
        setTimeout(() => this.requestSync(), 300);
      };

      this.relayWs.onmessage = (event) => {
        try {
          const envelope = JSON.parse(event.data);
          if (envelope.event === "message" && envelope.message) {
            const parsed = JSON.parse(envelope.message);
            this.handleIncomingMessage(parsed);
          }
        } catch (_) {}
      };

      this.relayWs.onclose = () => {
        this.isRelayConnected = false;
        this.notify({ type: "RELAY_STATUS", connected: false });
        setTimeout(() => {
          if (!this.relayWs || this.relayWs.readyState === WebSocket.CLOSED) {
            this.initCloudRelayChannel();
          }
        }, 3000);
      };

      this.relayWs.onerror = () => {
        this.isRelayConnected = false;
      };
    } catch (err) {
      console.warn("Cloud relay initialization:", err);
    }
  }

  requestSync() {
    this.broadcast("REQUEST_SYNC", { requesterId: this.clientId });
  }

  async initSupabaseChannel() {
    try {
      const health = await checkSupabaseHealth();
      this.isSupabaseConnected = health.ok;

      this.supabaseChannel = supabase.channel(`poll_room_${this.sessionCode}`, {
        config: { broadcast: { self: false } }
      });

      this.supabaseChannel
        .on("broadcast", { event: "POLL_EVENT" }, ({ payload }) => {
          this.handleIncomingMessage(payload);
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "responses" }, () => {
          this.notify({ type: "VOTES_CHANGED" });
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "questions" }, () => {
          this.notify({ type: "QUESTIONS_CHANGED" });
        })
        .subscribe((status) => {
          this.isSupabaseConnected = status === "SUBSCRIBED";
          this.notify({ type: "CONNECTION_STATUS", connected: this.isSupabaseConnected });
        });
    } catch (err) {
      this.isSupabaseConnected = false;
      this.notify({ type: "CONNECTION_STATUS", connected: false });
    }
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify(data) {
    this.listeners.forEach((fn) => {
      try { fn(data); } catch (e) { console.error("Listener error:", e); }
    });
  }

  async handleIncomingMessage(msg) {
    if (!msg || msg.sessionCode !== this.sessionCode) return;
    if (msg.senderId && msg.senderId === this.clientId) return; // Prevent echoing self

    // 1. Device join request sync: if this device has questions, respond with latest session & questions
    if (msg.type === "REQUEST_SYNC") {
      const currentQuestions = await this.getQuestions();
      const currentSession = await this.getSessionData();
      if (currentQuestions && currentQuestions.length > 0) {
        this.broadcast("SYNC_RESPONSE", {
          sessionData: currentSession,
          questions: currentQuestions
        });
      }
      return;
    }

    // 2. Sync response received: update local cache
    if (msg.type === "SYNC_RESPONSE") {
      if (msg.sessionData) {
        localStorage.setItem(this.getSessionStorageKey(), JSON.stringify(msg.sessionData));
      }
      if (Array.isArray(msg.questions)) {
        localStorage.setItem(this.getQuestionsStorageKey(), JSON.stringify(msg.questions));
      }
    }

    // 3. State update received: cache session parameters
    if (msg.type === "STATE_UPDATE") {
      try {
        const existing = JSON.parse(localStorage.getItem(this.getSessionStorageKey()) || "{}");
        const updated = {
          ...existing,
          ...(msg.sessionData || {}),
          title: msg.title || msg.sessionData?.title || existing.title,
          header_image_url: msg.headerImageUrl || msg.sessionData?.header_image_url || existing.header_image_url,
          current_question_index: typeof msg.currentIndex === "number" ? msg.currentIndex : existing.current_question_index,
          slide_mode: msg.slideMode || existing.slide_mode
        };
        localStorage.setItem(this.getSessionStorageKey(), JSON.stringify(updated));
      } catch (_) {}
      if (Array.isArray(msg.questions)) {
        localStorage.setItem(this.getQuestionsStorageKey(), JSON.stringify(msg.questions));
      }
    }

    // 4. Questions changed: cache questions
    if (msg.type === "QUESTIONS_CHANGED" && Array.isArray(msg.questions)) {
      localStorage.setItem(this.getQuestionsStorageKey(), JSON.stringify(msg.questions));
    }

    // 5. Vote cast: cache vote record
    if (msg.type === "VOTE_CAST" && msg.voteRecord) {
      try {
        const saved = localStorage.getItem(this.getResponsesStorageKey());
        let votes = saved ? JSON.parse(saved) : [];
        votes = votes.filter(
          (v) => !(v.question_id === msg.questionId && v.user_id === msg.userId)
        );
        votes.push(msg.voteRecord);
        localStorage.setItem(this.getResponsesStorageKey(), JSON.stringify(votes));
      } catch (_) {}
    }

    // 6. Responses reset
    if (msg.type === "RESPONSES_RESET") {
      try {
        if (msg.questionId) {
          const saved = localStorage.getItem(this.getResponsesStorageKey());
          if (saved) {
            let votes = JSON.parse(saved);
            votes = votes.filter((v) => v.question_id !== msg.questionId);
            localStorage.setItem(this.getResponsesStorageKey(), JSON.stringify(votes));
          }
        } else {
          localStorage.removeItem(this.getResponsesStorageKey());
        }
      } catch (_) {}
    }

    this.notify(msg);
  }

  async broadcast(actionType, payload = {}) {
    const message = {
      type: actionType,
      sessionCode: this.sessionCode,
      senderId: this.clientId,
      timestamp: Date.now(),
      ...payload
    };

    // 1. Notify local subscribers in current tab
    this.notify(message);

    // 2. Broadcast to other tabs/windows on same browser
    if (this.broadcastChannel) {
      try { this.broadcastChannel.postMessage(message); } catch (_) {}
    }

    if (typeof localStorage !== "undefined") {
      try {
        localStorage.setItem(`poll_sync_${this.sessionCode}`, JSON.stringify(message));
      } catch (_) {}
    }

    // 3. Broadcast to remote devices via Supabase Realtime channel (if connected)
    if (this.supabaseChannel && this.isSupabaseConnected) {
      try {
        await this.supabaseChannel.send({
          type: "broadcast",
          event: "POLL_EVENT",
          payload: message
        });
      } catch (err) {
        // Fallback gracefully
      }
    }

    // 4. Broadcast to remote devices via Cloud WebSocket Relay (works everywhere on GitHub Pages)
    try {
      const topic = `mtolive_poll_${this.sessionCode.toLowerCase()}`;
      fetch(`https://ntfy.sh/${topic}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message)
      }).catch(() => {});
    } catch (_) {}
  }

  // --- Session & State Storage Helpers ---
  getSessionStorageKey() {
    return `poll_session_${this.sessionCode}`;
  }

  getQuestionsStorageKey() {
    return `poll_questions_${this.sessionCode}`;
  }

  getResponsesStorageKey() {
    return `poll_responses_${this.sessionCode}`;
  }

  // Load Session details
  async getSessionData() {
    // Try Supabase first if online
    if (this.isSupabaseConnected) {
      try {
        const { data, error } = await supabase
          .from("sessions")
          .select("*")
          .eq("session_code", this.sessionCode)
          .maybeSingle();

        if (!error && data) {
          return data;
        }
      } catch (_) {}
    }

    // Fallback to localStorage
    const saved = localStorage.getItem(this.getSessionStorageKey());
    if (saved) {
      try { return JSON.parse(saved); } catch (_) {}
    }

    // Return default session object
    const defaultSession = {
      session_code: this.sessionCode,
      title: DEFAULT_TITLE,
      header_image_url: DEFAULT_HEADER_IMAGE,
      current_question_index: 0,
      slide_mode: "VOTING",
      timer_seconds: 15,
      timer_state: "IDLE", // IDLE, RUNNING, EXPIRED, PAUSED
      timer_started_at: null,
      timer_duration: 15
    };
    this.saveSessionData(defaultSession);
    return defaultSession;
  }

  async saveSessionData(sessionObj) {
    localStorage.setItem(this.getSessionStorageKey(), JSON.stringify(sessionObj));

    // Also attempt Supabase upsert
    try {
      await supabase
        .from("sessions")
        .upsert(sessionObj, { onConflict: "session_code" });
    } catch (_) {}

    return sessionObj;
  }

  // Load Questions list for this session
  async getQuestions() {
    // Try Supabase first
    try {
      const { data, error } = await supabase
        .from("questions")
        .select("*")
        .eq("session_code", this.sessionCode)
        .order("question_order", { ascending: true });

      if (!error && data && data.length > 0) {
        return data;
      }

      // If database table does not have session_code column yet, query legacy questions
      if (error && error.message && error.message.includes("session_code")) {
        const { data: legData, error: legErr } = await supabase
          .from("questions")
          .select("*")
          .order("question_order", { ascending: true });
        if (!legErr && legData && legData.length > 0) {
          return legData;
        }
      }
    } catch (_) {}

    // Fallback to localStorage
    const saved = localStorage.getItem(this.getQuestionsStorageKey());
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (_) {}
    }

    // Return default questions only on initial session bootstrap
    const seeded = DEFAULT_QUESTIONS.map((q, idx) => ({
      ...q,
      session_code: this.sessionCode,
      question_order: idx + 1
    }));
    await this.saveQuestions(seeded);
    return seeded;
  }

  async saveQuestions(questionsArr) {
    localStorage.setItem(this.getQuestionsStorageKey(), JSON.stringify(questionsArr));

    // Try Supabase upsert/sync
    try {
      if (questionsArr.length === 0) {
        await supabase.from("questions").delete().eq("session_code", this.sessionCode);
      } else {
        await supabase.from("questions").upsert(questionsArr);
      }
    } catch (_) {}

    return questionsArr;
  }

  // Delete all questions with options and explanations for this session
  async deleteAllQuestions() {
    // 1. Wipe questions from localStorage as empty array
    localStorage.setItem(this.getQuestionsStorageKey(), JSON.stringify([]));

    // 2. Wipe questions from Supabase
    try {
      await supabase.from("questions").delete().eq("session_code", this.sessionCode);
    } catch (_) {}

    // 3. Clear responses since all questions were deleted
    try {
      await this.clearAllResponses();
    } catch (_) {}

    // 4. Reset current session index to 0
    try {
      const session = await this.getSessionData();
      if (session) {
        session.current_question_index = 0;
        session.slide_mode = "VOTING";
        await this.saveSessionData(session);
      }
    } catch (_) {}

    // 5. Broadcast across screens
    await this.broadcast("QUESTIONS_CHANGED", { empty: true });
    await this.broadcast("STATE_UPDATE", { currentIndex: 0, slideMode: "VOTING" });
    return [];
  }

  // Load Responses / Votes for a specific question
  async getResponses(questionId) {
    let list = [];

    // Try Supabase first
    try {
      const { data, error } = await supabase
        .from("responses")
        .select("*")
        .eq("question_id", questionId);

      if (!error && data) {
        list = data;
      }
    } catch (_) {}

    // Merge or fallback with localStorage
    const saved = localStorage.getItem(this.getResponsesStorageKey());
    if (saved) {
      try {
        const localVotes = JSON.parse(saved);
        const qVotes = localVotes.filter((v) => v.question_id === questionId);
        // Deduplicate by user_id
        const seenUsers = new Set(list.map((r) => r.user_id));
        qVotes.forEach((v) => {
          if (!seenUsers.has(v.user_id)) {
            list.push(v);
            seenUsers.add(v.user_id);
          }
        });
      } catch (_) {}
    }

    return list;
  }

  async recordVote(questionId, selectedOption, userId) {
    const voteRecord = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      session_code: this.sessionCode,
      question_id: questionId,
      user_id: userId,
      selected_option: selectedOption,
      created_at: new Date().toISOString()
    };

    // Save to localStorage
    try {
      const saved = localStorage.getItem(this.getResponsesStorageKey());
      let votes = saved ? JSON.parse(saved) : [];
      // Remove any previous vote by this user on this question
      votes = votes.filter(
        (v) => !(v.question_id === questionId && v.user_id === userId)
      );
      votes.push(voteRecord);
      localStorage.setItem(this.getResponsesStorageKey(), JSON.stringify(votes));
    } catch (_) {}

    // Save to Supabase
    try {
      await supabase.from("responses").insert({
        question_id: questionId,
        user_id: userId,
        selected_option: selectedOption
      });
    } catch (_) {}

    // Broadcast vote update
    await this.broadcast("VOTE_CAST", { questionId, selectedOption, userId, voteRecord });
    return voteRecord;
  }

  async resetResponses(questionId) {
    try {
      const saved = localStorage.getItem(this.getResponsesStorageKey());
      if (saved) {
        let votes = JSON.parse(saved);
        votes = votes.filter((v) => v.question_id !== questionId);
        localStorage.setItem(this.getResponsesStorageKey(), JSON.stringify(votes));
      }
    } catch (_) {}

    try {
      await supabase.from("responses").delete().eq("question_id", questionId);
    } catch (_) {}

    await this.broadcast("RESPONSES_RESET", { questionId });
  }

  // Clear ALL responses/answers for this entire session (leaving questions intact)
  async clearAllResponses() {
    try {
      localStorage.removeItem(this.getResponsesStorageKey());
    } catch (_) {}

    try {
      const qList = await this.getQuestions();
      const qIds = qList.map((q) => q.id);
      if (qIds.length > 0) {
        await supabase.from("responses").delete().in("question_id", qIds);
      }
      await supabase.from("responses").delete().eq("session_code", this.sessionCode);
    } catch (_) {}

    await this.broadcast("RESPONSES_RESET", { all: true });
  }

  // Get total count of recorded responses for this session
  async getAllResponsesCount() {
    let count = 0;
    try {
      const saved = localStorage.getItem(this.getResponsesStorageKey());
      if (saved) {
        const votes = JSON.parse(saved);
        if (Array.isArray(votes)) count = votes.length;
      }
    } catch (_) {}

    try {
      const qList = await this.getQuestions();
      const qIds = qList.map((q) => q.id);
      if (qIds.length > 0) {
        const { data, count: sbCount } = await supabase
          .from("responses")
          .select("id", { count: "exact" })
          .in("question_id", qIds);
        if (typeof sbCount === "number" && sbCount > count) {
          count = sbCount;
        } else if (data && data.length > count) {
          count = data.length;
        }
      }
    } catch (_) {}

    return count;
  }

  // --- Session List Storage (For Admin Dashboard) ---
  static getKnownSessions() {
    try {
      const saved = localStorage.getItem("POLL_ALL_SESSIONS");
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return [
      {
        code: DEFAULT_SESSION_CODE,
        title: DEFAULT_TITLE,
        headerImage: DEFAULT_HEADER_IMAGE,
        createdAt: new Date().toISOString()
      }
    ];
  }

  static saveKnownSessions(sessionsList) {
    try {
      localStorage.setItem("POLL_ALL_SESSIONS", JSON.stringify(sessionsList));
    } catch (_) {}
  }
}
