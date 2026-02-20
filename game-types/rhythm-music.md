# Genre: Rhythm / Music

**Status**: complete
**Last Updated**: 2026-02-20
**Complexity**: medium-high
**Reference Image**: images/rhythm-music-reference.png

---

## Identity

Rhythm and music games place the player inside the music itself. The core fantasy is
**becoming one with the beat** -- achieving a flow state where input, audio, and
visuals fuse into a single experience. Unlike other genres where audio is decorative,
here it is the primary mechanic. Every action the player takes is judged against a
musical timeline, and mastery is expressed through accuracy, timing, and feel.

### What Defines a Rhythm/Music Game

1. **Player actions are evaluated against a musical timeline.** Inputs are not merely
   "correct or incorrect" -- they are "early, late, or on time." The timing quality
   of input matters more than spatial accuracy.
2. **Audio drives gameplay, not the other way around.** The song dictates when enemies
   spawn, when notes arrive, and when the player must act. Remove the audio and the
   game becomes incomprehensible.
3. **Repetition breeds mastery.** Players replay the same song dozens of times,
   internalizing its rhythmic structure until their inputs become automatic. This
   mirrors how musicians practice.
4. **Performance is graded holistically.** A full song playthrough produces a grade
   (S/A/B/C/D/F) based on cumulative accuracy, not just a binary win/loss.

### Sub-genres

| Sub-genre | Core Interaction | Examples |
|-----------|-----------------|----------|
| **Note Highway** | Notes scroll toward a hit zone; player presses matching input at the right time | Guitar Hero, Beat Saber, Rock Band |
| **Rhythm Action** | Standard game mechanics (movement, combat) synced to a beat grid | Crypt of the NecroDancer, Cadence of Hyrule, BPM: Bullets Per Minute |
| **Tap/Swipe** | Tap, hold, or swipe targets as they appear on screen | OSU!, Cytus, Arcaea, Deemo |
| **Music Creation** | Player assembles loops, layers, or instruments to create music | Incredibox, LoopMash, Electronauts |
| **Dance** | Full-body or directional input timed to music | Dance Dance Revolution, Just Dance, Pump It Up |
| **Rhythm RPG** | Turn-based or real-time RPG with rhythm-based attack/defense | Patapon, Theatrhythm Final Fantasy, Friday Night Funkin' |
| **Rhythm Puzzle** | Puzzle mechanics married to musical timing | Lumines, Tetris Effect, Chime |
| **Visualizer / Toy** | No fail state; player interacts with music freely | Electroplankton, Rez Infinite (borderline) |

### Classic Examples -- Deep Analysis

**Guitar Hero / Rock Band (2005-2010)**
The game that mainstreamed rhythm gaming in the West. Five colored note lanes scroll
toward a strum line. Success formula: the plastic guitar controller created embodied
performance -- players felt like rock stars. Key design lesson: the note highway
provides excellent visual telegraph of upcoming difficulty. Players can see a hard
section approaching 2-3 seconds before it arrives, creating anticipation and tension.
Star Power (score multiplier from perfect sections) created strategic depth on top of
raw accuracy.

**Beat Saber (2019)**
Proved rhythm games work in VR. Two-color saber slashing with directional arrows on
blocks. Key insight: the physicality of slashing adds a layer that button-pressing
cannot replicate. Design lesson: haptic feedback and spatial audio dramatically
improve timing feel. The song-difficulty marriage is so tight that the game feels
unfair when the chart does not match the music (custom charts often fail here).

**Rhythm Heaven (2006-2015)**
No scrolling note highway at all. Instead, each minigame teaches a unique rhythmic
pattern through call-and-response. The player must internalize the beat rather than
read visual cues. Design lesson: visual simplicity forces players to actually listen.
This is the gold standard for "feel-based" rhythm design.

**Crypt of the NecroDancer (2015)**
Roguelike dungeon crawler where every action must happen on the beat. Moving, attacking,
and using items are all beat-locked. Design lesson: you can graft rhythm mechanics onto
almost any genre. The constraint of beat-locked movement creates emergent puzzle-like
decision making -- "I need to move left but the beat is NOW and there is an enemy there."

**OSU! (2007-present)**
Open-source rhythm game with community-created beatmaps for any song. Circles appear
and must be clicked when a shrinking approach circle matches them. Design lesson: the
approach circle is one of the best timing telegraphs ever designed -- it communicates
exact timing through a continuous visual animation rather than discrete steps.

**Friday Night Funkin' (2020)**
Arrow-key rhythm game with Newgrounds aesthetic. Two-player battle format where the
opponent's pattern plays first, then the player must match/exceed it. Design lesson:
the call-and-response structure adds narrative tension to pure rhythm gameplay.
Open-source modding community extended its life enormously.

**Incredibox (2009)**
Music creation toy where players drag icons onto characters to layer beatbox loops.
No fail state. Design lesson: constraint-based music creation (limited loops that
always harmonize) makes every player feel musically competent. The "discovery" of
good combinations replaces the "accuracy" reward of traditional rhythm games.

**Parappa the Rapper (1996)**
The original mainstream rhythm game. Call-and-response rap battles with a timing bar.
Design lesson: personality and humor can carry a rhythm game with primitive mechanics.
The "freestyle" bonus for improvising within the beat window was ahead of its time.

---

## Core Mechanics (Deep)

### Beat Mapping

A beat map (also called a chart, note chart, or step chart) is a timestamped sequence
of notes that defines when and what the player must do. It is the fundamental data
structure of every rhythm game.

**BPM and the Beat Grid**

All rhythm games operate on a beat grid defined by Beats Per Minute (BPM):

```
Beat interval (ms) = 60000 / BPM

Examples:
  60 BPM  = 1000ms per beat (very slow, tutorial)
  90 BPM  = 666.7ms per beat (slow ballad)
 120 BPM  = 500ms per beat (standard pop/rock)
 140 BPM  = 428.6ms per beat (upbeat dance)
 160 BPM  = 375ms per beat (fast, energetic)
 180 BPM  = 333.3ms per beat (very fast, expert)
 200 BPM  = 300ms per beat (extreme difficulty)
```

**Beat Subdivision**

Notes rarely land only on whole beats. Common subdivisions:

| Subdivision | Fraction | At 120 BPM | Usage |
|-------------|----------|-----------|-------|
| Whole beat | 1/1 | 500ms | Basic rhythm |
| Half beat | 1/2 | 250ms | Eighth notes, common |
| Third beat | 1/3 | 166.7ms | Triplets, swing feel |
| Quarter beat | 1/4 | 125ms | Sixteenth notes, fast runs |
| Sixth beat | 1/6 | 83.3ms | Sextuplets, very fast |
| Eighth beat | 1/8 | 62.5ms | 32nd notes, extreme |

**Note Placement on Timeline**

Each note in a beat map is stored as:

```javascript
// Minimal note format
{
  time: 2500,      // milliseconds from song start
  lane: 2,         // which lane/column (0-indexed)
  type: 'tap',     // tap, hold, slide, flick
  duration: 0      // for hold notes: duration in ms
}

// Full beat map structure
const beatMap = {
  songId: 'example-song',
  bpm: 120,
  offset: 0,          // ms offset from audio start to first beat
  notes: [
    { time: 0,    lane: 1, type: 'tap' },
    { time: 500,  lane: 2, type: 'tap' },
    { time: 1000, lane: 0, type: 'hold', duration: 500 },
    { time: 1250, lane: 3, type: 'tap' },
    { time: 1500, lane: 1, type: 'tap' },
    { time: 1500, lane: 3, type: 'tap' },  // simultaneous notes
    // ...
  ]
};
```

**BPM Changes**

Many songs change tempo. The beat map must store BPM change events:

```javascript
bpmChanges: [
  { time: 0, bpm: 120 },        // song starts at 120 BPM
  { time: 30000, bpm: 140 },    // speeds up at 30s
  { time: 45000, bpm: 80 },     // half-time bridge section
  { time: 60000, bpm: 140 }     // back to fast for final chorus
]
```

