# Ricochet Replay/Share MVP (Issue #57)

This file documents the short-clip replay MVP implemented for `feat/issue-57-replay-share`.

## Goals

- Capture short gameplay sessions with a bounded in-memory buffer.
- Export/import replay payloads as JSON blobs.
- Replay playback with basic controls: **Play / Pause / Restart**.
- Preserve projectile events (paintball + rubber) and one-shot-style health/death changes.

## Files added/updated

- Added: `src/replay-system.ts`
- Updated:
  - `src/main.ts`
  - `src/bullet-system.ts`
  - `src/weapon-ak.ts`
  - `index.html`

## Replay payload

Recorded payload shape:

- `meta`
  - version, mode, arena, starter character, and created timestamp
- `states`
  - Bounded state samples (`local`, `remote`, and `match` snapshots)
- `events`
  - Time-ordered event list, including:
    - projectile shots (`paintball`, `rubber`)
    - health changes
    - respawns
    - phase/match state snapshots

### JSON flow

1. **Export**
   - During a live session, open the in-game Replay panel and click **Export**.
   - JSON is copied into the textarea for sharing/copying.

2. **Import**
   - Paste a replay JSON into textarea.
   - Click **Import Replay**.
   - Click **Play** to open replay mode and begin playback.

3. **Playback controls**
   - **Play**: start/restart timer
   - **Pause**: pause playback at current frame
   - **Restart**: rewind and replay from clip start

## Demo-safe scope details

- Recorder is bounded in-memory (time + entry limits) to keep clips lightweight.
- Replay mode uses locally stored payload and does not require a matchmaker or network session.
- Projectile event capture includes local and remote sources so projectile sequences survive share/export.
- One-shot compatibility is covered by health-state and death/respawn event capture.
