-# CAMGUESSR

> GeoGuessr-style game using live public surveillance camera feeds.
> Hacker aesthetic. Real-time multiplayer via Socket.IO.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Create your .env file
cp .env.example .env

# 3. Start server
npm start

# 4. Open in browser
http://localhost:3000
```

For development with auto-reload:
```bash
npm run dev
```

---

## Project Structure

```
camguessr/
├── server/
│   └── index.js          # Express + Socket.IO server + game room logic
├── public/
│   ├── index.html        # Main HTML
│   ├── css/
│   │   └── style.css     # Full hacker theme stylesheet
│   └── js/
│       ├── map.js        # World map SVG + coordinate math
│       ├── ui.js         # Screen management, boot sequence, UI helpers
│       ├── game.js       # Core game logic (SP + shared MP state)
│       ├── mp.js         # Socket.IO multiplayer client
│       └── main.js       # Entry point
└── package.json
```

---

## Adding Windy Webcams API

1. Get a free API key from https://api.windy.com/webcams
2. Put it in your `.env` file:
   ```bash
   WINDY_API_KEY=your_key_here
   ```
3. In `server/index.js`, the proxy endpoints are already set up:
   - `GET /api/windy/webcams?lat=X&lon=Y&radiusKm=50&limit=20` — search nearby webcams
   - `GET /api/windy/snapshot/:cameraId` — fetch a snapshot image

4. To use Windy webcams in the game, update the `CAMERA_DB` array in
   `server/index.js` to use Windy webcam IDs and set `imgUrl` to:
   ```
   /api/windy/snapshot/<windy-webcam-id>
   ```

---

## Multiplayer Flow

```
Player A                   Server                    Player B
  createRoom ─────────────▶ rooms.set(code, room)
  ◀──────── roomCreated    (lobby phase)

  Player B joins ──────────────────────────────────▶ joinRoom
  ◀─────────────── playerJoined ◀──────────────────── roomJoined
  
  setReady ────────────────▶                         setReady ──▶
  ◀──────── roundStart ◀───── startRound() ──────────────────── ◀

  (playing)
  submitGuess ─────────────▶ playerGuessed ──────────────────── ▶
                             (all guessed or time up)
                             endRound()
  ◀──────────────────────── roundEnd ──────────────────────────── ◀
  (8 second review, then next round auto-starts)

  ◀──────────────────────── gameOver ──────────────────────────── ◀
```

---

## Game Rules

- **5 rounds** per game
- **90 seconds** per round (server-authoritative timer)
- Click the world map to place your guess
- Buy Intel Intercepts for location clues (100 credits each, starts with 500)
- Scoring by Haversine distance:
  - < 10km  → 5,000 pts
  - < 100km → ~4,500 pts
  - < 1,000km → ~1,000 pts
  - < 5,000km → ~400 pts
  - > 5,000km → 0 pts
- Max score: **25,000 pts**

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `WINDY_API_KEY` | `null` | Windy Webcams API key |

---

## Deploying

Works on any Node.js host (Railway, Render, Fly.io, Heroku):

```bash
# Set PORT via environment variable on your host
# Make sure WebSocket connections are allowed (most hosts support this)
npm start
```

For Render.com: set Start Command to `npm start`.
For Railway: it auto-detects the start script.
