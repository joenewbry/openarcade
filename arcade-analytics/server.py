#!/usr/bin/env python3
"""
OpenArcade Analytics API
FastAPI server on port 8093.

Install: pip install fastapi uvicorn
Run:     uvicorn server:app --host 0.0.0.0 --port 8093

Systemd service: arcade-analytics
Nginx proxy:
  location /stats-api/ {
      proxy_pass http://localhost:8093/;
  }
"""

import sqlite3
import os
import time
from datetime import datetime, timedelta, timezone
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

DB_FILE = os.path.join(os.path.dirname(__file__), 'arcade.db')

app = FastAPI(title='OpenArcade Analytics')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_methods=['GET'],
    allow_headers=['*'],
)


def get_db():
    db = sqlite3.connect(DB_FILE)
    db.row_factory = sqlite3.Row
    return db


def today_str():
    return datetime.now(timezone.utc).strftime('%Y-%m-%d')


def days_ago_str(n: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=n)).strftime('%Y-%m-%d')


@app.get('/summary')
def summary():
    """DAU, WAU, MAU, top 10 games, K-factor today."""
    db = get_db()
    today = today_str()
    week_ago = days_ago_str(7)
    month_ago = days_ago_str(30)

    # Unique daily active users (distinct ip_hash per day)
    dau = db.execute(
        'SELECT COUNT(DISTINCT ip_hash) FROM page_views WHERE date = ?', (today,)
    ).fetchone()[0]

    wau = db.execute(
        'SELECT COUNT(DISTINCT ip_hash) FROM page_views WHERE date >= ?', (week_ago,)
    ).fetchone()[0]

    mau = db.execute(
        'SELECT COUNT(DISTINCT ip_hash) FROM page_views WHERE date >= ?', (month_ago,)
    ).fetchone()[0]

    # Top 10 games by views today
    top_rows = db.execute(
        '''SELECT game, COUNT(*) as views
           FROM page_views WHERE date = ?
           GROUP BY game ORDER BY views DESC LIMIT 10''',
        (today,)
    ).fetchall()
    top_games = [{'game': r['game'], 'views': r['views']} for r in top_rows]

    # K-factor: referrals (co-op room joins) / DAU today
    referrals_today = db.execute(
        'SELECT COUNT(*) FROM referrals WHERE date = ?', (today,)
    ).fetchone()[0]
    k_factor = round(referrals_today / dau, 3) if dau > 0 else 0.0

    db.close()
    return {
        'dau': dau,
        'wau': wau,
        'mau': mau,
        'top_games': top_games,
        'k_factor_today': k_factor,
        'referrals_today': referrals_today,
        'generated_at': today,
    }


@app.get('/daily')
def daily(days: int = Query(default=30, ge=1, le=365)):
    """DAU per day for the last N days."""
    db = get_db()
    start = days_ago_str(days)

    rows = db.execute(
        '''SELECT date, COUNT(DISTINCT ip_hash) as dau
           FROM page_views WHERE date >= ?
           GROUP BY date ORDER BY date ASC''',
        (start,)
    ).fetchall()

    referral_rows = db.execute(
        '''SELECT date, COUNT(*) as count
           FROM referrals WHERE date >= ?
           GROUP BY date ORDER BY date ASC''',
        (start,)
    ).fetchall()
    referral_map = {r['date']: r['count'] for r in referral_rows}

    result = []
    for r in rows:
        result.append({
            'date': r['date'],
            'dau': r['dau'],
            'new_referrals': referral_map.get(r['date'], 0),
        })

    db.close()
    return result


@app.get('/games')
def games():
    """Per-game views: today, 7d, 30d."""
    db = get_db()
    today = today_str()
    week_ago = days_ago_str(7)
    month_ago = days_ago_str(30)

    rows_30 = db.execute(
        '''SELECT game, COUNT(*) as views
           FROM page_views WHERE date >= ?
           GROUP BY game ORDER BY views DESC''',
        (month_ago,)
    ).fetchall()

    # Build per-game dicts
    game_map = {}
    for r in rows_30:
        game_map[r['game']] = {'game': r['game'], 'views_today': 0, 'views_7d': 0, 'views_30d': r['views']}

    rows_7 = db.execute(
        '''SELECT game, COUNT(*) as views
           FROM page_views WHERE date >= ?
           GROUP BY game''',
        (week_ago,)
    ).fetchall()
    for r in rows_7:
        if r['game'] in game_map:
            game_map[r['game']]['views_7d'] = r['views']

    rows_1 = db.execute(
        '''SELECT game, COUNT(*) as views
           FROM page_views WHERE date = ?
           GROUP BY game''',
        (today,)
    ).fetchall()
    for r in rows_1:
        if r['game'] in game_map:
            game_map[r['game']]['views_today'] = r['views']

    db.close()
    return sorted(game_map.values(), key=lambda x: x['views_30d'], reverse=True)


@app.get('/feedback')
def feedback(
    game: str = Query(default='', description='Filter by game (empty = all)'),
    stars: int = Query(default=0, ge=0, le=5, description='Filter by stars (0 = all)'),
    limit: int = Query(default=100, ge=1, le=500)
):
    """Recent feedback/ratings."""
    db = get_db()
    conditions = []
    params = []

    if game:
        conditions.append('game = ?')
        params.append(game)
    if stars > 0:
        conditions.append('stars = ?')
        params.append(stars)

    where = ('WHERE ' + ' AND '.join(conditions)) if conditions else ''
    params.append(limit)

    rows = db.execute(
        f'SELECT ts, game, stars, category, text FROM ratings {where} ORDER BY ts DESC LIMIT ?',
        params
    ).fetchall()

    result = []
    for r in rows:
        result.append({
            'ts': r['ts'],
            'game': r['game'],
            'stars': r['stars'],
            'category': r['category'],
            'text': r['text'],
            'ago': _time_ago(r['ts']),
        })

    db.close()
    return result


def _time_ago(ts: int) -> str:
    now = int(time.time())
    diff = now - ts
    if diff < 60:
        return f'{diff}s ago'
    elif diff < 3600:
        return f'{diff // 60}m ago'
    elif diff < 86400:
        return f'{diff // 3600}h ago'
    else:
        return f'{diff // 86400}d ago'


@app.post('/referral')
def log_referral(room_code: str = Query(...)):
    """Log a co-op room join (referral event)."""
    db = get_db()
    today = today_str()
    db.execute(
        'INSERT INTO referrals (ts, room_code, date) VALUES (?, ?, ?)',
        (int(time.time()), room_code, today)
    )
    db.commit()
    db.close()
    return {'ok': True}


if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=8093)