### Timing Windows

The timing window system is the heart of feel in a rhythm game. It determines how
forgiving or punishing the game is. These thresholds are measured as the absolute
difference between the player's input time and the note's target time.

**Standard Timing Windows**

```
|         MISS          |  GOOD  | GREAT |PERFECT| GREAT |  GOOD  |         MISS          |
|_______________________|________|_______|__*____|_______|________|_______________________|
-200ms              -80ms    -50ms   -20ms  0ms  +20ms   +50ms   +80ms                +200ms
                                        (note target)
```

| Judgment | Window (typical) | Points Multiplier | Feel |
|----------|-----------------|-------------------|------|
| **Perfect** / Marvelous | +/- 20ms | 100% + bonus | Requires near-frame-perfect input |
| **Great** / Excellent | +/- 50ms | 100% | Feels right, achievable with practice |
| **Good** / OK | +/- 80ms | 60% | Barely acceptable, feels sloppy |
| **Bad** / Boo | +/- 120ms | 20% | Registered but penalized |
| **Miss** | > 120ms or no input | 0% | Combo break |

**Why These Numbers**

Human reaction time to audio stimuli is approximately 150-200ms. However, in rhythm
games the player is not reacting -- they are anticipating. When a player has
internalized the beat, their timing variance drops to approximately +/- 30ms for
skilled players and +/- 60ms for casual players. The Perfect window at +/- 20ms
requires genuine musical feel, not just reaction.

**Asymmetric Windows**

Some games use asymmetric windows because early hits feel worse than late hits:

```javascript
// Asymmetric windows -- early is slightly more forgiving
// because human perception of "early" is less precise than "late"
const TIMING_WINDOWS = {
  perfect: { early: -25, late: 20 },
  great:   { early: -55, late: 50 },
  good:    { early: -90, late: 80 },
  miss:    { early: -200, late: 150 }
};

function judgeHit(inputTime, noteTime) {
  const delta = inputTime - noteTime;  // negative = early, positive = late
  if (delta >= TIMING_WINDOWS.perfect.early && delta <= TIMING_WINDOWS.perfect.late) return 'perfect';
  if (delta >= TIMING_WINDOWS.great.early && delta <= TIMING_WINDOWS.great.late) return 'great';
  if (delta >= TIMING_WINDOWS.good.early && delta <= TIMING_WINDOWS.good.late) return 'good';
  return 'miss';
}
```

**Difficulty-Dependent Windows**

Harder difficulties tighten the windows:

| Difficulty | Perfect | Great | Good |
|-----------|---------|-------|------|
| Easy | +/- 40ms | +/- 80ms | +/- 130ms |
| Normal | +/- 25ms | +/- 55ms | +/- 90ms |
| Hard | +/- 18ms | +/- 40ms | +/- 65ms |
| Expert | +/- 12ms | +/- 30ms | +/- 50ms |

### Input Sync and Latency Compensation

This is the most technically demanding aspect of rhythm game development. Audio,
video, and input all have different latency characteristics in a web browser.

**Sources of Latency**

```
User presses key
  +0ms     ─── keyboard hardware scan (USB polling: ~1-8ms)
  +1-8ms   ─── OS keyboard driver
  +1-5ms   ─── Browser event dispatch (keydown fires)
  +0-16ms  ─── Event lands in current or next rAF frame (0-16.67ms jitter)

Audio plays from scheduled note
  +0ms     ─── AudioContext processes audio
  +3-50ms  ─── audioContext.baseLatency (OS audio buffer)
  +0-20ms  ─── audioContext.outputLatency (DAC/speaker)
  +0-5ms   ─── Physical sound propagation (negligible for headphones)

Visual note reaches hit line
  +0ms     ─── Frame drawn to canvas
  +0-16ms  ─── vsync delay (next screen refresh)
  +1-15ms  ─── Display processing (input lag of monitor)
```

**The Latency Compensation Formula**

To keep audio, visuals, and input in sync, you need calibration offsets:

```javascript
// Audio offset: how many ms early we must schedule audio so the player
// hears it at the "right" time
const audioOffset = audioContext.baseLatency * 1000 + audioContext.outputLatency * 1000;

// Visual offset: how many ms early we must start scrolling a note so it
// reaches the hit line at the "right" time
// This depends on note speed and display latency
const visualOffset = displayLatencyMs; // typically 5-20ms

// Input offset: user-calibrated value from a calibration screen
// Positive = player hits late (shift note targets earlier)
// Negative = player hits early (shift note targets later)
let inputOffset = 0; // set by calibration

// The master timing function: given a note's target time in the song,
// when should it actually be at the hit line visually?
function getVisualTargetTime(noteTime) {
  return noteTime - audioOffset + inputOffset;
}

// When judging a hit, compensate for the calibrated offset
function getAdjustedDelta(inputTimestamp, noteTime) {
  return inputTimestamp - (noteTime + inputOffset);
}
```

**Calibration Screen Design**

Every serious rhythm game needs a calibration screen. The standard approach:

1. Play a steady metronome click at the current BPM
2. Display a visual indicator (pulsing circle, bouncing ball)
3. Ask the player to tap along with what they HEAR (audio calibration)
4. Ask the player to tap along with what they SEE (visual calibration)
5. Average the deltas over 16-32 taps, discard outliers
6. Store the offset in localStorage

```javascript
function runCalibration(taps, expectedBeatTimes) {
  const deltas = taps.map((tapTime, i) => {
    // Find nearest expected beat
    let minDelta = Infinity;
    for (const beatTime of expectedBeatTimes) {
      const delta = tapTime - beatTime;
      if (Math.abs(delta) < Math.abs(minDelta)) minDelta = delta;
    }
    return minDelta;
  });

  // Remove outliers (beyond 2 standard deviations)
  const mean = deltas.reduce((a, b) => a + b, 0) / deltas.length;
  const stddev = Math.sqrt(deltas.reduce((a, b) => a + (b - mean) ** 2, 0) / deltas.length);
  const filtered = deltas.filter(d => Math.abs(d - mean) < 2 * stddev);

  // Final offset is the average of filtered deltas
  return filtered.reduce((a, b) => a + b, 0) / filtered.length;
}
```

### Scoring Systems

**Accuracy-Based Scoring**

```javascript
const MAX_NOTE_SCORE = 300;
const SCORE_TABLE = {
  perfect: 300,
  great:   200,
  good:    100,
  bad:      50,
  miss:      0
};

// Final grade is based on percentage of maximum possible score
// maxPossible = totalNotes * MAX_NOTE_SCORE
function calculateGrade(totalScore, maxPossible) {
  const pct = totalScore / maxPossible;
  if (pct >= 0.98) return 'S';   // near-perfect run
  if (pct >= 0.93) return 'A';
  if (pct >= 0.85) return 'B';
  if (pct >= 0.70) return 'C';
  if (pct >= 0.50) return 'D';
  return 'F';
}
```

**Combo Multiplier**

Consecutive successful hits (Good or better) build a combo. The combo multiplier
rewards consistency:

```javascript
let combo = 0;
let maxCombo = 0;

function onNoteHit(judgment) {
  if (judgment === 'miss') {
    combo = 0;
    return;
  }
  combo++;
  maxCombo = Math.max(maxCombo, combo);
}

function getComboMultiplier(combo) {
  if (combo >= 100) return 4.0;
  if (combo >= 50)  return 3.0;
  if (combo >= 25)  return 2.0;
  if (combo >= 10)  return 1.5;
  return 1.0;
}

// Score per note = SCORE_TABLE[judgment] * getComboMultiplier(combo)
```

**Life/Health Bar**

Some rhythm games use a health bar that drains on misses and refills on hits:

```javascript
let health = 50;  // starts at 50%, range 0-100
const HEALTH_DELTA = {
  perfect: +2.0,
  great:   +1.0,
  good:    +0.5,
  bad:     -2.0,
  miss:    -5.0
};

// Game over if health reaches 0 mid-song
function updateHealth(judgment) {
  health = Math.max(0, Math.min(100, health + HEALTH_DELTA[judgment]));
  if (health <= 0) triggerGameOver();
}
```

