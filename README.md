-# CAMGUESSR

> GeoGuessr-style game using public street camera feeds (not continuously live; update frequency varies).
> Clean, game-first UI with real-time multiplayer via Socket.IO.

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
├── scripts/
│   └── sync-cameras.js   # Bulk camera catalog ingestion (Windy + NYC + Ontario + Alberta)
├── server/
│   └── index.js          # Express + Socket.IO server + game room logic
├── data/
│   └── camera-catalog.json # Generated camera pool used at runtime
├── public/
│   ├── index.html        # Main HTML
│   ├── css/
│   │   └── style.css     # Main UI stylesheet
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

4. Build a large runtime catalog (thousands of cameras) with:
   ```bash
   npm run sync:cameras
   ```
   This writes `data/camera-catalog.json` and the server loads it automatically.
   The sync applies balancing caps so one provider/country cannot dominate.

5. Check catalog size:
   - `GET /api/cameras/meta`

6. Runtime round generation is balanced (GeoGuessr-style constraints):
   - country diversity prioritized
   - provider diversity prioritized
   - anti-repeat history across recent rooms

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
- **60 seconds** per round (server-authoritative timer)
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
| `WINDY_NEARBY_RADIUS_KM` | `120` | Nearby search radius for runtime feed resolution |
| `WINDY_NEARBY_LIMIT` | `12` | Nearby webcam candidates cached per camera |
| `WINDY_RECENT_TTL_MS` | `900000` | Webcam anti-repeat cooldown window |
| `SYNC_WINDY_RADIUS_KM` | `250` | Radius per sync tile during catalog ingest |
| `SYNC_WINDY_LIMIT` | `50` | Page size per Windy sync request |
| `SYNC_WINDY_MAX_TILES` | `180` | How many global geo tiles to scan during sync |
| `SYNC_WINDY_OFFSETS` | `0,50,100,150` | Windy result offsets scanned per tile |
| `SYNC_WINDY_DELAY_MS` | `60` | Delay between Windy sync requests |
| `SYNC_INCLUDE_NYC` | `true` | Include NYC DOT feed in sync |
| `SYNC_INCLUDE_ONTARIO` | `true` | Include Ontario 511 feed in sync |
| `SYNC_INCLUDE_ALBERTA` | `true` | Include Alberta 511 feed in sync |
| `SYNC_MAX_PER_PROVIDER` | `1200` | Max catalog entries per provider after rebalance |
| `SYNC_MAX_PER_COUNTRY` | `180` | Max catalog entries per country (except US cap below) |
| `SYNC_MAX_US` | `260` | Explicit US cap to avoid overrepresentation |
| `GLOBAL_RECENT_CAMERA_HISTORY` | `250` | Recent camera IDs avoided across new room generation |

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
