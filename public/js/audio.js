// Rockstar Games / GTA Style Audio Synthesizer (Web Audio API)
class SoundEffects {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Tactical HUD Click
  playPop() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'square';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.04);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  // Objective Check / Line Completed Chime (GTA style resonant bell)
  playLineChime() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const freqs = [587.33, 880.00, 1174.66]; // D5, A5, D6
    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime + (idx * 0.06);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.5);
    });
  }

  // Iconic GTA "MISSION PASSED" Brass Swell Fanfare
  playBingoFanfare() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const chords = [
      // Chord 1 (Tension)
      { f: [349.23, 440.00, 523.25], t: 0, d: 0.35 },
      // Chord 2 (Lift)
      { f: [392.00, 493.88, 587.33], t: 0.32, d: 0.35 },
      // Chord 3 (Triumphant Resolution - High Power Brass)
      { f: [523.25, 659.25, 783.99, 1046.50], t: 0.65, d: 1.2 }
    ];

    const baseTime = this.ctx.currentTime;

    chords.forEach(c => {
      c.f.forEach(freq => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const startTime = baseTime + c.t;

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.12, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + c.d);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + c.d + 0.05);
      });
    });
  }
}

window.sfx = new SoundEffects();
