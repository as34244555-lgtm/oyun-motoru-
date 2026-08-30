const NOTES = { C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88, C5: 523.25 };
const BUILTIN = ["meow", "jump", "coin", "hit", "win", "boom", "kick", "snare", "hat"];

let audioCtx = null;
const uploads = new Map();

function ctx() {
  audioCtx = audioCtx || new AudioContext();
  return audioCtx;
}

export function soundNames() {
  return [...BUILTIN, ...uploads.keys()];
}

export function addSoundFile(name, dataUrl) {
  uploads.set(name.replace(/\.[^.]+$/, "") || "ses", dataUrl);
}

export function uploadedSounds() {
  return [...uploads.entries()].map(([name, data]) => ({ name, data }));
}

export function loadSounds(list) {
  uploads.clear();
  for (const item of list || []) {
    if (item?.name && item.data) uploads.set(item.name, item.data);
  }
}

export function playSound(name, volume = 80) {
  try {
    const data = uploads.get(name);
    if (data) {
      const audio = new Audio(data);
      audio.volume = Math.max(0.02, Math.min(1, volume / 100));
      audio.play().catch(() => {});
      return;
    }
    const ac = ctx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = name === "meow" ? "triangle" : name === "boom" || name === "kick" ? "sawtooth" : name === "hat" ? "square" : "square";
    osc.frequency.value = NOTES[name] || (name === "jump" ? 520 : name === "coin" ? 880 : name === "hit" ? 180 : name === "snare" ? 220 : 330);
    gain.gain.value = Math.max(0.02, volume / 200);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + (name === "win" ? 0.35 : 0.18));
  } catch (_) {
    /* ignore */
  }
}

playSound.last = "";
