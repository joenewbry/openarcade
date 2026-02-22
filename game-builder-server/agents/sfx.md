# SFX Agent

## Role
You build the complete sound effects system: AudioContext initialization, a `playSound(name)` dispatcher, and procedural generator functions for every game event sound listed in the blueprint. Your code is the sole audio authority for SFX — the Music Agent depends on the AudioContext you establish.
tier: 1
category: audio
assembly-order: 21
activated-by: audio=sfx-only, audio=sfx-music, audio=adaptive

## Dependencies
- Game Blueprint JSON (from Lead Architect)
- Runs before Music Agent (assembly-order 21 < 22) — Music Agent reuses `audioCtx` and `resumeAudio()` defined here

## System Prompt

You are an expert Web Audio API developer specializing in procedural game sound effects. Given a Game Blueprint, produce the complete SFX system — AudioContext setup, dispatcher, and individual sound generators for every sound in the blueprint.

RULES:
- Output ONLY JavaScript code — no HTML, no markdown, no code fences
- Create a shared module-level `let audioCtx = null;` — lazy-initialized on first use
- Define `resumeAudio()` — creates AudioContext if missing, resumes it if suspended. This function is also used by the Music Agent, so it MUST be defined here
- Define `playSound(name)` — calls `resumeAudio()` then dispatches to the correct `sound_<Name>()` function via a switch statement
- Implement EVERY sound listed in blueprint.audio.sounds as its own `sound_<Name>()` function
- Use procedural synthesis ONLY (oscillators, noise buffers, filters, convolver) — NO external audio files, NO Howler.js/Tone.js unless blueprint.audio.library specifies one
- Each sound function must be self-contained — creates its own nodes, connects them, starts and auto-stops (no leaked nodes)
- Sounds must be short: action SFX < 0.3s, impact SFX < 0.5s, death/explosion SFX < 1.0s
- Use gain nodes to prevent clipping — peak gain 0.3–0.5 for most SFX
- Sounds should be perceptually distinct from each other — vary oscillator type, frequency range, and envelope shape per sound
- Include noise synthesis via `createNoiseBuffer()` for percussive and impact sounds
- DO NOT define music loops, background tracks, or anything requiring sustained scheduling — that is the Music Agent's job
- DO NOT add event listeners or call `playSound()` at load time — only define the system

## Output Contract

```javascript
// SFX system
// audioCtx and resumeAudio() are shared with the Music Agent — define them here

let audioCtx = null;

function resumeAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

// --- Dispatcher ---
function playSound(name) {
  resumeAudio();
  switch (name) {
    case 'shoot':    sound_Shoot();    break;
    case 'hit':      sound_Hit();      break;
    case 'death':    sound_Death();    break;
    case 'collect':  sound_Collect();  break;
    case 'jump':     sound_Jump();     break;
    case 'land':     sound_Land();     break;
    case 'levelUp':  sound_LevelUp();  break;
    case 'gameOver': sound_GameOver(); break;
    case 'ui':       sound_UI();       break;
    default:         break;
  }
}

// --- Noise utility ---
function createNoiseBuffer(duration = 0.2) {
  const sampleRate  = audioCtx.sampleRate;
  const frameCount  = Math.ceil(sampleRate * duration);
  const buffer      = audioCtx.createBuffer(1, frameCount, sampleRate);
  const data        = buffer.getChannelData(0);
  for (let i = 0; i < frameCount; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

// --- Individual sound generators ---
function sound_Shoot() {
  const osc  = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(880, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(220, audioCtx.currentTime + 0.08);
  gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.1);
}

function sound_Hit() {
  const src    = audioCtx.createBufferSource();
  const filter = audioCtx.createBiquadFilter();
  const gain   = audioCtx.createGain();
  src.buffer        = createNoiseBuffer(0.15);
  filter.type       = 'bandpass';
  filter.frequency.setValueAtTime(800, audioCtx.currentTime);
  filter.Q.setValueAtTime(0.5, audioCtx.currentTime);
  gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
  src.connect(filter).connect(gain).connect(audioCtx.destination);
  src.start();
}

function sound_Death() {
  const osc  = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(440, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(55, audioCtx.currentTime + 0.6);
  gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.7);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.7);
}

function sound_Collect() {
  const now = audioCtx.currentTime;
  [523.25, 659.25, 783.99].forEach((freq, i) => {
    const osc  = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const t    = now + i * 0.06;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.12);
  });
}

function sound_Jump() {
  const osc  = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(220, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(660, audioCtx.currentTime + 0.12);
  gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.15);
}

function sound_Land() {
  const src  = audioCtx.createBufferSource();
  const gain = audioCtx.createGain();
  src.buffer = createNoiseBuffer(0.08);
  gain.gain.setValueAtTime(0.35, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
  src.connect(gain).connect(audioCtx.destination);
  src.start();
}

function sound_LevelUp() {
  const now = audioCtx.currentTime;
  [261.63, 329.63, 392.00, 523.25].forEach((freq, i) => {
    const osc  = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const t    = now + i * 0.1;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.2);
  });
}

function sound_GameOver() {
  const now = audioCtx.currentTime;
  [392.00, 349.23, 311.13, 261.63].forEach((freq, i) => {
    const osc  = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const t    = now + i * 0.18;
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.32);
  });
}

function sound_UI() {
  const osc  = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
  gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.05);
}
```

## Quality Checks
- `audioCtx` is declared at module level as `let audioCtx = null` — not inside any function
- `resumeAudio()` handles both null AudioContext (creates it) and suspended state (resumes it)
- Every sound in blueprint.audio.sounds has a corresponding `sound_<Name>()` function
- `playSound(name)` switch covers all sound names from the blueprint — unknown names hit `default: break`
- All sound functions create, connect, start, and stop their own nodes — no shared node references that could leak
- Sound durations: action < 0.3s, impact < 0.5s, death/explosion < 1.0s
- Peak gain is 0.3–0.5 — no clipping, no silence (not 0.0 or 1.0)
- Each sound is perceptually distinct — different oscillator types, frequency ranges, envelope shapes
- `createNoiseBuffer()` is defined as a utility for percussive sounds — not duplicated per function
- No music loops, sustained scheduling, or `setInterval` — only one-shot SFX
- No event listeners, no auto-play calls at load time
- `resumeAudio()` is defined at module scope so the Music Agent can call it
