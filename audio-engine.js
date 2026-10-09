// Audio Synthesizer Engine using Web Audio API
// Zero external dependencies, zero latency, works across desktop & mobile.

class PollingAudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem("POLL_AUDIO_MUTED") === "true";
    this.unlocked = false;

    // Auto-unlock audio context on user gesture
    const unlockHandler = () => {
      this.init();
      if (this.ctx && this.ctx.state === "running") {
        this.unlocked = true;
        window.removeEventListener("pointerdown", unlockHandler);
        window.removeEventListener("keydown", unlockHandler);
      }
    };
    window.addEventListener("pointerdown", unlockHandler);
    window.addEventListener("keydown", unlockHandler);
  }

  init() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  setMuted(isMuted) {
    this.muted = isMuted;
    localStorage.setItem("POLL_AUDIO_MUTED", isMuted ? "true" : "false");
    return this.muted;
  }

  toggleMute() {
    return this.setMuted(!this.muted);
  }

  isMuted() {
    return this.muted;
  }

  // Warning tick for the last 5 seconds (5s, 4s, 3s, 2s, 1s)
  playWarningTick() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      // Dual burst for a realistic "tick-tock" or punchy digital tick
      osc.frequency.setValueAtTime(1050, now);
      osc.frequency.exponentialRampToValueAtTime(450, now + 0.06);

      gain.gain.setValueAtTime(0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.07);
    } catch (e) {
      console.warn("Audio playback error:", e);
    }
  }

  // Final Buzzer sound when the last 5 seconds get over (at 0s)
  playBuzzer() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const duration = 0.85;

      // Two detuned low-frequency waves for that iconic game show buzzer
      [145, 190].forEach((freq) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.setValueAtTime(0.38, now + duration - 0.15);
        gain.gain.linearRampToValueAtTime(0.001, now + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + duration);
      });
    } catch (e) {
      console.warn("Buzzer playback error:", e);
    }
  }

  // Rewarding chime when revealing the correct answer
  playChime() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        const noteTime = now + i * 0.08;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, noteTime);

        gain.gain.setValueAtTime(0.25, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.4);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(noteTime);
        osc.stop(noteTime + 0.45);
      });
    } catch (e) {
      console.warn("Chime playback error:", e);
    }
  }
}

export const audioEngine = new PollingAudioEngine();