### Note Types

| Type | Input | Visual | Duration |
|------|-------|--------|----------|
| **Tap** | Single keypress | Circle or arrow, single beat | Instant |
| **Hold** | Press and sustain | Line extending from start to end | Variable (200ms-4000ms) |
| **Slide** | Drag or swipe direction | Arrow with directional trail | Instant |
| **Flick** | Quick swipe in direction | Pointed arrow or flick icon | Instant |
| **Simultaneous** | Multiple keys at once | Two or more notes on same beat | Instant |
| **Rapid** | Mash or trill between keys | Rapid repeated note icons | Variable |
| **Drag** | Hold and follow a path | Curved line or slider path | Variable |

### Audio Analysis for Procedural Beat Mapping

When the player provides their own music or you want to auto-generate beat maps:

**Onset Detection via Spectral Flux**

Spectral flux measures how much the frequency spectrum changes between consecutive
audio frames. Peaks in spectral flux correspond to note onsets (drum hits, chord
changes, vocal attacks).

```javascript
// Simplified onset detection using Web Audio API AnalyserNode
function detectOnsets(audioBuffer, sampleRate) {
  const fftSize = 2048;
  const hopSize = 512;
  const numBins = fftSize / 2;
  const frames = [];

  // Compute magnitude spectrum for each frame
  // (In practice, use OfflineAudioContext + AnalyserNode)

  const spectralFlux = [];
  for (let i = 1; i < frames.length; i++) {
    let flux = 0;
    for (let bin = 0; bin < numBins; bin++) {
      // Only count positive changes (half-wave rectification)
      const diff = frames[i][bin] - frames[i - 1][bin];
      if (diff > 0) flux += diff;
    }
    spectralFlux.push(flux);
  }

  // Peak-pick: onset is where flux exceeds a running threshold
  const onsets = [];
  const windowSize = 10;
  const multiplier = 1.5;  // sensitivity (lower = more onsets)

  for (let i = windowSize; i < spectralFlux.length - windowSize; i++) {
    const localMean = spectralFlux
      .slice(i - windowSize, i + windowSize)
      .reduce((a, b) => a + b, 0) / (windowSize * 2);

    if (spectralFlux[i] > localMean * multiplier && spectralFlux[i] > spectralFlux[i - 1]) {
      const timeMs = (i * hopSize / sampleRate) * 1000;
      onsets.push(timeMs);
    }
  }

  return onsets;
}
```

**BPM Detection via Autocorrelation**

```javascript
function detectBPM(onsets) {
  // Build inter-onset interval histogram
  const intervals = [];
  for (let i = 1; i < onsets.length; i++) {
    const interval = onsets[i] - onsets[i - 1];
    if (interval > 200 && interval < 2000) {  // 30-300 BPM range
      intervals.push(interval);
    }
  }

  // Cluster intervals into BPM candidates
  const bpmCounts = {};
  for (const interval of intervals) {
    const bpm = Math.round(60000 / interval);
    // Consider half and double time
    for (const candidate of [bpm, bpm * 2, Math.round(bpm / 2)]) {
      if (candidate >= 60 && candidate <= 200) {
        bpmCounts[candidate] = (bpmCounts[candidate] || 0) + 1;
      }
    }
  }

  // Return BPM with the highest vote count
  return Number(Object.entries(bpmCounts)
    .sort((a, b) => b[1] - a[1])[0][0]);
}
```

### Web Audio API Patterns

**Precise Audio Scheduling**

The Web Audio API's `AudioContext.currentTime` provides a high-resolution,
monotonically increasing clock that is far more reliable than `Date.now()` or
`performance.now()` for audio synchronization.

```javascript
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// CRITICAL: Resume AudioContext on user interaction (browser autoplay policy)
document.addEventListener('click', () => {
  if (audioCtx.state === 'suspended') audioCtx.resume();
}, { once: true });

// Lookahead scheduling pattern (from Chris Wilson's "A Tale of Two Clocks")
// Schedule audio events slightly ahead of time for glitch-free playback
const SCHEDULE_AHEAD = 0.1;    // seconds: how far ahead to schedule
const LOOKAHEAD_INTERVAL = 25; // ms: how often to check for notes to schedule

let nextNoteIndex = 0;
let songStartTime = 0;  // audioCtx.currentTime when song started

function schedulerTick() {
  const currentSongTime = (audioCtx.currentTime - songStartTime) * 1000; // ms

  while (nextNoteIndex < beatMap.notes.length) {
    const note = beatMap.notes[nextNoteIndex];
    const noteTimeInCtx = songStartTime + note.time / 1000;

    // If this note is within our scheduling window, schedule it
    if (noteTimeInCtx < audioCtx.currentTime + SCHEDULE_AHEAD) {
      scheduleNoteSound(note, noteTimeInCtx);
      nextNoteIndex++;
    } else {
      break; // no more notes to schedule right now
    }
  }
}

// Run the scheduler at a regular interval (NOT tied to rAF)
setInterval(schedulerTick, LOOKAHEAD_INTERVAL);
```

**Playing Hit Sounds**

```javascript
function playHitSound(type, when) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  if (type === 'perfect') {
    osc.frequency.value = 880;  // A5
    gain.gain.setValueAtTime(0.3, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + 0.1);
    osc.start(when);
    osc.stop(when + 0.1);
  } else if (type === 'miss') {
    osc.type = 'sawtooth';
    osc.frequency.value = 150;
    gain.gain.setValueAtTime(0.2, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + 0.15);
    osc.start(when);
    osc.stop(when + 0.15);
  }
}
```

**Song Playback with Precise Start Time**

```javascript
let songSource = null;

async function loadAndPlaySong(url) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

  songSource = audioCtx.createBufferSource();
  songSource.buffer = audioBuffer;
  songSource.connect(audioCtx.destination);

  // Record the exact start time so we can synchronize everything
  songStartTime = audioCtx.currentTime + 0.1;  // small buffer for setup
  songSource.start(songStartTime);

  return songStartTime;
}
```

### Latency Measurement

```javascript
// Measure actual audio output latency
function getAudioLatencyMs() {
  const base = audioCtx.baseLatency || 0;
  const output = audioCtx.outputLatency || 0;
  return (base + output) * 1000;
}

// For browsers that do not expose outputLatency, estimate it:
// - Desktop Chrome/Firefox: ~10-30ms
// - Mobile Safari: ~40-80ms
// - Bluetooth headphones: +150-300ms (devastating for rhythm games)

// Warn users about Bluetooth audio
if (navigator.bluetooth || /bluetooth/i.test(navigator.userAgent)) {
  console.warn('Bluetooth audio detected. Expect ~150-300ms additional latency.');
}
```

---

## Design Patterns

### Flow State Design

Flow state -- the psychological state of total absorption -- is the ultimate goal
of rhythm game design. Mihaly Csikszentmihalyi's model requires:

1. **Clear goals**: the note highway tells you exactly what to do
2. **Immediate feedback**: hit sounds, visual flashes, combo counter
3. **Challenge matches skill**: difficulty levels, song selection

**Within-Song Difficulty Curve**

A well-charted song follows the energy of the music:

```
Song section:   Intro    Verse 1   Pre-chorus  Chorus 1   Verse 2   Chorus 2   Bridge   Final Chorus   Outro
Note density:   Low      Medium    Building    High       Medium    High       Low/Mid  Highest        Fade
New mechanics:  Basic    +holds    +doubles    Full       Review    Full       Calm     Everything     Resolve
Player energy:  Warm up  Engage    Tension     Release    Breathe   Engage     Rest     Peak           Cool down
```

This mirrors the musical arc. Fight the temptation to make every section equally hard.
Quiet musical sections should have sparse, easy patterns. The chorus earns its
difficulty by giving the player a breather before and after.

### Difficulty Levels

