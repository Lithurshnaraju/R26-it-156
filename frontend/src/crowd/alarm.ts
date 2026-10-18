// lib/alarm.ts
// Generates a repeating beep using the Web Audio API so no external audio
// file is needed. Safe to construct on the server (methods just no-op
// there); actual playback only happens in the browser.

export class Alarm {
  private ctx: AudioContext | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  playing = false;

  private beep() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "square";
    osc.frequency.value = 880;
    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  }

  start() {
    if (this.playing || typeof window === "undefined") return;
    const AudioCtx =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();
    this.playing = true;
    this.beep();
    this.intervalId = setInterval(() => this.beep(), 700);
  }

  stop() {
    this.playing = false;
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = null;
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}
