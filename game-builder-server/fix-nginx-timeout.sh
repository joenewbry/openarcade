#!/bin/bash
# Fix nginx proxy timeout for game-builder-api
# Run on Jetson: bash fix-nginx-timeout.sh
#
# The game generation pipeline makes 10 sequential Claude calls
# which can take 3-8 minutes total. nginx default proxy_read_timeout
# of 60-120s kills the SSE connection mid-stream.

NGINX_CONF="/etc/nginx/sites-available/openarcade"

if ! grep -q "game-builder-api" "$NGINX_CONF"; then
  echo "ERROR: game-builder-api location block not found in $NGINX_CONF"
  exit 1
fi

# Back up current config
sudo cp "$NGINX_CONF" "${NGINX_CONF}.bak.$(date +%Y%m%d)"

# Use sed to add timeout settings to the game-builder-api location block
# This adds the directives after the proxy_pass line
sudo sed -i '/location \/game-builder-api\//,/}/ {
  /proxy_set_header X-Real-IP/a\
    proxy_read_timeout 600s;\
    proxy_send_timeout 600s;\
    proxy_buffering off;\
    chunked_transfer_encoding on;
}' "$NGINX_CONF"

# Test and reload
sudo nginx -t && sudo systemctl reload nginx
echo "Done. Verify with: curl -s http://localhost/game-builder-api/health"
