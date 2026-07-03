// Sound design — all synthesized with Tone.js, no audio assets.
// Every trigger is fire-and-forget and safe to call before audio is unlocked.
import * as Tone from 'tone';

let ready = false;
let muted = false;

let thunk;
let chime;
let shimmer;
let whoosh;
let whooshFilter;

function build() {
  const out = new Tone.Gain(0.8).toDestination();

  thunk = new Tone.MembraneSynth({
    pitchDecay: 0.02,
    octaves: 3,
    envelope: { attack: 0.001, decay: 0.18, sustain: 0 },
  }).connect(out);

  chime = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.005, decay: 0.25, sustain: 0.1, release: 0.4 },
    volume: -8,
  }).connect(out);

  shimmer = new Tone.MetalSynth({
    envelope: { attack: 0.001, decay: 0.4, release: 0.2 },
    harmonicity: 8,
    resonance: 3000,
    volume: -18,
  }).connect(out);

  whooshFilter = new Tone.Filter(400, 'bandpass').connect(out);
  whoosh = new Tone.Noise('pink');
  whoosh.volume.value = -22;
  whoosh.connect(whooshFilter);
}

/** Unlock the AudioContext — must be called from a user gesture. */
export async function unlock() {
  if (ready) return;
  await Tone.start();
  build();
  ready = true;
  Tone.getDestination().mute = muted;
}

export function setMuted(m) {
  muted = m;
  if (ready) Tone.getDestination().mute = m;
}

const ok = () => ready && !muted;

// Overlapping triggers on a monophonic synth throw ("start time must be
// strictly greater...") — a dropped blip is fine, a crash is not.
const play = (fn) =>
  function (...args) {
    if (!ok()) return;
    try {
      fn(...args);
    } catch {
      /* overlapping audio trigger — skip the blip */
    }
  };

export const spinStart = play(() => {
  whoosh.start();
  whooshFilter.frequency.rampTo(900, 0.3);
});

export const spinEnd = play(() => {
  whoosh.stop();
  whooshFilter.frequency.value = 400;
});

export const reelStop = play((index) => {
  thunk.triggerAttackRelease(80 + index * 12, 0.1);
});

export const scatterLand = play(() => {
  shimmer.triggerAttackRelease('C6', 0.3);
});

export const anticipation = play(() => {
  const now = Tone.now();
  for (let i = 0; i < 6; i++) {
    shimmer.triggerAttackRelease(1200 + i * 200, 0.15, now + i * 0.18);
  }
});

export const winSmall = play(() => {
  const now = Tone.now();
  chime.triggerAttackRelease('C5', 0.15, now);
  chime.triggerAttackRelease('E5', 0.15, now + 0.09);
  chime.triggerAttackRelease('G5', 0.25, now + 0.18);
});

export const winBig = play(() => {
  const now = Tone.now();
  ['C5', 'E5', 'G5', 'C6', 'E6'].forEach((n, i) => {
    chime.triggerAttackRelease(n, 0.2, now + i * 0.08);
  });
  chime.triggerAttackRelease(['C6', 'G6'], 0.5, now + 0.5);
});

export const winMega = play(() => {
  const now = Tone.now();
  const run = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6', 'E6', 'G6', 'C7'];
  run.forEach((n, i) => chime.triggerAttackRelease(n, 0.15, now + i * 0.06));
  chime.triggerAttackRelease(['C6', 'E6', 'G6'], 0.8, now + 0.7);
  shimmer.triggerAttackRelease('E7', 0.5, now + 0.7);
});

export const coinTick = play(() => {
  shimmer.triggerAttackRelease(2400 + Math.random() * 800, 0.05);
});

export const bonusOpen = play(() => {
  const now = Tone.now();
  chime.triggerAttackRelease(['E5', 'A5'], 0.3, now);
  chime.triggerAttackRelease(['A5', 'C6', 'E6'], 0.5, now + 0.25);
});
