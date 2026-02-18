#!/usr/bin/env python3
"""
Thompson Sampling bandit updater for OpenArcade landing page.

Reads landing page events from JSONL log, computes alpha/beta parameters
per arm, and writes updated bandit_state.json. Run via cron hourly.

Usage:
    python update_bandit.py

Files:
    Input:  /ssd/ssd-data/landing_events.jsonl
    Output: /ssd/openarcade/bandit_state.json (served statically by nginx)
    Report: /ssd/ssd-data/bandit_report.jsonl (append-only, for blog post)
"""

import json
import os
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

EVENTS_PATH = Path("/ssd/ssd-data/landing_events.jsonl")
STATE_PATH = Path("/ssd/openarcade/bandit_state.json")
REPORT_PATH = Path("/ssd/ssd-data/bandit_report.jsonl")

# Also look for play sessions to compute composite reward
BROWSER_STATS_PATH = Path("/ssd/browser_stats.json")
RAW_DIR = Path("/ssd/ssd-data/raw")


def load_events():
    """Load all landing page events from JSONL."""
    events = []
    if not EVENTS_PATH.exists():
        return events
    with open(EVENTS_PATH) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                events.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return events


def load_current_state():
    """Load current bandit state or return defaults."""
    if STATE_PATH.exists():
        try:
            return json.loads(STATE_PATH.read_text())
        except (json.JSONDecodeError, OSError):
            pass
    return {
        "version": 1,
        "arms": [
            {"name": "default", "alpha": 1, "beta": 1, "description": "Original HTML order"},
            {"name": "classics", "alpha": 1, "beta": 1, "description": "Iconic arcade classics first"},
            {"name": "casual", "alpha": 1, "beta": 1, "description": "Easy/casual/modern games first"},
            {"name": "action", "alpha": 1, "beta": 1, "description": "High-action shooters first"},
            {"name": "random", "alpha": 1, "beta": 1, "description": "Shuffled every pageview"},
        ],
    }


def compute_rewards(events):
    """
    Compute per-pageview reward signals.

    For each pageview, check if the visitor clicked a card (fast reward).
    Returns dict: {pageview_id: {arm, clicked, game, ms_to_click, scroll_pct, ms_on_page}}
    """
    pageviews = {}
    clicks = {}
    exits = {}

    for evt in events:
        pid = evt.get("pageview_id")
        if not pid:
            continue
        etype = evt.get("event")
        if etype == "pageview":
            pageviews[pid] = {
                "arm": evt.get("arm", "default"),
                "visitor_id": evt.get("visitor_id"),
                "timestamp": evt.get("timestamp"),
                "is_mobile": evt.get("is_mobile", False),
                "referrer": evt.get("referrer", ""),
            }
        elif etype == "card_click":
            clicks[pid] = {
                "game": evt.get("game"),
                "position": evt.get("position"),
                "ms_since_load": evt.get("ms_since_load", 0),
            }
        elif etype == "page_exit":
            exits[pid] = {
                "max_scroll_pct": evt.get("max_scroll_pct", 0),
                "ms_on_page": evt.get("ms_on_page", 0),
            }

    # Merge into reward records
    rewards = {}
    for pid, pv in pageviews.items():
        clicked = pid in clicks
        click_info = clicks.get(pid, {})
        exit_info = exits.get(pid, {})
        rewards[pid] = {
            "arm": pv["arm"],
            "clicked": clicked,
            "game": click_info.get("game"),
            "position": click_info.get("position"),
            "ms_to_click": click_info.get("ms_since_load"),
            "scroll_pct": exit_info.get("max_scroll_pct", 0),
            "ms_on_page": exit_info.get("ms_on_page", 0),
            "visitor_id": pv["visitor_id"],
            "is_mobile": pv["is_mobile"],
            "referrer": pv["referrer"],
            "timestamp": pv["timestamp"],
        }
    return rewards


def update_state(state, rewards):
    """Update arm alpha/beta from reward data."""
    arm_map = {a["name"]: a for a in state["arms"]}

    # Reset to priors (1, 1) and recompute from all data
    for arm in state["arms"]:
        arm["alpha"] = 1
        arm["beta"] = 1

    # Count successes (clicks) and failures (no click) per arm
    arm_stats = defaultdict(lambda: {"successes": 0, "failures": 0, "total": 0})
    for pid, r in rewards.items():
        arm_name = r["arm"]
        arm_stats[arm_name]["total"] += 1
        if r["clicked"]:
            arm_stats[arm_name]["successes"] += 1
        else:
            arm_stats[arm_name]["failures"] += 1

    # Update alpha/beta: alpha = 1 + successes, beta = 1 + failures
    for arm in state["arms"]:
        s = arm_stats.get(arm["name"])
        if s:
            arm["alpha"] = 1 + s["successes"]
            arm["beta"] = 1 + s["failures"]

    return arm_stats


def write_report(arm_stats, rewards, state):
    """Append a timestamped report line for blog post analysis."""
    now = datetime.now(timezone.utc).isoformat()
    total_pageviews = len(rewards)
    total_clicks = sum(1 for r in rewards.values() if r["clicked"])

    report = {
        "timestamp": now,
        "total_pageviews": total_pageviews,
        "total_clicks": total_clicks,
        "overall_ctr": round(total_clicks / max(1, total_pageviews), 4),
        "arms": {},
    }
    for arm in state["arms"]:
        name = arm["name"]
        s = arm_stats.get(name, {"successes": 0, "failures": 0, "total": 0})
        report["arms"][name] = {
            "alpha": arm["alpha"],
            "beta": arm["beta"],
            "impressions": s["total"],
            "clicks": s["successes"],
            "ctr": round(s["successes"] / max(1, s["total"]), 4),
        }

    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(REPORT_PATH, "a") as f:
        f.write(json.dumps(report) + "\n")

    return report


def main():
    events = load_events()
    state = load_current_state()

    if not events:
        print("No events found. Writing default state.")
        STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
        tmp = STATE_PATH.with_suffix(".tmp")
        tmp.write_text(json.dumps(state, indent=2))
        tmp.rename(STATE_PATH)
        return

    rewards = compute_rewards(events)
    arm_stats = update_state(state, rewards)

    # Write updated state atomically
    state["updated_at"] = datetime.now(timezone.utc).isoformat()
    state["total_pageviews"] = len(rewards)
    STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    tmp = STATE_PATH.with_suffix(".tmp")
    tmp.write_text(json.dumps(state, indent=2))
    tmp.rename(STATE_PATH)

    # Write report for blog post data
    report = write_report(arm_stats, rewards, state)

    # Print summary
    print(f"Updated bandit state: {len(rewards)} pageviews, "
          f"{sum(1 for r in rewards.values() if r['clicked'])} clicks")
    for name, stats in report["arms"].items():
        print(f"  {name}: {stats['impressions']} impressions, "
              f"{stats['clicks']} clicks, CTR={stats['ctr']:.1%}, "
              f"alpha={stats['alpha']}, beta={stats['beta']}")


if __name__ == "__main__":
    main()
