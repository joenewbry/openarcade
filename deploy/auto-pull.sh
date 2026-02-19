#!/usr/bin/env bash
#
# Auto-pull deployment for OpenArcade
# Runs every minute via systemd timer (openarcade-auto-pull.timer).
#
set -euo pipefail

REPO_DIR=/ssd/openarcade
BRANCH=main
LOG_TAG=openarcade-auto-pull

cd "$REPO_DIR"

export GIT_SSH_COMMAND="ssh -i /home/prometheus/.ssh/id_ed25519 -o StrictHostKeyChecking=no"

git fetch origin "$BRANCH" --quiet 2>&1 || { logger -t "$LOG_TAG" "git fetch failed"; exit 1; }

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse "origin/$BRANCH")

if [ "$LOCAL" = "$REMOTE" ]; then
    exit 0
fi

logger -t "$LOG_TAG" "New commits: $LOCAL -> $REMOTE"
git reset --hard "origin/$BRANCH" 2>&1 | logger -t "$LOG_TAG"
logger -t "$LOG_TAG" "Deployed $(git rev-parse --short HEAD)"
