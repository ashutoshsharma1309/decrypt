// Tiny WebAudio-based sound effects. No external dependencies.

let ctx: AudioContext | null = null;
function getCtx(): AudioContext {
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return ctx;
}

function tone(freq: number, durationMs: number, type: OscillatorType = "sine", gain = 0.05) {
  try {
    const c = getCtx();
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = gain;
    o.connect(g);
    g.connect(c.destination);
    const now = c.currentTime;
    g.gain.setValueAtTime(gain, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
    o.start(now);
    o.stop(now + durationMs / 1000);
  } catch {
    /* ignore — autoplay restrictions */
  }
}

export function playRevealChime() {
  tone(660, 160, "triangle");
  setTimeout(() => tone(880, 200, "triangle"), 110);
}

export function playWinChime() {
  tone(523.25, 160, "triangle"); // C5
  setTimeout(() => tone(659.25, 160, "triangle"), 130); // E5
  setTimeout(() => tone(783.99, 280, "triangle"), 260); // G5
}

export function playClick() {
  tone(440, 70, "square", 0.03);
}
