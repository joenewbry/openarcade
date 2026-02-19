# OpenArcade Memory

## Jetson Directory Paths (CRITICAL)
- **SSD Dashboard service** runs from `/ssd/screen-self-driving` (lowercase!) — set in systemd `WorkingDirectory`
- There's also `/ssd/Screen-Self-Driving` (mixed case) — this is a DIFFERENT directory
- Always deploy cloud_viewer.py to: `prometheus:/ssd/screen-self-driving/scripts/cloud_viewer.py`
- The SSD ingest hub runs from `/ssd/Screen-Self-Driving` (mixed case) — different service

## SSD Dashboard (cloud_viewer.py)
- Uses non-blocking cache (`cached_call`) with stale-while-revalidate
- First API call after restart returns defaults (empty arrays), data populates after ~15-30s of background GCS fetches
- Service: `ssd-dashboard`, port 8091, restart: `echo rising | sudo -S systemctl restart ssd-dashboard`
- Don't wrap `get_compute_timeline()` in its own cache — it depends on training data already being cached

## OpenArcade Recorder
- `recorder.js` captures canvas frames + keyboard events, uploads to `/api/ingest/browser`
- Nginx at port 8099 proxies `/api/` to ingest hub at port 8090
- All 7 games have `<script src="../recorder.js?v=2"></script>`
- Cache-busting: use `?v=N` on script tags; nginx sends `no-cache` for JS/CSS/HTML

## Deployment
- **Deploy = commit and push** — the Jetson pulls from git, so pushing to main deploys the site
- No separate deploy step, rsync, or systemd restart needed for the static site

## Project Structure
- 7 games: tetris, flappy, snake, breakout, space-invaders, pong, asteroids
- Each has `index.html` (clean) and `keypad.html` (with visualizer)
- Theme colors: tetris=#4f4, flappy=#ff0, snake=#0ff, breakout=#f80, space-invaders=#0f0, pong=#88f, asteroids=#f44

## Visual Design System
- `visual-design/*.md` is the per-game style guide — no separate style.md exists
- Each file has a `## Visual Style` section with **Style** + **Rationale**
- Style options: Neon Arcade, Pixel Art (NES), Pixel Art (16-bit), Vector/Wireframe, Retro CRT, Cartoon 2D, Clean Minimal, Tactical Grid
- Batch 1 assignments: tetris=Neon Arcade, snake=Neon Arcade, breakout=Retro CRT, flappy=Cartoon 2D, space-invaders=Retro CRT

## Level Design System
- `level-design/*.md` docs now contain actual level definitions (brick layouts, zone tables, etc.)
- Breakout: 5 layout patterns (simple fill, checkerboard, pyramid, diamond frame, fortress)
- Flappy: 4 score-based zones with discrete gap sizes (180→160→140→120px)
- Space Invaders: Extra lives at waves 3, 5, 7; scanline wipe during wave intro
