# MobClash MVP Gameplay Feel (Tonight Playable)

## Feel Goal (Tonight)
Create a board that feels **alive and readable in 30 seconds**: players should instantly notice that creatures are different, and lane decisions should matter without complex systems.

Design rule for tonight: **one signature per creature + one clear board rhythm**.

---

## 1) Creature Identities (3 MVP Creatures)

Use simple, visible differences first (silhouette, movement tempo, hit cadence), then balance numbers.

### A. Brute "Stonehorn"
**Fantasy:** Slow, heavy lane-breaker.

- **Role:** Frontline soak/pusher
- **Move Speed:** Slow (baseline x0.70)
- **HP:** High (baseline x1.80)
- **Attack Range:** Melee (very short)
- **Attack Cadence:** Slow, chunky swings (about 1.4s)
- **Feel Cues:** Loud footstep timing, slight camera shake on hit, long wind-up
- **Counter-read:** Vulnerable to kiting and ranged focus

**Player emotion:** "This thing is scary if it reaches me."

### B. Skitter "Needlefang"
**Fantasy:** Fast pressure unit that creates urgency.

- **Role:** Flanker/chip damage
- **Move Speed:** Fast (baseline x1.45)
- **HP:** Low (baseline x0.65)
- **Attack Range:** Melee (short)
- **Attack Cadence:** Quick bites (about 0.55s)
- **Feel Cues:** Sharp run cycle, high-pitch hit cue, little recoil
- **Counter-read:** Dies quickly if intercepted

**Player emotion:** "I can’t ignore this lane for even a few seconds."

### C. Spitter "Bog Wisp"
**Fantasy:** Mid-range control unit that shapes spacing.

- **Role:** Backline poke/zone pressure
- **Move Speed:** Medium-slow (baseline x0.90)
- **HP:** Medium-low (baseline x0.85)
- **Attack Range:** Mid (baseline x1.75 melee range)
- **Attack Cadence:** Steady volleys (about 1.0s)
- **Feel Cues:** Distinct projectile arc/color, brief aim pause before shot
- **Counter-read:** Weak when collapsed on by fast melee

**Player emotion:** "This unit changes where it is safe to stand/fight."

---

## 2) Board Pacing (MVP Match Flow)

Target a **3–5 minute prototype round** with clear tempo shifts.

### Phase 1 — Readability Opening (0:00–0:45)
- Spawn low count, one creature type at a time.
- Purpose: teach silhouettes and movement personalities.
- Desired feeling: calm setup, player learns lane language quickly.

### Phase 2 — Lane Tension (0:45–2:30)
- Begin mixed waves (Brute + Skitter or Brute + Spitter).
- Keep concurrency low enough that each creature identity still reads.
- Desired feeling: "Which lane do I solve first?"

### Phase 3 — Clash Moments (2:30–End)
- Short burst windows where two lanes spike together.
- Add a brief recovery gap after each spike (2–4s lower pressure).
- Desired feeling: repeated mini-peaks instead of one flat difficulty line.

---

## 3) Tonight Scope Lock (Do Not Overbuild)

1. **Only 3 creature types** above (no fourth archetype tonight).
2. **Only 3 tuned stats per creature required to ship tonight:**
   - Move Speed
   - HP
   - Attack Range/Cadence pair
3. **One board pacing script** (single wave table) is enough.
4. Placeholder VFX/SFX are acceptable if the three identities are readable.

---

## 4) Quick Balance Guardrails (for first playable)

- If board feels mushy/indistinct: widen speed gap first (not damage values).
- If early game overwhelms: reduce Skitter count before reducing all damage.
- If late game is boring: increase mixed-wave timing overlap, not total HP pools.
- If players ignore Spitter: increase projectile visibility before buffing stats.

---

## 5) MVP Success Checklist

A build is "feel-complete" tonight if:
- A new tester can name all 3 creature personalities after one round.
- At least one lane choice feels costly (solving A means risking B).
- The round has at least two noticeable tension peaks and relief valleys.
- Players report differences in **tempo** (not just "one has more HP").
