# Training Automation Handoff

Context document for connecting the Game Builder output to the Screen-Self-Driving training pipeline.

## What the Webhook Sends

When a game is generated, the game builder POSTs to `TRAINING_WEBHOOK_URL` (default: `http://localhost:8090/api/webhook/new-game`):

```json
{
  "event": "game_generated",
  "gameId": "neon-striker-1234",
  "timestamp": "2026-02-20T12:00:00.000Z",
  "stack": {
    "rendering": "Canvas 2D",
    "physics": "none",
    "multiplayer": "none",
    "audio": "Web Audio API"
  },
  "urls": {
    "game": "/neon-striker-1234/index.html",
    "spec": "/neon-striker-1234/game.md",
    "chatLog": "/neon-striker-1234/chat.jsonl"
  }
}
```

## How recorder.js Captures Data

Each game includes `<script src="../recorder.js"></script>` which:

1. Captures canvas frames at 2fps as JPEG (quality 0.5)
2. Records keyboard/mouse events with timestamps
3. Bundles frames + events into chunks and POSTs to `/api/ingest/browser`
4. Ingest payload: `{ game, collector_id, frames: [{ts, jpeg_b64}], events: [{ts, type, key}] }`

Nginx at port 8099 proxies `/api/` to the ingest hub at port 8090.

## SSD Pipeline Architecture on Jetson

Two separate directories (critical distinction):

- **`/ssd/Screen-Self-Driving`** (mixed case) — Ingest hub service, receives gameplay data at port 8090
- **`/ssd/screen-self-driving`** (lowercase) — Training dashboard service, runs cloud_viewer.py at port 8091

### Current Data Flow

```
Player browser
  -> recorder.js (2fps JPEG + keyboard events)
  -> nginx :8099 /api/
  -> ingest hub :8090 /api/ingest/browser
  -> GCS bucket (raw gameplay data)
```

## What Needs to Be Built

### 1. Webhook Endpoint
Add a handler at `/api/webhook/new-game` in the ingest hub to:
- Receive the game_generated event
- Register the game for data collection
- Optionally trigger auto-play

### 2. Auto-Play Bot
A headless browser (Puppeteer) that:
- Opens the new game URL
- Plays randomly (random key presses) to generate initial training data
- Runs for N minutes then stops
- This bootstraps training data without waiting for human players

### 3. Data Preprocessing
Transform raw gameplay data into training format:
- Input: JPEG frames (224x224 or 84x84 grayscale)
- Labels: keyboard state at each frame
- Output: frame sequences with action labels for supervised learning

### 4. Training Integration
Connect preprocessed data to the SSD training pipeline:
- Model: vision model (CNN or ViT) that maps pixels to actions
- Training loop: supervised learning on (frame, action) pairs
- Inference: model predicts actions from live game frames

### Full Architecture

```
Game Builder (generates game)
  -> Webhook -> Ingest Hub (registers game)
  -> Auto-Play Bot (generates initial data)
  -> recorder.js (captures frames + inputs)
  -> Ingest Hub (stores raw data)
  -> Preprocessor (frame resize + action labels)
  -> Training Pipeline (CNN/ViT supervised learning)
  -> Inference Server (plays game from pixels)
```
