#!/usr/bin/env python3
"""
OpenArcade Co-op WebSocket relay server.
asyncio + websockets, port 8094.

Install: pip install websockets
Run:     python3 ws_server.py

Systemd service: arcade-ws
Nginx proxy (add to openarcade site config):
  location /ws/ {
      proxy_pass http://localhost:8094/;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "upgrade";
      proxy_read_timeout 3600;
  }

Message protocol (JSON):
  Client → Server:  { type: "join", room: "XXXXXX", role: "host"|"guest" }
  Server → Host:    { type: "guest_joined" }
  Server → Guest:   { type: "host_left" }
  Host → Server:    { type: "state", ... }  — relayed to guest
  Guest → Server:   { type: "input", keys: {...} }  — relayed to host
  Either → Server:  { type: "ping" }
  Server → Either:  { type: "pong" }

Rooms expire 10 min after last message.
"""

import asyncio
import json
import logging
import time
from typing import Optional
import websockets
from websockets.server import WebSocketServerProtocol

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
log = logging.getLogger('ws_server')

PORT = 8094
ROOM_IDLE_TIMEOUT = 600  # seconds — rooms expire after 10 min of inactivity


class Room:
    def __init__(self, code: str):
        self.code = code
        self.host: Optional[WebSocketServerProtocol] = None
        self.guest: Optional[WebSocketServerProtocol] = None
        self.last_activity = time.time()

    def touch(self):
        self.last_activity = time.time()

    def is_expired(self) -> bool:
        return time.time() - self.last_activity > ROOM_IDLE_TIMEOUT

    def is_empty(self) -> bool:
        return self.host is None and self.guest is None


rooms: dict[str, Room] = {}


async def send_json(ws: WebSocketServerProtocol, msg: dict):
    try:
        await ws.send(json.dumps(msg))
    except Exception:
        pass


async def handle(ws: WebSocketServerProtocol):
    """Handle a new WebSocket connection."""
    room_code = None
    role = None
    room = None

    try:
        # Parse room + role from query string
        import urllib.parse
        qs = urllib.parse.parse_qs(urllib.parse.urlparse(ws.path).query)
        room_code = (qs.get('room', [''])[0] or '').upper()[:6]
        role = qs.get('role', [''])[0].lower()

        if not room_code or role not in ('host', 'guest'):
            await ws.close(1008, 'Missing room or role')
            return

        log.info(f'Connection: {role} room={room_code}')

        # Get or create room
        if room_code not in rooms:
            rooms[room_code] = Room(room_code)
        room = rooms[room_code]
        room.touch()

        if role == 'host':
            if room.host is not None:
                # New host replaces old (e.g. reconnect)
                try:
                    await room.host.close()
                except Exception:
                    pass
            room.host = ws

            # If guest was already waiting, notify both
            if room.guest is not None:
                await send_json(ws, {'type': 'guest_joined'})
                await send_json(room.guest, {'type': 'host_joined'})

        elif role == 'guest':
            if room.guest is not None:
                try:
                    await room.guest.close()
                except Exception:
                    pass
            room.guest = ws

            # Notify host that guest has joined
            if room.host is not None:
                await send_json(room.host, {'type': 'guest_joined'})

        # Relay messages
        async for raw in ws:
            room.touch()
            try:
                msg = json.loads(raw)
            except Exception:
                continue

            if msg.get('type') == 'ping':
                await send_json(ws, {'type': 'pong'})
                continue

            # Relay to the other side
            if role == 'host' and room.guest is not None:
                await send_json(room.guest, msg)
            elif role == 'guest' and room.host is not None:
                await send_json(room.host, msg)

    except websockets.exceptions.ConnectionClosed:
        pass
    except Exception as e:
        log.exception(f'Handler error: {e}')
    finally:
        if room is not None:
            if role == 'host' and room.host is ws:
                room.host = None
                if room.guest is not None:
                    await send_json(room.guest, {'type': 'host_left'})
                log.info(f'Host left room {room_code}')
            elif role == 'guest' and room.guest is ws:
                room.guest = None
                if room.host is not None:
                    await send_json(room.host, {'type': 'guest_left'})
                log.info(f'Guest left room {room_code}')

            if room.is_empty():
                rooms.pop(room_code, None)
                log.info(f'Room {room_code} removed (empty)')


async def cleanup_expired_rooms():
    """Periodically remove idle rooms."""
    while True:
        await asyncio.sleep(60)
        expired = [code for code, r in rooms.items() if r.is_expired()]
        for code in expired:
            r = rooms.pop(code, None)
            if r:
                log.info(f'Room {code} expired (idle)')
                for ws in (r.host, r.guest):
                    if ws is not None:
                        try:
                            await ws.close()
                        except Exception:
                            pass


async def main():
    log.info(f'Starting WebSocket relay on port {PORT}')
    async with websockets.serve(handle, '0.0.0.0', PORT):
        await asyncio.gather(
            asyncio.Future(),  # run forever
            cleanup_expired_rooms(),
        )


if __name__ == '__main__':
    asyncio.run(main())