**Scaling Dimensions**

| Dimension | Easy | Normal | Hard | Expert |
|-----------|------|--------|------|--------|
| Notes per second | 1-2 | 2-4 | 4-8 | 8-16 |
| Note types | Tap only | Tap + hold | + simultaneous | + flick, slide, rapid |
| Lane usage | Center 2 lanes | All 4 lanes | All lanes, jumps | Full keyboard/screen |
| Timing strictness | +/- 80ms | +/- 50ms | +/- 35ms | +/- 20ms |
| Rest frequency | Every 2 bars | Every 4 bars | Every 8 bars | Rare |
| Pattern complexity | Single notes on beats | Off-beats, syncopation | Polyrhythm, cross-hand | Streams, trills, tech |
| BPM range | 80-120 | 100-150 | 120-180 | 140-220+ |

**Note Density Formula**

A useful heuristic for notes-per-second by difficulty:

```
Easy:   NPS = BPM / 120 * 1.5
Normal: NPS = BPM / 120 * 3
Hard:   NPS = BPM / 120 * 6
Expert: NPS = BPM / 120 * 12

Example at 150 BPM:
  Easy:   1.5 * 1.25 = 1.9 NPS
  Normal: 3.0 * 1.25 = 3.75 NPS
  Hard:   6.0 * 1.25 = 7.5 NPS
  Expert: 12  * 1.25 = 15 NPS
```

### Visual Feedback That Reinforces Rhythm

Effective visual feedback serves double duty: it rewards the player AND reinforces
the beat, training the player's internal metronome.

**Beat-Synced Effects**

```javascript
// Background pulse on every beat
function drawBackgroundPulse(ctx, beatPhase) {
  // beatPhase: 0.0 at beat start, 1.0 at next beat
  const intensity = Math.max(0, 1 - beatPhase * 4); // sharp attack, quick decay
  const brightness = Math.floor(26 + intensity * 30);
  ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness + 20})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// Note explosion on perfect hit
function spawnHitEffect(x, y, judgment) {
  const colors = {
    perfect: '#FFD700',  // gold
    great:   '#00FF88',  // green
    good:    '#4488FF',  // blue
    bad:     '#888888'   // gray
  };
  // Particle burst with size proportional to judgment quality
  const particleCount = judgment === 'perfect' ? 20 : judgment === 'great' ? 12 : 6;
  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.5) * 8,
      life: 1.0,
      color: colors[judgment],
      size: judgment === 'perfect' ? 6 : 4
    });
  }
}
```

**Combo Fire**

When the player maintains a high combo, escalate visual intensity:

- Combo 10+: subtle glow around hit zone
- Combo 25+: particle trails on notes
- Combo 50+: screen border glow, background animation intensifies
- Combo 100+: full-screen color shift, maximum visual excitement

### Song Selection and Progression

**Unlock Structure**

