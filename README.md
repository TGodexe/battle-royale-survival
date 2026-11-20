# LAST ZONE — Multiplayer Battle Royale

Playable browser-based 2D top-down survival shooter prototype using Node.js, Express and Socket.IO.

## Run locally

```bash
npm install
npm start
```

Open http://localhost:3000 in two browser tabs, join with different names, then press START MATCH. WASD / arrow keys move, mouse aims, hold mouse button to shoot. Yellow squares refill ammo. Red zone deals damage. Last survivor wins.

## Deploy

Deploy as a **Node.js web service** (e.g. Render or Railway) with build command `npm install`, start command `npm start`, and port from `PORT`. GitHub Pages alone cannot host the Socket.IO backend.

## Current limitations

Prototype: one shared room, no persistence, no anti-cheat, no authentication, no match restart UI, and no touch controls. Server is authoritative for movement and damage but client input should be further rate-limited before public launch.
