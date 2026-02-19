#!/usr/bin/env python3
"""
OpenArcade analytics collector.
Parses nginx access logs → writes page view records to SQLite.
Run via cron every 15 minutes on the Jetson.

Cron entry:
  */15 * * * * /usr/bin/python3 /ssd/openarcade/arcade-analytics/collect.py >> /tmp/arcade-collect.log 2>&1
"""

import re
import os
import json
import sqlite3
import hashlib
import time
from datetime import datetime, timezone

LOG_FILE = '/var/log/nginx/access.log'
STATE_FILE = os.path.join(os.path.dirname(__file__), 'collect.state')
DB_FILE = os.path.join(os.path.dirname(__file__), 'arcade.db')

# Match game page hits (e.g. GET /snake/ or GET /tetris/index.html)
# Exclude assets: .js .css .webp .mp4 etc.
GAME_RE = re.compile(
    r'^(\S+) - - \[([^\]]+)\] "GET /([a-z0-9_-]+)/(?:index\.html|keypad\.html|)? HTTP/\S+" (\d+)'
)

# Log format: ip - - [timestamp] "METHOD /path HTTP/x.x" status size "ref" "ua"
FULL_RE = re.compile(
    r'^(\S+) - \S+ \[([^\]]+)\] "(\w+) ([^\s"]+) HTTP/[^"]*" (\d+)'
)

# Games known to exist (subdirectories that are games, not infrastructure)
GAME_DIRS = {
    'tetris', 'snake', 'breakout', 'flappy', 'space-invaders', 'pong', 'asteroids',
    'pac-man', 'galaga', 'bubble-bobble', 'frogger', 'donkey-kong', 'centipede',
    'tempest', '1942', 'asteroids', 'battleship-evolved', 'bejeweled', 'battlezone',
    'bomberman', 'boulder-dash', 'canabalt', 'capture-the-flag', '2048', 'agar',
    'air-hockey', 'arkanoid', 'base-builder-blitz', 'battle-royale-2d', 'blokus',
    'boxing-ring', 'brick-breaker', 'browser-mmo-rpg', 'burger-time', 'centipede',
    'bike-trials-mp', 'advance-wars-online', 'auction-house', 'amidar',
}


def init_db(db):
    db.executescript("""
        CREATE TABLE IF NOT EXISTS page_views (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ts INTEGER NOT NULL,
            game TEXT NOT NULL,
            ip_hash TEXT NOT NULL,
            date TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_pv_date ON page_views(date);
        CREATE INDEX IF NOT EXISTS idx_pv_game ON page_views(game);

        CREATE TABLE IF NOT EXISTS ratings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ts INTEGER NOT NULL,
            game TEXT NOT NULL,
            stars INTEGER,
            category TEXT,
            text TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_rat_game ON ratings(game);

        CREATE TABLE IF NOT EXISTS referrals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ts INTEGER NOT NULL,
            room_code TEXT,
            date TEXT
        );
    """)
    db.commit()


def hash_ip(ip: str) -> str:
    return hashlib.sha256(ip.encode()).hexdigest()[:16]


def load_state() -> int:
    """Return byte offset of last parsed position."""
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE) as f:
                data = json.load(f)
                return data.get('offset', 0)
        except Exception:
            pass
    return 0


def save_state(offset: int):
    with open(STATE_FILE, 'w') as f:
        json.dump({'offset': offset}, f)


def parse_logs(db):
    if not os.path.exists(LOG_FILE):
        print(f'Log file not found: {LOG_FILE}')
        return

    offset = load_state()
    file_size = os.path.getsize(LOG_FILE)

    # If log was rotated (file is smaller than saved offset), reset
    if file_size < offset:
        print(f'Log rotated, resetting offset (was {offset}, now {file_size})')
        offset = 0

    inserted = 0
    new_offset = offset

    with open(LOG_FILE, 'r', errors='replace') as f:
        f.seek(offset)
        for line in f:
            new_offset += len(line.encode('utf-8', errors='replace'))
            line = line.strip()
            if not line:
                continue

            m = FULL_RE.match(line)
            if not m:
                continue

            ip, ts_str, method, path, status = m.groups()
            if method != 'GET':
                continue
            if status not in ('200', '304'):
                continue

            # Extract game name from path: /snake/ or /snake/index.html
            parts = path.strip('/').split('/')
            if not parts or not parts[0]:
                continue
            game = parts[0].lower()
            if game not in GAME_DIRS:
                continue

            # Only count page-level hits (no deep asset paths)
            if len(parts) > 1 and parts[1] and not parts[1].endswith('.html'):
                continue

            # Parse timestamp
            try:
                # nginx format: 19/Feb/2026:12:34:56 +0000
                ts_clean = ts_str.split(' ')[0]
                dt = datetime.strptime(ts_clean, '%d/%b/%Y:%H:%M:%S')
                ts_unix = int(dt.replace(tzinfo=timezone.utc).timestamp())
                date_str = dt.strftime('%Y-%m-%d')
            except Exception:
                continue

            ip_hash = hash_ip(ip)
            db.execute(
                'INSERT INTO page_views (ts, game, ip_hash, date) VALUES (?, ?, ?, ?)',
                (ts_unix, game, ip_hash, date_str)
            )
            inserted += 1

    db.commit()
    save_state(new_offset)
    print(f'[{datetime.now().isoformat()}] Parsed {inserted} new page views (offset {offset}→{new_offset})')


def main():
    db = sqlite3.connect(DB_FILE)
    db.row_factory = sqlite3.Row
    init_db(db)
    parse_logs(db)
    db.close()


if __name__ == '__main__':
    main()