- Start with 3-5 songs available on Easy difficulty
- Completing a song on any difficulty unlocks the next song
- Achieving grade A or above on a difficulty unlocks the next difficulty for that song
- Hidden/bonus songs unlock when the player achieves certain milestones (all A's, specific high scores)

**Song Sorting**

Provide multiple sort options: by difficulty rating, by BPM, alphabetical, by
date added, by best score. Players use BPM and difficulty rating most.

### Practice Mode Design

A good practice mode is essential for player growth:

1. **Section looping**: select a portion of the song to repeat
2. **Speed control**: play at 50%, 75%, or 100% speed (pitch-corrected)
3. **Auto-play**: watch the perfect playthrough to study patterns
4. **No-fail**: disable the health bar to practice the whole song
5. **Note guides**: show timing windows on screen, display early/late indicators

### Anti-patterns (Common Mistakes)

**Input Lag** -- The single most destructive flaw. If inputs feel even 30ms laggy,
the game is ruined. Test on multiple devices. Use Web Audio scheduling, not setTimeout.

**Poor Audio Sync** -- Notes drifting from the beat over time, usually caused by using
`Date.now()` or `performance.now()` for audio timing instead of `audioContext.currentTime`.
These clocks can drift relative to each other.

**Clock Drift Accumulation** -- Over a 3-minute song, even 0.1ms-per-frame drift
accumulates to 1.08 seconds of error (at 60fps). Always derive current song position
from `audioContext.currentTime`, never from an incrementing counter.

**Overwhelming Visuals** -- Excessive particles, screen shake, or background effects
that make it hard to READ the notes. Gameplay clarity must always win over flashiness.
If the player cannot see the notes, they cannot play.

**Inconsistent Note Speed** -- Notes should scroll at a constant, predictable rate.
Sudden speed changes (unless explicitly designed as a mechanic like in DDR's "speed mods")
feel unfair.

**Charts That Ignore the Music** -- The number-one complaint about bad custom charts.
Notes should correspond to audible sounds in the music -- drum hits, melody notes,
bass plucks. Notes placed at arbitrary times feel random and frustrating.

---

## Tech Stack

<!-- TECH: {"id": "tone", "role": "audio", "recommended": true} -->
<!-- TECH: {"id": "howler", "role": "audio", "alternative": true} -->

### Rendering

**Canvas 2D** is the standard choice for rhythm games. Note lanes, scrolling notes,
hit effects, and combo displays are all efficiently rendered with Canvas 2D.
WebGL is overkill unless the game has 3D elements or extreme particle counts.

### Audio

**Tone.js** (CDN: jsDelivr, version 14.x) is the recommended library for rhythm
games that synthesize their own music. It provides:
- Precise scheduling on top of Web Audio API
- Synthesizers (MonoSynth, PolySynth, FMSynth, etc.)
- Effects chain (reverb, delay, distortion, filter)
- Transport for BPM-locked scheduling

**Howler.js** (CDN: jsDelivr, version 2.2.x) is the alternative for games that play
pre-recorded audio files. It provides:
- Cross-browser audio playback
- Sprite support (multiple sounds in one file)
- Spatial audio
- Less precise timing than Tone.js for synthesis

**Web Audio API** (native, no library) is essential to understand even when using
Tone.js, because:
- `AudioContext.currentTime` is the master clock for ALL timing
- Latency compensation requires direct access to `baseLatency` and `outputLatency`
- Custom hit sounds are often simplest with raw oscillators and gain nodes

### Timing Architecture

```
                +-------------------+
                | AudioContext clock |  <-- Master timing authority
                +--------+----------+
                         |
          +--------------+--------------+
          |                             |
  +-------v--------+          +--------v-------+
  | Audio Scheduler |          | Visual Renderer |
  | (setInterval    |          | (rAF loop)      |
  |  25ms lookahead)|          |                 |
  +----------------+          +--------+--------+
                                       |
                              +--------v--------+
                              | Note Position =  |
                              | f(audioCtx.time, |
                              |   note.time,     |
                              |   scrollSpeed)   |
                              +-----------------+
```

The audio scheduler and visual renderer run on independent loops but share the same
`AudioContext.currentTime` reference. This ensures they stay in sync even if
`requestAnimationFrame` drops frames.

### requestAnimationFrame vs AudioContext Time

```javascript
// WRONG: accumulating dt leads to drift
let songTime = 0;
function loop(timestamp) {
  const dt = timestamp - lastTimestamp;
  songTime += dt;  // DRIFTS over time!
  // ...
}

// RIGHT: derive song position from AudioContext every frame
function loop() {
  const songTime = (audioCtx.currentTime - songStartTime) * 1000;
  // songTime is always accurate, never drifts
  // ...
}
```

---

## Level Design Templates

### Beat Map Creation Process

**Manual Charting Workflow**

1. Listen to the song 2-3 times, noting structure (intro, verse, chorus, etc.)
2. Determine BPM (tap along, use a BPM counter tool, or detect programmatically)
3. Identify the audio offset (time from file start to first downbeat)
4. Chart the Easy difficulty first, placing notes only on the main beats of the
   most prominent instrument (usually kick drum or bass)
5. Chart Normal by adding off-beat notes on hi-hats and snares
6. Chart Hard by adding melody-following notes and syncopation
7. Chart Expert by representing nearly every audible sound
8. Playtest each difficulty. If a section feels awkward, the chart is wrong, not
   the player. Adjust.

### Difficulty Scaling by Notes Per Second

| Difficulty | NPS Range | Subdivision | Typical Patterns |
|-----------|-----------|-------------|-----------------|
| Easy | 1-2 | Quarter notes | Single notes on beats 1 and 3 |
| Normal | 2-4 | Eighth notes | Notes on every beat, some off-beats |
| Hard | 4-8 | Sixteenth notes | Runs, doubles, basic crossovers |
| Expert | 8-16+ | Mixed, 32nd bursts | Streams, jacks, polyrhythm, tech |

### Song Structure Mapping

Map chart intensity to song energy:

```
Intro (4-8 bars):     Sparse. Establish the beat. Let the player lock in.
Verse 1 (8-16 bars):  Moderate density. Follow the vocal or lead melody.
Pre-chorus (4 bars):  Building. Increase note density gradually.
Chorus 1 (8-16 bars): Full density. This is the musical and gameplay peak.
Verse 2 (8-16 bars):  Slightly harder than Verse 1 (add holds or doubles).
Chorus 2 (8-16 bars): Same as Chorus 1 but with added variation.
Bridge (8 bars):      Drop to low density. Different note types or patterns.
Final Chorus (8-16):  Maximum intensity. Everything the player has learned.
Outro (4-8 bars):     Wind down. Sparse notes resolving to silence.
```

### Procedural Beat Map Generation

For games that generate beat maps from audio analysis at runtime:

```javascript
function generateBeatMap(onsets, bpm, difficulty) {
  const beatInterval = 60000 / bpm;
  const notes = [];

  // Quantize onsets to the nearest beat subdivision
  const subdivisionMs = beatInterval / (difficulty === 'easy' ? 1 :
                                         difficulty === 'normal' ? 2 :
                                         difficulty === 'hard' ? 4 : 8);

  for (const onset of onsets) {
    const quantized = Math.round(onset / subdivisionMs) * subdivisionMs;

    // Avoid duplicate notes at the same quantized time
    if (notes.length > 0 && Math.abs(notes[notes.length - 1].time - quantized) < 10) {
      continue;
    }

    // Assign lanes based on frequency content of the onset
    // Low frequency (kick) -> lane 0-1, High frequency (hi-hat) -> lane 2-3
    const lane = Math.floor(Math.random() * 4); // simplified; use spectral info

    notes.push({ time: quantized, lane, type: 'tap' });
  }

  // Thin notes for lower difficulties
  if (difficulty === 'easy') {
    return notes.filter((_, i) => i % 4 === 0);
  }
  if (difficulty === 'normal') {
    return notes.filter((_, i) => i % 2 === 0);
  }
  return notes;
}
```

---

## Visual Reference

### Layout Types

**Lane-Based (Vertical Scroll)** -- Guitar Hero, DDR, Friday Night Funkin'
```
     [Lane 0] [Lane 1] [Lane 2] [Lane 3]
        |        |        |        |
        |        O        |        |     ← note scrolling down
        |        |        O        |
        O        |        |        |
        |        |        |        O
     ───+────────+────────+────────+───  ← hit line (judgment zone)
     [ D ]    [ F ]    [ J ]    [ K ]    ← input keys
```

**Lane-Based (Horizontal Scroll)** -- Taiko no Tatsujin
```
                ───O────O─────O──O───>
     [Hit Zone]                           direction of scroll
                ───O──────O───O──────>
```

**Circular** -- Cytus II, OSU! (mania mode variant)
```
           *   *
        *         *
       *     O     *     ← notes appear and must be hit when
       *   / | \   *       the approach indicator matches
        * /  |  \ *
           * * *
```

**Freeform** -- OSU!, Theatrhythm
```
     Notes appear anywhere on screen. Player must click/tap them
     when the approach circle shrinks to match the note circle.

          ╭─────╮
          │  O  │ ← approach circle shrinking
          ╰─────╯
              O   ← target circle
```

### Note Shapes and Colors

| Note Type | Shape | Color Suggestion |
|-----------|-------|-----------------|
| Tap (Lane 0) | Circle or square | Red / #FF4444 |
| Tap (Lane 1) | Circle or square | Blue / #4488FF |
| Tap (Lane 2) | Circle or square | Green / #44FF88 |
| Tap (Lane 3) | Circle or square | Yellow / #FFDD44 |
| Hold start | Filled circle with line | Same as lane color |
| Hold body | Translucent rectangle | Lane color at 30% alpha |
| Hold end | Circle outline | Lane color |
| Slide/Flick | Arrow shape | White / #FFFFFF |
| Simultaneous | Connected by a line | Both lane colors |

### Hit Feedback Effects

```javascript
// Perfect hit: golden expanding ring + particles
function drawPerfectHit(ctx, x, y, age) {
  const radius = 20 + age * 100;
  const alpha = Math.max(0, 1 - age);
  ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`;
  ctx.lineWidth = 3;
  ctx.shadowColor = '#FFD700';
  ctx.shadowBlur = 15;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;
}

// Miss: red X that fades
function drawMiss(ctx, x, y, age) {
  const alpha = Math.max(0, 1 - age * 2);
  const size = 15;
  ctx.strokeStyle = `rgba(255, 50, 50, ${alpha})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - size, y - size);
  ctx.lineTo(x + size, y + size);
  ctx.moveTo(x + size, y - size);
  ctx.lineTo(x - size, y + size);
  ctx.stroke();
}
```

### Background Visualizations

**Spectrum Analyzer**

```javascript
const analyser = audioCtx.createAnalyser();
analyser.fftSize = 256;
const bufferLength = analyser.frequencyBinCount;
const dataArray = new Uint8Array(bufferLength);

function drawSpectrum(ctx) {
  analyser.getByteFrequencyData(dataArray);
  const barWidth = canvas.width / bufferLength;

  for (let i = 0; i < bufferLength; i++) {
    const barHeight = (dataArray[i] / 255) * canvas.height * 0.3;
    const hue = (i / bufferLength) * 120 + 200; // blue to purple
    ctx.fillStyle = `hsla(${hue}, 80%, 50%, 0.15)`;
    ctx.fillRect(i * barWidth, canvas.height - barHeight, barWidth - 1, barHeight);
  }
}
```

**Beat-Reactive Particles**

```javascript
function spawnBeatParticles(beatStrength) {
  const count = Math.floor(beatStrength * 10);
  for (let i = 0; i < count; i++) {
    backgroundParticles.push({
      x: Math.random() * canvas.width,
      y: canvas.height,
      vx: (Math.random() - 0.5) * 3,
      vy: -2 - Math.random() * beatStrength * 5,
      life: 1.0,
      size: 2 + Math.random() * 3,
      hue: Math.random() * 60 + 200 // blue to purple
    });
  }
}
```

### HUD Layout

```
+--------------------------------------------------+
| COMBO: 47           SCORE: 12,450    GRADE: A    |
|                                                    |
|  Accuracy: 94.2%          [|||||||||||---] HP      |
|                                                    |
|     [Lane 0] [Lane 1] [Lane 2] [Lane 3]          |
|        |        |        |        |                |
|        |        O        |        |                |
|        |        |        O        |                |
|        O        |        |        |                |
|        |        |        |        O                |
|     ───+────────+────────+────────+───             |
|     [ D ]    [ F ]    [ J ]    [ K ]              |
|                                                    |
|  "PERFECT!"                    BPM: 140           |
+--------------------------------------------------+
```

![Reference](images/rhythm-music-reference.png)

---

## Audio Design

### Audio Is THE Core Mechanic

In every other game genre, audio enhances the experience. In rhythm games, audio IS
the experience. This has profound implications:

1. **Audio must play first.** In the loading sequence, the audio system must be fully
   initialized before the first frame renders. A visual glitch is tolerable; an audio
   glitch ruins the entire song.
2. **Audio must never skip, stutter, or pop.** Use Web Audio API scheduling (not
   HTML5 `<audio>` elements) for precise, buffer-based playback.
3. **Audio drives the game clock.** The visual renderer reads from the audio clock,
   not the other way around.

### Low-Latency Playback Requirements

**Target Latencies**

| Component | Maximum Acceptable | Notes |
|-----------|-------------------|-------|
| Audio output | 20ms | `audioContext.baseLatency` + `outputLatency` |
| Input-to-judgment | 1 frame (16ms) | Process input in same rAF frame |
| Visual update | 1 frame (16ms) | Notes must never visually stutter |
| End-to-end feel | <50ms | Player presses key, hears/sees response |

**Achieving Low Latency in Web Audio**

```javascript
// Request lowest possible buffer size
const audioCtx = new AudioContext({
  latencyHint: 'interactive',  // tells browser we need low latency
  sampleRate: 44100
});

// Check what we actually got
console.log('Base latency:', audioCtx.baseLatency * 1000, 'ms');
console.log('Output latency:', (audioCtx.outputLatency || 0) * 1000, 'ms');
// Typical: 5-15ms base + 5-15ms output = 10-30ms total
```

### Hit Sounds

Hit sounds must COMPLEMENT the music, not clash with it. Guidelines:

- **Pitch**: Use sounds that are harmonically neutral (clicks, pops) or tuned to the
  song's key. A perfect-hit chime in C major sounds terrible over a song in F# minor.
- **Duration**: Keep hit sounds SHORT (50-100ms). Long hit sounds overlap and create
  mud.
- **Volume**: Hit sounds should be audible but not louder than the music. Mix at
  approximately -12dB relative to the song master.
- **Variety**: Different sounds for different judgments. Perfect hits get a bright,
  satisfying click. Misses get a dull thud or no sound at all.

```javascript
// Harmonically neutral hit sound (pitched noise burst)
function playNeutralHit(when) {
  const bufferSize = audioCtx.sampleRate * 0.05; // 50ms
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    const t = i / bufferSize;
    data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 30); // noise with fast decay
  }

  const source = audioCtx.createBufferSource();
  source.buffer = buffer;

  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 2000;
  filter.Q.value = 2;

  const gain = audioCtx.createGain();
  gain.gain.value = 0.15;

  source.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  source.start(when);
}
```

### Music Sourcing Considerations

For OpenArcade games that must be self-contained in a single HTML file:

| Source | Pros | Cons |
|--------|------|------|
| **Procedural (Tone.js)** | No assets, infinitely variable, always royalty-free | Sounds synthetic, hard to make "real" music |
| **Built-in base64** | Can embed short loops, sounds authentic | Inflates file size, limited duration |
| **Web Audio synthesis** | No dependencies, very small | Even more synthetic than Tone.js |
| **External CDN audio** | Full songs possible | Requires network, copyright concerns, cross-origin issues |

**Recommended approach for OpenArcade**: Use Tone.js to procedurally generate a
backing track with kick, snare, hi-hat, bass, and lead synth. This gives enough
musical structure for rhythm gameplay while staying fully self-contained.

### Audio Sprite Sheets

For games with many short sound effects, use audio sprite sheets:

```javascript
// Load one audio file containing all SFX
const spriteBuffer = await loadAudioBuffer('sfx-sprite.mp3');

// Define regions within the sprite
const sprites = {
  perfectHit: { start: 0.0,  duration: 0.1 },
  greatHit:   { start: 0.15, duration: 0.08 },
  missSound:  { start: 0.3,  duration: 0.12 },
  comboBreak: { start: 0.5,  duration: 0.2 },
  levelUp:    { start: 0.8,  duration: 0.5 }
};

function playSpriteSound(name, when) {
  const sprite = sprites[name];
  const source = audioCtx.createBufferSource();
  source.buffer = spriteBuffer;
  source.connect(audioCtx.destination);
  source.start(when || 0, sprite.start, sprite.duration);
}
```

---

## Multiplayer Considerations

### Battle Mode (Accuracy Competition)

Two players play the same song simultaneously. The player with higher accuracy wins.

**Implementation**:
- Both players see the same beat map
- Split screen or side-by-side lanes
- Real-time score comparison bar (tug-of-war style)
- Missed notes can send "attack notes" to the opponent (extra notes, speed changes, lane swaps)

**For local (same keyboard)**:
Player 1 uses D/F/J/K, Player 2 uses arrow keys. Both play the same song.

### Co-op Mode

Players play different parts of the same song. One player handles drums, another
handles melody. Success requires both players to maintain accuracy.

**Implementation**:
- Different beat maps for each player derived from different instrument stems
- Shared health bar that drains when either player misses
- Visual connection between the two playfields (shared background effects)

### Async Competition

- **Leaderboards**: high scores per song, per difficulty
- **Ghost replay**: see a translucent replay of the top scorer's inputs while you play
- **Weekly challenges**: specific songs with specific modifiers (no-miss, double speed, mirror)

### Network Sync Challenges

Real-time rhythm multiplayer over a network is extremely difficult because:

- Even 50ms of network jitter exceeds the Perfect timing window
- Players cannot share an audio clock across the network
- Solutions: separate audio instances with leaderboard comparison (async), or
  lockstep with generous timing windows

For OpenArcade, **local multiplayer or async leaderboards** are strongly recommended
over real-time networked play.

---

## Generation Checklist

### Blocking (Must Be Decided Before Code Generation)

| Decision | Options | Impact |
|----------|---------|--------|
| **Input type** | Keyboard lanes (D/F/J/K), Arrow keys, Mouse tap, Full keyboard | Determines event handling, note layout, and lane count |
| **Layout** | Vertical scroll, Horizontal scroll, Circular, Freeform | Determines canvas layout, note rendering math, and visual design |
| **Music source** | Procedural (Tone.js), Built-in (base64), User-provided (file input) | Determines audio architecture, file size, and beat map source |
| **Scoring system** | Accuracy-only, Accuracy + combo, Health bar, Time-based | Determines game over conditions and HUD design |

### Defaultable (Sensible Defaults If Not Specified)

| Parameter | Default | Rationale |
|-----------|---------|-----------|
| Number of lanes | 4 | Matches DFJK keyboard layout, standard for most rhythm games |
| Timing window (Perfect) | +/- 25ms | Achievable for intermediate players |
| Timing window (Great) | +/- 55ms | Comfortable for casual players |
| Timing window (Good) | +/- 90ms | Catches most intentional inputs |
| BPM | 120 | Standard pop tempo, comfortable starting speed |
| Note scroll speed | 400px/sec | Notes visible for ~1.5 seconds before reaching hit line |
| Note types | Tap + Hold | Minimal viable variety without overwhelming new players |
| Difficulty levels | Easy / Normal / Hard | Three is sufficient; Expert can be added later |
| Grade thresholds | S:98%, A:93%, B:85%, C:70%, D:50% | Standard rhythm game distribution |
| Combo multiplier cap | 4x at 100 combo | Rewards consistency without making it mandatory |
| Health bar | Start 50%, drain on miss, refill on hit | Allows mid-song game over without being too punishing |
| Songs | 1 procedural song | Minimum viable product; add more in iteration |

---

## From Design to Code

This section maps each of the game design guide sections (Sections 1-9) to the
specific concerns of rhythm/music games.

### Section 1: Core Concept

Define the rhythm game's identity:
- What is the player's relationship to the music? (Performer, dancer, fighter, creator)
- Is this pure rhythm (Guitar Hero) or rhythm-hybrid (NecroDancer)?
- What is the aesthetic? (Neon club, retro arcade, cute cartoon, dark cyber)
- One-sentence pitch should mention the musical element explicitly:
  "A neon beat-matching game where you fight enemies by hitting notes on the beat."

### Section 2: Core Mechanics

**Critical for rhythm games**: the core mechanic is TIMING, not just action.

- **Input mapping**: which keys/buttons correspond to which lanes
- **Timing judgment**: define the exact ms windows for each grade
- **Note types**: which types are in scope (tap, hold, slide, etc.)
- **Combo system**: how consecutive hits multiply score
- **Fail condition**: health drain, or play-to-end with grade?

```javascript
// Skeleton: Core mechanics setup
const LANES = 4;
const KEYS = ['d', 'f', 'j', 'k'];  // or ArrowLeft/Down/Up/Right
const TIMING = {
  perfect: 25,  // +/- ms
  great: 55,
  good: 90
};
```

### Section 3: Progression and Difficulty

Rhythm game progression is song-centric:
- Difficulty levels per song (not global difficulty)
- Song unlock progression (complete songs to unlock new ones)
- Star/grade collection as meta-progression
- Session length = one song (typically 1.5-4 minutes)
- Difficulty within a song follows the musical structure (see Flow State Design above)

### Section 4: Tech Requirements

| Requirement | Rhythm Game Specifics |
|-------------|----------------------|
| Rendering | Canvas 2D (scrolling notes, hit effects, combo display) |
| Physics | None (rhythm games have no physics simulation) |
| Audio | **CRITICAL** -- Web Audio API required. Tone.js recommended for procedural music. |
| AI/NPC | None typically, unless rhythm-action hybrid has enemies |
| Turn structure | Real-time, continuous (beat-locked) |

### Section 5: Tech Stack Selection

```
Rendering:   Canvas 2D (vanilla)
Physics:     None
Audio:       Tone.js 14.x (CDN) + Web Audio API for hit sounds
Multiplayer: None (or local same-keyboard for battle mode)
```

Tone.js CDN tag:
```html
<script src="https://cdn.jsdelivr.net/npm/tone@14/build/Tone.min.js"></script>
```

Fallback pattern:
```javascript
if (typeof Tone === 'undefined') {
  document.body.innerHTML = '<p style="color:red;text-align:center;margin-top:40vh;">' +
    'Failed to load Tone.js. Check your internet connection and refresh.</p>';
}
```

### Section 6: Visual Design

Rhythm games demand high visual clarity on the note highway. Key decisions:

- **Note lane width**: 50-80px per lane (wider = easier to read)
- **Hit line position**: 80-90% down from top for downward scroll (gives more preview time)
- **Note preview time**: 1.0-2.0 seconds (time from note appearing to reaching hit line)
- **Color coding**: each lane has a distinct color; judgment quality has distinct effects
- **Background**: dark, non-distracting. Beat-reactive elements stay behind the note area.

```javascript
// Visual constants
const LANE_WIDTH = 60;
const HIT_LINE_Y = canvas.height - 80;
const NOTE_PREVIEW_TIME = 1500;  // ms -- how far ahead notes are visible
const NOTE_SPEED = (HIT_LINE_Y - 50) / NOTE_PREVIEW_TIME;  // px per ms

const LANE_COLORS = ['#FF4444', '#4488FF', '#44FF88', '#FFDD44'];
const LANE_X_START = (canvas.width - LANE_WIDTH * LANES) / 2; // centered
```

### Section 7: World and Level Design

In rhythm games, "levels" are songs. The "world" is the song selection screen.

- Each song is a self-contained level with a fixed duration
- No scrolling world or procedural generation of space (the beat map IS the level)
- Difficulty curve is internal to each song, following musical structure
- For procedural games: the music generation IS the level generation

### Section 8: Onboarding and Tutorial

**First 30 seconds of a rhythm game**:

1. Song starts with a 4-beat count-in (visual: "3... 2... 1... GO!")
2. First 8 bars have sparse notes, only taps, on the main beats
3. Visual indicators show which keys to press (key labels on the hit line)
4. First timing judgment is extra-forgiving (+/- 120ms for "good")
5. After 8 bars, tighten to normal windows and introduce hold notes
6. Positive reinforcement: big "PERFECT!" text, satisfying sounds

**Critical**: The count-in establishes the beat BEFORE the player must act. This is
non-negotiable. Without a count-in, the first few notes are always missed.

```javascript
// Count-in implementation
function startSongWithCountIn() {
  const countInBeats = 4;
  const beatMs = 60000 / bpm;

  for (let i = 0; i < countInBeats; i++) {
    const when = songStartTime + (i * beatMs) / 1000;
    scheduleCountInSound(when);
    scheduleCountInVisual(i + 1, when);
  }

  // Actual song starts after the count-in
  const musicStart = songStartTime + (countInBeats * beatMs) / 1000;
  songSource.start(musicStart);
}
```

### Section 9: Audio Design

This is the most important section for rhythm games, and where most implementations
fail.

**Audio Architecture Diagram**

```
  Tone.js Transport (BPM-locked scheduling)
       |
       +---> Kick Synth ----+
       +---> Snare Synth ---+
       +---> Hi-Hat Synth --+--> Master Gain --> Compressor --> audioCtx.destination
       +---> Bass Synth ----+                                        |
       +---> Lead Synth ----+                                        |
       +---> Pad Synth -----+                         audioCtx.currentTime
                                                     (master clock for all timing)
  Hit Sounds (raw Web Audio API)
       |
       +---> Perfect chime --+--> Hit Sound Gain --> audioCtx.destination
       +---> Miss thud ------+
       +---> Combo break ----+
```

**SFX Categories for Rhythm Games**

| Sound | Trigger | Character |
|-------|---------|-----------|
| Perfect hit | Player hits within perfect window | Bright, short, satisfying click/chime |
| Great hit | Player hits within great window | Softer click, slightly lower pitch |
| Good hit | Player hits within good window | Muted tap |
| Miss | Note passes hit line without input | Dull thud or silence |
| Combo milestone | Combo reaches 10, 25, 50, 100 | Rising chime, increasing excitement |
| Combo break | Combo resets to 0 | Glass break or low buzz |
| Song complete | Last note of the song | Flourish, ascending arpeggio |
| New high score | Score exceeds personal best | Fanfare |
| Grade reveal | S/A/B/C/D displayed | Different sound per grade |

**Procedural Music Generation Pattern (Tone.js)**

```javascript
// Minimal but musical procedural backing track
const synth = new Tone.PolySynth().toDestination();
const kick = new Tone.MembraneSynth().toDestination();
const hihat = new Tone.NoiseSynth({ envelope: { decay: 0.05, sustain: 0 } }).toDestination();

// Kick on beats 1 and 3
const kickPart = new Tone.Sequence((time) => {
  kick.triggerAttackRelease('C1', '8n', time);
}, [0, null, 0, null], '4n');

// Hi-hat on every eighth note
const hihatPart = new Tone.Sequence((time) => {
  hihat.triggerAttackRelease('16n', time);
}, [0, 0, 0, 0, 0, 0, 0, 0], '8n');

// Bass line (minor key, 4-bar loop)
const bassNotes = ['C2', 'C2', 'Eb2', 'Eb2', 'F2', 'F2', 'G2', 'G2'];
const bassPart = new Tone.Sequence((time, note) => {
  synth.triggerAttackRelease(note, '4n', time);
}, bassNotes, '4n');

Tone.Transport.bpm.value = 120;
Tone.Transport.start();
kickPart.start(0);
hihatPart.start(0);
bassPart.start(0);
```

---

## Game Loop Architecture

The game loop for a rhythm game has a different structure than typical action games
because the audio clock, not the frame clock, is the source of truth.

```javascript
// Master game loop for a rhythm game
function gameLoop() {
  if (gameState !== 'playing') return;

  // 1. Get current song time from audio clock (NEVER from accumulated dt)
  const now = audioCtx.currentTime;
  const songTimeMs = (now - songStartTime) * 1000;

  // 2. Process input queue (inputs buffered since last frame)
  while (inputQueue.length > 0) {
    const input = inputQueue.shift();
    processInput(input, songTimeMs);
  }

  // 3. Check for missed notes (notes that passed the hit window without input)
  checkMissedNotes(songTimeMs);

  // 4. Update visual positions (notes scroll based on songTimeMs)
  updateNotePositions(songTimeMs);

  // 5. Update effects and animations
  updateParticles();
  updateJudgmentText();
  updateComboDisplay();

  // 6. Draw everything
  draw(songTimeMs);

  // 7. Check for song end
  if (songTimeMs >= songDurationMs) {
    showResults();
    return;
  }

  requestAnimationFrame(gameLoop);
}

// Input is buffered with timestamps, not processed in the event handler
document.addEventListener('keydown', (e) => {
  if (gameState !== 'playing') return;
  const key = e.key.toLowerCase();
  const laneIndex = KEYS.indexOf(key);
  if (laneIndex === -1) return;

  e.preventDefault();
  inputQueue.push({
    lane: laneIndex,
    time: audioCtx.currentTime,
    songTimeMs: (audioCtx.currentTime - songStartTime) * 1000
  });
});
```

### Note Position Calculation

```javascript
function getNoteY(noteTimeMs, currentSongTimeMs) {
  // How far in the future is this note (in ms)?
  const timeDelta = noteTimeMs - currentSongTimeMs;

  // Convert time to screen position
  // At timeDelta = NOTE_PREVIEW_TIME, note is at the top spawn line
  // At timeDelta = 0, note is at the hit line
  // At timeDelta < 0, note has passed the hit line (missed or hit)
  const progress = 1 - (timeDelta / NOTE_PREVIEW_TIME);
  return SPAWN_Y + progress * (HIT_LINE_Y - SPAWN_Y);
}
```

### Note Matching Algorithm

When the player presses a key, find the best matching note in that lane:

```javascript
function processInput(input, currentSongTimeMs) {
  const { lane, songTimeMs } = input;

  // Find the closest unhit note in this lane within the maximum timing window
  let bestNote = null;
  let bestDelta = Infinity;

  for (const note of beatMap.notes) {
    if (note.hit || note.missed || note.lane !== lane) continue;

    const delta = Math.abs(songTimeMs - note.time);
    if (delta > TIMING.good + 30) continue; // outside any window

    if (delta < bestDelta) {
      bestDelta = delta;
      bestNote = note;
    }
  }

  if (!bestNote) return; // no matching note

  const delta = songTimeMs - bestNote.time;
  const absDelta = Math.abs(delta);

  let judgment;
  if (absDelta <= TIMING.perfect) judgment = 'perfect';
  else if (absDelta <= TIMING.great) judgment = 'great';
  else if (absDelta <= TIMING.good) judgment = 'good';
  else return; // too far off

  bestNote.hit = true;
  bestNote.judgment = judgment;

  applyScore(judgment);
  applyCombo(judgment);
  applyHealth(judgment);
  spawnHitEffect(bestNote.lane, judgment);
  playHitSound(judgment, audioCtx.currentTime);
}
```

---

## Performance Considerations

### Object Pooling for Notes and Particles

Rhythm games create and destroy hundreds of objects per song. Garbage collection
pauses cause visible stuttering and can break the illusion of audio sync.

```javascript
// Pre-allocate particle pool
const MAX_PARTICLES = 200;
const particlePool = Array.from({ length: MAX_PARTICLES }, () => ({
  active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, color: '', size: 0
}));

function spawnParticle(x, y, vx, vy, color, size) {
  const p = particlePool.find(p => !p.active);
  if (!p) return; // pool exhausted
  p.active = true;
  p.x = x; p.y = y; p.vx = vx; p.vy = vy;
  p.color = color; p.size = size; p.life = 1.0;
}
```

### Canvas Rendering Optimization

- **Only redraw what changed**: track dirty rectangles for note lanes
- **Use `ctx.save()`/`ctx.restore()` sparingly**: they allocate state objects
- **Batch similar draws**: draw all notes of the same color in one pass
- **Pre-render static elements**: lane lines, hit line, key labels can be on a
  cached offscreen canvas

### Audio Performance

- **Limit concurrent sounds**: no more than 8-10 simultaneous audio sources
- **Reuse AudioBuffers**: create hit sound buffers once, reuse the buffer with
  new BufferSourceNodes
- **Disconnect nodes after use**: orphaned audio nodes leak memory

```javascript
// Reusable hit sound pattern
let hitSoundBuffer = null;

async function initHitSound() {
  // Create buffer once
  const length = audioCtx.sampleRate * 0.08;
  hitSoundBuffer = audioCtx.createBuffer(1, length, audioCtx.sampleRate);
  const data = hitSoundBuffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.sin(880 * 2 * Math.PI * i / audioCtx.sampleRate) *
              Math.exp(-i / (length * 0.2));
  }
}

function playHit(when) {
  const source = audioCtx.createBufferSource();
  source.buffer = hitSoundBuffer;  // reuse same buffer
  source.connect(audioCtx.destination);
  source.start(when);
  // source auto-disconnects after playback ends
}
```

---

## Testing and Debugging

### Rhythm Game Specific Tests

1. **Timing accuracy test**: tap along to a metronome, verify judgment distribution
   matches expected human variance
2. **Drift test**: play a 3-minute song, verify last note is still in sync
   (no accumulated timing error)
3. **Latency test**: record audio output and keyboard input simultaneously,
   verify round-trip latency is under 50ms
4. **Frame drop test**: artificially throttle to 30fps, verify timing judgments
   are still accurate (they should be, since they use audioCtx time, not frame count)
5. **Tab focus test**: switch away and back during a song, verify game pauses
   cleanly and resumes in sync

### Debug Overlay

```javascript
// Optional debug display for development
function drawDebugInfo(ctx, songTimeMs) {
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, 250, 120);
  ctx.fillStyle = '#0f0';
  ctx.font = '12px monospace';
  ctx.fillText(`Song time: ${songTimeMs.toFixed(1)}ms`, 10, 20);
  ctx.fillText(`Audio latency: ${getAudioLatencyMs().toFixed(1)}ms`, 10, 35);
  ctx.fillText(`Notes remaining: ${beatMap.notes.filter(n => !n.hit && !n.missed).length}`, 10, 50);
  ctx.fillText(`Combo: ${combo} / Max: ${maxCombo}`, 10, 65);
  ctx.fillText(`FPS: ${currentFps}`, 10, 80);
  ctx.fillText(`Input offset: ${inputOffset.toFixed(1)}ms`, 10, 95);
  ctx.fillText(`Last judgment: ${lastJudgment} (${lastDelta.toFixed(1)}ms)`, 10, 110);
}
```

---

## Common Chart Formats

### JSON (Web-Native)

The simplest format for browser-based rhythm games:

```json
{
  "song": "example",
  "artist": "OpenArcade",
  "bpm": 120,
  "offset": 0,
  "difficulty": "normal",
  "notes": [
    {"t": 0, "l": 1, "type": "tap"},
    {"t": 500, "l": 2, "type": "tap"},
    {"t": 1000, "l": 0, "type": "hold", "dur": 500}
  ]
}
```

### StepMania / SM Format (Reference)

The .sm format uses measure-based notation. Each measure is divided into equal rows:

```
// 4 rows per measure = quarter notes
// 8 rows = eighth notes, 16 rows = sixteenth notes
// Digits: 0=empty, 1=tap, 2=hold start, 3=hold end, 4=roll
#NOTES:
     dance-single:
     :
     Challenge:
     10:
     :
0001
0100
1000
0010
,
1010
0101
1010
0101
;
```

Understanding this format helps when porting existing charts to a web-based JSON format.

---

## Accessibility Considerations

- **Color-blind mode**: use shapes (circle, square, triangle, diamond) in addition
  to colors for lane identification
- **Timing assist**: wider timing windows as an accessibility option
- **Visual-only mode**: for deaf/hard-of-hearing players, provide strong visual beat
  indicators (pulsing background, bouncing metronome)
- **One-hand mode**: map all 4 lanes to keys reachable with one hand (A/S/D/F or
  J/K/L/;)
- **Reduced motion**: option to disable particles and screen effects while keeping
  notes readable
