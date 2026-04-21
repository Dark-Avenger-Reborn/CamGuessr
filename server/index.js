require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// ─────────────────────────────────────────────
// CAMERA DATABASE
// Swap imgUrl values for Windy proxy endpoints:
//   /api/windy/snapshot/:id
// after adding your API key to the proxy endpoint below.
// ─────────────────────────────────────────────
const STATIC_CAMERA_DB = [
  {
    id: 'cam_ny_001',
    location: 'Times Square, New York, USA',
    city: 'New York City', state: 'New York', country: 'United States',
    lat: 40.758, lon: -73.985,
    imgUrl: 'https://trafficcamphotobooth.com/cams/511ny/TDOT_CCTV_Camera_0000000000023774.jpg',
    clues: [
      'Dense urban canyon — skyscrapers frame every angle',
      'English signage — Western alphabet confirmed',
      'North American traffic pattern — vehicles drive on right',
      'Massive LED advertising displays — high-density commercial district',
      'Yellow taxi cabs detected in vehicle feed'
    ]
  },
  {
    id: 'cam_il_001',
    location: 'I-94 Expressway, Chicago, USA',
    city: 'Chicago', state: 'Illinois', country: 'United States',
    lat: 41.878, lon: -87.629,
    imgUrl: 'https://trafficcamphotobooth.com/cams/idot/idot_I90_94_at_Ohio.jpg',
    clues: [
      'Major Interstate highway — multiple lanes in both directions',
      'Green highway signage — US Department of Transportation standard',
      'Midwestern US — flat terrain, wide corridors',
      'Traffic density suggests metro population of 2M+',
      'Chicago grid street pattern visible in overhead shot'
    ]
  },
  {
    id: 'cam_ca_001',
    location: 'Pacific Coast Highway, Malibu, California, USA',
    city: 'Malibu', state: 'California', country: 'United States',
    lat: 34.019, lon: -118.492,
    imgUrl: 'https://trafficcamphotobooth.com/cams/caltrans/1200233.jpg',
    clues: [
      'Coastal road — ocean visible in background',
      'Right-hand traffic — North American territory',
      'Mediterranean climate — drought-resistant vegetation',
      'Pacific Ocean horizon detected',
      'Caltrans DOT infrastructure — California confirmed'
    ]
  },
  {
    id: 'cam_ca_002',
    location: 'US-101, San Francisco Bay Area, USA',
    city: 'San Francisco', state: 'California', country: 'United States',
    lat: 37.774, lon: -122.419,
    imgUrl: 'https://trafficcamphotobooth.com/cams/caltrans/1200096.jpg',
    clues: [
      'Bay Area elevated freeway — coastal hills in background',
      'Persistent marine fog layer — characteristic of SF Bay',
      'Heavy tech-commuter traffic — Silicon Valley proximity',
      'Suspension bridge structure detected in distance',
      'Northern California — Caltrans District 4'
    ]
  },
  {
    id: 'cam_nj_001',
    location: 'NJ Turnpike I-95, Newark, New Jersey, USA',
    city: 'Newark', state: 'New Jersey', country: 'United States',
    lat: 40.499, lon: -74.449,
    imgUrl: 'https://trafficcamphotobooth.com/cams/511nj/NJDOT_CCTV_Camera_00004.jpg',
    clues: [
      'New Jersey Turnpike — one of the busiest toll roads in the US',
      'Port Newark industrial backdrop — major container port',
      'Heavy commercial vehicle presence — logistics hub',
      'Northeast corridor — densest highway network in North America',
      'NJ DOT traffic management — Garden State'
    ]
  },
  {
    id: 'cam_ga_001',
    location: 'I-285 Perimeter, Atlanta, Georgia, USA',
    city: 'Atlanta', state: 'Georgia', country: 'United States',
    lat: 33.749, lon: -84.388,
    imgUrl: 'https://trafficcamphotobooth.com/cams/gdot/CAM-088-0004.jpg',
    clues: [
      'Southeastern US highway — Georgia DOT camera',
      'Sun Belt urban sprawl — Atlanta metro pattern',
      'Lush broadleaf tree cover — humid subtropical climate',
      'High-capacity interchange — major southern logistics hub',
      'Georgia: Peach State — southeastern United States'
    ]
  },
  {
    id: 'cam_wa_001',
    location: 'I-5 Corridor, Seattle, Washington, USA',
    city: 'Seattle', state: 'Washington', country: 'United States',
    lat: 47.606, lon: -122.332,
    imgUrl: 'https://trafficcamphotobooth.com/cams/wsdot/I5-SB-024.jpg',
    clues: [
      'Pacific Northwest highway — evergreen conifers visible',
      'Heavy overcast sky — marine climate signature',
      'Mountain range silhouette in background — Cascades',
      'Dense urban core approach — major tech city',
      'Washington State DOT camera — Pacific Northwest'
    ]
  },
  {
    id: 'cam_tx_001',
    location: 'I-35 Austin, Texas, USA',
    city: 'Austin', state: 'Texas', country: 'United States',
    lat: 30.267, lon: -97.743,
    imgUrl: 'https://trafficcamphotobooth.com/cams/txdot/IH0035-0-006.jpg',
    clues: [
      'Texas DOT highway camera — Lone Star State',
      'Semi-arid climate — sparse scrub vegetation',
      'Wide highway corridor — characteristic Texas infrastructure',
      'State Capitol dome visible in some angles',
      'I-35 — the backbone of Central Texas'
    ]
  },
  {
    id: 'cam_jp_tokyo_001',
    location: 'Shibuya Crossing, Tokyo, Japan',
    city: 'Tokyo', state: 'Tokyo', country: 'Japan',
    lat: 35.659, lon: 139.701,
    imgUrl: null,
    clues: [
      'Dense vertical signage and compact streets',
      'Left-hand traffic pattern appears in road flow',
      'High transit density and station-centric urban layout',
      'East Asian commercial district architecture',
      'One of the busiest crossings in the world'
    ]
  },
  {
    id: 'cam_uk_london_001',
    location: 'Westminster, London, United Kingdom',
    city: 'London', state: 'England', country: 'United Kingdom',
    lat: 51.5007, lon: -0.1246,
    imgUrl: null,
    clues: [
      'Historic masonry mixed with modern city transit',
      'Left-hand traffic lane markings',
      'Temperate maritime weather and muted daylight',
      'European capital density with iconic civic buildings',
      'English-language urban wayfinding style'
    ]
  },
  {
    id: 'cam_fr_paris_001',
    location: 'Central Paris, France',
    city: 'Paris', state: 'Ile-de-France', country: 'France',
    lat: 48.8566, lon: 2.3522,
    imgUrl: null,
    clues: [
      'Wide boulevards with Haussmann-era facades',
      'Dense cafe frontage and pedestrian-heavy streets',
      'European road signage and compact vehicles',
      'Historic core with radial avenue network',
      'Major continental tourism and transit hub'
    ]
  },
  {
    id: 'cam_es_madrid_001',
    location: 'Gran Via, Madrid, Spain',
    city: 'Madrid', state: 'Community of Madrid', country: 'Spain',
    lat: 40.4168, lon: -3.7038,
    imgUrl: null,
    clues: [
      'Southern European architecture and broad avenues',
      'Dry summer climate cues in vegetation and sky color',
      'Dense city center traffic with buses and taxis',
      'Latin alphabet signage with Iberian naming patterns',
      'High-altitude inland capital environment'
    ]
  },
  {
    id: 'cam_ae_dubai_001',
    location: 'Downtown Dubai, United Arab Emirates',
    city: 'Dubai', state: 'Dubai', country: 'United Arab Emirates',
    lat: 25.2048, lon: 55.2708,
    imgUrl: null,
    clues: [
      'Ultra-modern skyline with very tall towers',
      'Arid climate and bright desert light',
      'Wide multi-lane boulevards and modern interchanges',
      'Middle Eastern urban development patterns',
      'Glass-heavy architecture in a Gulf megacity'
    ]
  },
  {
    id: 'cam_in_mumbai_001',
    location: 'South Mumbai, India',
    city: 'Mumbai', state: 'Maharashtra', country: 'India',
    lat: 19.076, lon: 72.8777,
    imgUrl: null,
    clues: [
      'Very dense mixed traffic with two-wheelers',
      'Tropical coastal haze and humid conditions',
      'Urban form with colonial-era and modern blocks mixed',
      'Left-hand traffic with compact lane usage',
      'South Asian megacity visual density'
    ]
  },
  {
    id: 'cam_sg_singapore_001',
    location: 'Marina Bay, Singapore',
    city: 'Singapore', state: 'Central Region', country: 'Singapore',
    lat: 1.2868, lon: 103.8545,
    imgUrl: null,
    clues: [
      'Highly maintained roads and strict lane discipline',
      'Tropical greenery integrated into dense skyline',
      'Modern port-city architecture and waterfront district',
      'Equatorial weather with frequent cloud buildup',
      'Compact island city-state transport system'
    ]
  },
  {
    id: 'cam_id_jakarta_001',
    location: 'Central Jakarta, Indonesia',
    city: 'Jakarta', state: 'DKI Jakarta', country: 'Indonesia',
    lat: -6.2088, lon: 106.8456,
    imgUrl: null,
    clues: [
      'Dense tropical city traffic and motorbike volume',
      'Equatorial humidity and frequent overcast skies',
      'Southeast Asian urban signage and road geometry',
      'High-rise core surrounded by sprawling districts',
      'Left-hand traffic in a major archipelago capital'
    ]
  },
  {
    id: 'cam_au_sydney_001',
    location: 'Sydney CBD, Australia',
    city: 'Sydney', state: 'New South Wales', country: 'Australia',
    lat: -33.8688, lon: 151.2093,
    imgUrl: null,
    clues: [
      'Harbor city topography with modern business core',
      'Left-hand traffic and Commonwealth road styling',
      'Coastal sunlight and temperate ocean climate',
      'Mix of high-rises and low historic blocks',
      'Australasian street furniture and markings'
    ]
  },
  {
    id: 'cam_br_rio_001',
    location: 'Rio de Janeiro, Brazil',
    city: 'Rio de Janeiro', state: 'Rio de Janeiro', country: 'Brazil',
    lat: -22.9068, lon: -43.1729,
    imgUrl: null,
    clues: [
      'Steep coastal hills close to dense urban zones',
      'Tropical Atlantic climate and bright sunlight',
      'Portuguese-language region and Latin urban patterns',
      'Beach-adjacent road corridors',
      'South American megacity with dramatic terrain'
    ]
  },
  {
    id: 'cam_cl_santiago_001',
    location: 'Santiago, Chile',
    city: 'Santiago', state: 'Santiago Metropolitan', country: 'Chile',
    lat: -33.4489, lon: -70.6693,
    imgUrl: null,
    clues: [
      'Broad valley city with mountains visible on clear days',
      'Dry Mediterranean climate cues and sparse greenery',
      'South American avenue grid and bus corridors',
      'Spanish-language urban context',
      'Long north-south national geography influence'
    ]
  },
  {
    id: 'cam_za_cape_001',
    location: 'Cape Town, South Africa',
    city: 'Cape Town', state: 'Western Cape', country: 'South Africa',
    lat: -33.9249, lon: 18.4241,
    imgUrl: null,
    clues: [
      'Distinct mountain silhouette near the city bowl',
      'Southern hemisphere coastal light and weather',
      'Left-hand traffic and Commonwealth roadway cues',
      'Mix of modern and colonial-influenced architecture',
      'Atlantic-facing port city in southern Africa'
    ]
  },
  {
    id: 'cam_ke_nairobi_001',
    location: 'Nairobi, Kenya',
    city: 'Nairobi', state: 'Nairobi County', country: 'Kenya',
    lat: -1.2921, lon: 36.8219,
    imgUrl: null,
    clues: [
      'High-elevation equatorial city with mixed skyline',
      'Fast-growing urban corridors and bus traffic',
      'East African road and street-market visual patterns',
      'Tropical highland weather variability',
      'Regional economic hub with modern office clusters'
    ]
  },
  {
    id: 'cam_no_oslo_001',
    location: 'Central Oslo, Norway',
    city: 'Oslo', state: 'Oslo', country: 'Norway',
    lat: 59.9139, lon: 10.7522,
    imgUrl: null,
    clues: [
      'Nordic urban design with clean transit infrastructure',
      'Cool climate cues and low winter sun angles',
      'Northern European streetscape and signage style',
      'Waterfront proximity in a fjord-connected city',
      'Cycling and transit-heavy mobility patterns'
    ]
  }
];

const CAMERA_CATALOG_PATH = path.join(__dirname, '../data/camera-catalog.json');

function normalizeCameraEntry(raw, fallbackIdx = 0) {
  const normalizeText = (value, fallback = 'Unknown') => {
    const text = String(value || '').trim();
    return text || fallback;
  };

  const id = String(raw?.id || raw?.cameraId || `cam_${fallbackIdx}`);
  const lat = Number(raw?.lat);
  const lon = Number(raw?.lon);
  const clues = Array.isArray(raw?.clues) && raw.clues.length > 0
    ? raw.clues
    : [
      `Urban camera feed near ${raw?.city || raw?.country || 'an active metro area'}`,
      'Road orientation and vehicle behavior can reveal traffic side',
      'Built environment and signage style hint at region and country',
      'Weather, vegetation, and daylight cues narrow latitude band',
      'Use map-scale context to estimate continent before city-level guess'
    ];

  if (!id || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }

  return {
    id,
    location: normalizeText(raw?.location || raw?.title || `${raw?.city || 'Unknown'}, ${raw?.country || 'Unknown'}`),
    city: normalizeText(raw?.city),
    state: normalizeText(raw?.state || raw?.region),
    country: normalizeText(raw?.country),
    lat,
    lon,
    imgUrl: raw?.imgUrl || null,
    clues,
    provider: normalizeText(raw?.provider, 'seed').toLowerCase()
  };
}

function loadCameraCatalog(staticFallback) {
  const fs = require('fs');
  const fallback = staticFallback
    .map((c, idx) => normalizeCameraEntry(c, idx))
    .filter(Boolean);

  try {
    if (!fs.existsSync(CAMERA_CATALOG_PATH)) return fallback;

    const text = fs.readFileSync(CAMERA_CATALOG_PATH, 'utf8');
    const parsed = JSON.parse(text);
    const rows = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.cameras)
        ? parsed.cameras
        : [];

    const dedup = new Map();
    rows.forEach((row, idx) => {
      const normalized = normalizeCameraEntry(row, idx);
      if (normalized) dedup.set(normalized.id, normalized);
    });

    if (dedup.size === 0) return fallback;
    return Array.from(dedup.values());
  } catch (err) {
    console.warn(`[CATALOG] Failed to load ${CAMERA_CATALOG_PATH}: ${err.message}`);
    return fallback;
  }
}

let CAMERA_DB = loadCameraCatalog(STATIC_CAMERA_DB);

// ─────────────────────────────────────────────
// OPTIONAL: Windy Webcams API proxy
// Set WINDY_API_KEY env var, then fetch webcams via:
//   GET /api/windy/webcams?lat=...&lon=...&radiusKm=50
//   GET /api/windy/snapshot/:cameraId
// ─────────────────────────────────────────────
const WINDY_KEY = process.env.WINDY_API_KEY || null;
const WINDY_NEARBY_RADIUS_KM = Math.min(Math.max(parseInt(process.env.WINDY_NEARBY_RADIUS_KM || '120', 10) || 120, 10), 250);
const WINDY_NEARBY_LIMIT = Math.min(Math.max(parseInt(process.env.WINDY_NEARBY_LIMIT || '12', 10) || 12, 3), 50);
const WINDY_RECENT_TTL_MS = Math.min(Math.max(parseInt(process.env.WINDY_RECENT_TTL_MS || '900000', 10) || 900000, 60000), 3600000);

const windyCameraCache = new Map();
const recentWindyWebcamUse = new Map();

function cleanupRecentWindyUse(now = Date.now()) {
  for (const [webcamId, expiresAt] of recentWindyWebcamUse.entries()) {
    if (expiresAt <= now) recentWindyWebcamUse.delete(webcamId);
  }
}

async function resolveNearbyWindyWebcamId(camera) {
  if (!WINDY_KEY || !camera) return null;

  cleanupRecentWindyUse();

  const cached = windyCameraCache.get(camera.id);
  if (cached?.candidateIds?.length) {
    const total = cached.candidateIds.length;
    for (let i = 0; i < total; i++) {
      const idx = (cached.nextIndex + i) % total;
      const webcamId = cached.candidateIds[idx];
      if (!recentWindyWebcamUse.has(webcamId)) {
        cached.nextIndex = (idx + 1) % total;
        recentWindyWebcamUse.set(webcamId, Date.now() + WINDY_RECENT_TTL_MS);
        return webcamId;
      }
    }

    // If all candidates are recently used, rotate anyway.
    const webcamId = cached.candidateIds[cached.nextIndex % total];
    cached.nextIndex = (cached.nextIndex + 1) % total;
    recentWindyWebcamUse.set(webcamId, Date.now() + WINDY_RECENT_TTL_MS);
    return webcamId;
  }

  if (cached && cached.missing) {
    return null;
  }

  const fetch = require('node-fetch');
  const url = `https://api.windy.com/webcams/api/v3/webcams?nearby=${camera.lat},${camera.lon},${WINDY_NEARBY_RADIUS_KM}&include=images&limit=${WINDY_NEARBY_LIMIT}`;

  try {
    const r = await fetch(url, { headers: { 'x-windy-api-key': WINDY_KEY } });
    if (!r.ok) {
      windyCameraCache.set(camera.id, { missing: true, candidateIds: [], nextIndex: 0 });
      return null;
    }

    const payload = await r.json();
    const webcams = payload?.webcams || [];
    const candidateIds = webcams
      .filter(w => w?.webcamId && (w?.images?.current?.preview || w?.images?.daylight?.preview))
      .map(w => String(w.webcamId));

    if (candidateIds.length === 0) {
      windyCameraCache.set(camera.id, { missing: true, candidateIds: [], nextIndex: 0 });
      return null;
    }

    windyCameraCache.set(camera.id, { missing: false, candidateIds, nextIndex: 1 % candidateIds.length });
    const webcamId = candidateIds[0];
    recentWindyWebcamUse.set(webcamId, Date.now() + WINDY_RECENT_TTL_MS);
    return webcamId;
  } catch (e) {
    windyCameraCache.set(camera.id, { missing: true, candidateIds: [], nextIndex: 0 });
    return null;
  }
}

function buildFallbackCameraImageUrl(camera) {
  const label = encodeURIComponent((camera?.location || 'Camera unavailable').slice(0, 48));
  return `https://placehold.co/1280x720/05070a/22c55e?text=${label}`;
}

app.get('/api/windy/webcams', async (req, res) => {
  if (!WINDY_KEY) return res.status(503).json({ error: 'Windy API key not configured' });
  const fetch = require('node-fetch');
  const { lat, lon, radiusKm = '50', limit = '20', offset = '0' } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: 'lat and lon are required' });
  }

  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
  const safeRadiusKm = Math.min(Math.max(parseInt(radiusKm, 10) || 50, 1), 250);
  const safeOffset = Math.min(Math.max(parseInt(offset, 10) || 0, 0), 1000);
  const url = `https://api.windy.com/webcams/api/v3/webcams?nearby=${lat},${lon},${safeRadiusKm}&include=images,location,player&limit=${safeLimit}&offset=${safeOffset}`;

  try {
    const r = await fetch(url, { headers: { 'x-windy-api-key': WINDY_KEY } });
    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).json({ error: 'Windy request failed', detail: text.slice(0, 300) });
    }

    const payload = await r.json();
    const webcams = (payload?.webcams || []).map(cam => ({
      id: String(cam.webcamId),
      title: cam.title,
      location: cam.location,
      imageUrl: cam?.images?.current?.preview || cam?.images?.daylight?.preview || null,
      playerUrl: cam?.player?.live?.embed || cam?.player?.day?.embed || null
    }));

    res.json({ webcams, total: payload?.total ?? webcams.length, offset: safeOffset, limit: safeLimit });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/windy/snapshot/:id', async (req, res) => {
  if (!WINDY_KEY) return res.status(503).json({ error: 'Windy API key not configured' });
  const fetch = require('node-fetch');
  const url = `https://api.windy.com/webcams/api/v3/webcams?webcamIds=${encodeURIComponent(req.params.id)}&include=images`;

  try {
    const r = await fetch(url, { headers: { 'x-windy-api-key': WINDY_KEY } });
    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).json({ error: 'Windy request failed', detail: text.slice(0, 300) });
    }

    const payload = await r.json();
    const imageUrl = payload?.webcams?.[0]?.images?.current?.preview || payload?.webcams?.[0]?.images?.daylight?.preview;

    if (!imageUrl) {
      return res.status(404).json({ error: 'Snapshot not available for this webcam' });
    }

    res.redirect(imageUrl);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Proxy external camera images through our own backend so the browser
// does not depend on third-party hotlink policies.
app.get('/api/camera-image/:id', async (req, res) => {
  const fetch = require('node-fetch');
  const cam = CAMERA_DB.find(c => c.id === req.params.id);

  if (!cam) {
    return res.status(404).json({ error: 'Camera not found' });
  }

  const sourceUrl = cam.imgUrl;

  // Prefer a nearby Windy webcam at runtime when available.
  const windyWebcamId = await resolveNearbyWindyWebcamId(cam);
  if (windyWebcamId) {
    return res.redirect(`/api/windy/snapshot/${encodeURIComponent(windyWebcamId)}`);
  }

  if (!sourceUrl) {
    return res.redirect(buildFallbackCameraImageUrl(cam));
  }

  // Allow camera records to point at our own API routes (e.g. Windy snapshots).
  if (sourceUrl.startsWith('/')) {
    return res.redirect(sourceUrl);
  }

  try {
    const upstream = await fetch(sourceUrl, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Camguessr/1.0)',
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'
      }
    });

    if (!upstream.ok || !upstream.body) {
      return res.redirect(buildFallbackCameraImageUrl(cam));
    }

    res.set('Content-Type', upstream.headers.get('content-type') || 'image/jpeg');
    res.set('Cache-Control', 'no-store');
    upstream.body.pipe(res);
  } catch (e) {
    res.redirect(buildFallbackCameraImageUrl(cam));
  }
});

// Simple cameras list for client
app.get('/api/cameras', (req, res) => {
  res.json(CAMERA_DB.map(c => ({ ...c, imgUrl: undefined })));
});

app.get('/api/cameras/meta', (req, res) => {
  res.json({
    total: CAMERA_DB.length,
    catalogPath: CAMERA_CATALOG_PATH,
    hasWindyKey: Boolean(WINDY_KEY)
  });
});

app.get('/api/cameras/rounds', (req, res) => {
  const requested = parseInt(req.query.count, 10);
  const count = Math.min(Math.max(Number.isFinite(requested) ? requested : ROUND_COUNT, 1), 10);
  const rounds = pickBalancedCameras(CAMERA_DB, count);
  addToRecentHistory(rounds.map(c => c.id));
  res.json(rounds);
});

// ─────────────────────────────────────────────
// GAME ROOMS
// ─────────────────────────────────────────────
const rooms = new Map();
const ROUND_COUNT = 5;
const ROUND_DURATION = 60; // seconds per round
const GLOBAL_RECENT_CAMERA_HISTORY = Math.min(Math.max(parseInt(process.env.GLOBAL_RECENT_CAMERA_HISTORY || '250', 10) || 250, 20), 5000);
const recentCameraIds = [];

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getMacroRegion(camera) {
  const lat = Number(camera?.lat);
  const lon = Number(camera?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return 'other';

  if (lon >= -170 && lon <= -30 && lat >= 8) return 'north_america';
  if (lon >= -95 && lon <= -30 && lat < 8) return 'south_america';
  if (lon >= -25 && lon <= 60 && lat >= 34) return 'europe';
  if (lon >= -20 && lon <= 55 && lat > -37 && lat < 37) return 'africa';
  if (lon >= 55 && lon <= 180 && lat >= -10) return 'asia';
  if (lon >= 110 && lon <= 180 && lat < -10) return 'oceania';
  return 'other';
}

function pickBalancedCameras(pool, count) {
  const candidates = shuffleArray(pool);
  const selected = [];
  const selectedIds = new Set();
  const countryCount = new Map();
  const providerCount = new Map();
  const regionCount = new Map();
  const recentSet = new Set(recentCameraIds);

  const tryPick = (cam, limits) => {
    if (!cam || selectedIds.has(cam.id)) return false;

    const country = String(cam.country || 'Unknown').trim();
    const provider = String(cam.provider || 'seed').trim().toLowerCase();
    const region = getMacroRegion(cam);

    if ((countryCount.get(country) || 0) >= limits.maxPerCountry) return false;
    if ((providerCount.get(provider) || 0) >= limits.maxPerProvider) return false;
    if (country === 'United States' && (countryCount.get(country) || 0) >= limits.maxUS) return false;
    if ((regionCount.get(region) || 0) >= limits.maxPerRegion) return false;

    selected.push(cam);
    selectedIds.add(cam.id);
    countryCount.set(country, (countryCount.get(country) || 0) + 1);
    providerCount.set(provider, (providerCount.get(provider) || 0) + 1);
    regionCount.set(region, (regionCount.get(region) || 0) + 1);
    return true;
  };

  const passes = [
    {
      maxPerCountry: 1,
      maxPerProvider: 2,
      maxUS: 1,
      maxPerRegion: 2,
      avoidRecent: true
    },
    {
      maxPerCountry: 1,
      maxPerProvider: 3,
      maxUS: 1,
      maxPerRegion: 3,
      avoidRecent: false
    }
  ];

  for (const limits of passes) {
    for (const cam of candidates) {
      if (selected.length >= count) break;
      if (limits.avoidRecent && recentSet.has(cam.id)) continue;
      tryPick(cam, limits);
    }
    if (selected.length >= count) break;
  }

  // Preserve unique countries as long as possible, even if provider/region caps are exhausted.
  if (selected.length < count) {
    for (const cam of candidates) {
      if (selected.length >= count) break;
      if (selectedIds.has(cam.id)) continue;

      const country = String(cam.country || 'Unknown').trim();
      if ((countryCount.get(country) || 0) >= 1) continue;
      if (country === 'United States' && (countryCount.get(country) || 0) >= 1) continue;

      selected.push(cam);
      selectedIds.add(cam.id);
      countryCount.set(country, (countryCount.get(country) || 0) + 1);
    }
  }

  if (selected.length < count) {
    for (const cam of candidates) {
      if (selected.length >= count) break;
      if (!selectedIds.has(cam.id)) {
        selected.push(cam);
        selectedIds.add(cam.id);
      }
    }
  }

  return selected.slice(0, count);
}

function addToRecentHistory(cameraIds) {
  for (const id of cameraIds) {
    recentCameraIds.push(id);
  }
  while (recentCameraIds.length > GLOBAL_RECENT_CAMERA_HISTORY) {
    recentCameraIds.shift();
  }
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calcPoints(distKm) {
  if (distKm < 10) return 5000;
  if (distKm < 100) return Math.round(5000 - (distKm - 10) * 40);
  if (distKm < 1000) return Math.round(1400 - (distKm - 100) * 1.1);
  if (distKm < 5000) return Math.round(400 - (distKm - 1000) * 0.08);
  return 0;
}

function createRoom(hostId, hostName) {
  let code;
  do { code = generateCode(); } while (rooms.has(code));

  const cameras = pickBalancedCameras(CAMERA_DB, ROUND_COUNT);
  addToRecentHistory(cameras.map(c => c.id));

  const room = {
    code,
    host: hostId,
    players: new Map([[hostId, {
      id: hostId,
      name: hostName,
      score: 0,
      ready: false,
      roundResults: [],
      currentGuess: null,
      credits: 500
    }]]),
    cameras,
    round: -1,
    phase: 'lobby', // lobby | playing | roundResult | finished
    timer: null,
    timeLeft: ROUND_DURATION,
    guessesIn: new Set()
  };

  rooms.set(code, room);
  return room;
}

function getRoomPublicState(room) {
  return {
    code: room.code,
    host: room.host,
    phase: room.phase,
    round: room.round,
    totalRounds: ROUND_COUNT,
    timeLeft: room.timeLeft,
    players: Array.from(room.players.values()).map(p => ({
      id: p.id,
      name: p.name,
      score: p.score,
      ready: p.ready,
      hasGuessed: room.guessesIn.has(p.id),
      credits: p.credits
    }))
  };
}

function getCurrentCamera(room) {
  if (room.round < 0 || room.round >= room.cameras.length) return null;
  const cam = room.cameras[room.round];
  // Never send lat/lon to clients during active round
  return {
    id: cam.id,
    imgUrl: `/api/camera-image/${encodeURIComponent(cam.id)}`,
    clues: cam.clues
  };
}

function startRound(room) {
  room.round++;
  room.phase = 'playing';
  room.guessesIn = new Set();
  room.timeLeft = ROUND_DURATION;

  // Clear per-round guesses
  room.players.forEach(p => { p.currentGuess = null; });

  const cam = getCurrentCamera(room);
  io.to(room.code).emit('roundStart', {
    round: room.round,
    totalRounds: ROUND_COUNT,
    camera: cam,
    timeLeft: room.timeLeft
  });

  // Start countdown
  if (room.timer) clearInterval(room.timer);
  room.timer = setInterval(() => {
    room.timeLeft--;
    io.to(room.code).emit('timerTick', { timeLeft: room.timeLeft });

    if (room.timeLeft <= 0) {
      clearInterval(room.timer);
      endRound(room);
    }
  }, 1000);
}

function endRound(room) {
  if (room.timer) { clearInterval(room.timer); room.timer = null; }
  room.phase = 'roundResult';

  const actualCam = room.cameras[room.round];

  // Score all players
  const results = [];
  room.players.forEach(player => {
    let dist = null, pts = 0;
    if (player.currentGuess) {
      dist = haversineDistance(
        player.currentGuess.lat, player.currentGuess.lon,
        actualCam.lat, actualCam.lon
      );
      pts = calcPoints(dist);
    }
    player.score += pts;
    player.roundResults.push({ round: room.round, dist, pts, cumulative: player.score });
    results.push({
      playerId: player.id,
      playerName: player.name,
      guess: player.currentGuess,
      dist: dist ? Math.round(dist) : null,
      pts,
      score: player.score
    });
  });

  results.sort((a, b) => b.score - a.score);

  io.to(room.code).emit('roundEnd', {
    round: room.round,
    actualCamera: {
      id: actualCam.id,
      location: actualCam.location,
      city: actualCam.city,
      state: actualCam.state,
      country: actualCam.country,
      lat: actualCam.lat,
      lon: actualCam.lon
    },
    results,
    leaderboard: results
  });

  // Auto-advance after 8 seconds
  setTimeout(() => {
    if (!rooms.has(room.code)) return;
    if (room.round + 1 >= ROUND_COUNT) {
      endGame(room);
    } else {
      startRound(room);
    }
  }, 8000);
}

function endGame(room) {
  room.phase = 'finished';
  const finalLeaderboard = Array.from(room.players.values())
    .map(p => ({ id: p.id, name: p.name, score: p.score, roundResults: p.roundResults }))
    .sort((a, b) => b.score - a.score);

  io.to(room.code).emit('gameOver', { leaderboard: finalLeaderboard });

  // Clean up room after 5 minutes
  setTimeout(() => rooms.delete(room.code), 300000);
}

// ─────────────────────────────────────────────
// SOCKET.IO EVENTS
// ─────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[+] Client connected: ${socket.id}`);

  // ── Create room ──
  socket.on('createRoom', ({ name }) => {
    const playerName = (name || 'AGENT').toUpperCase().replace(/[^A-Z0-9_]/g, '').slice(0, 16);
    const room = createRoom(socket.id, playerName);
    socket.join(room.code);
    socket.data.roomCode = room.code;
    socket.data.name = playerName;

    socket.emit('roomCreated', {
      code: room.code,
      roomState: getRoomPublicState(room)
    });

    console.log(`[ROOM] Created: ${room.code} by ${playerName}`);
  });

  // ── Join room ──
  socket.on('joinRoom', ({ code, name }) => {
    const roomCode = (code || '').toUpperCase().trim();
    const playerName = (name || 'AGENT').toUpperCase().replace(/[^A-Z0-9_]/g, '').slice(0, 16);
    const room = rooms.get(roomCode);

    if (!room) {
      socket.emit('error', { message: 'ROOM NOT FOUND — invalid access code' });
      return;
    }
    if (room.phase !== 'lobby') {
      socket.emit('error', { message: 'OPERATION IN PROGRESS — cannot join mid-game' });
      return;
    }
    if (room.players.size >= 8) {
      socket.emit('error', { message: 'CHANNEL FULL — maximum operatives reached' });
      return;
    }

    room.players.set(socket.id, {
      id: socket.id,
      name: playerName,
      score: 0,
      ready: false,
      roundResults: [],
      currentGuess: null,
      credits: 500
    });

    socket.join(roomCode);
    socket.data.roomCode = roomCode;
    socket.data.name = playerName;

    socket.emit('roomJoined', {
      code: roomCode,
      roomState: getRoomPublicState(room)
    });

    io.to(roomCode).emit('playerJoined', {
      playerName,
      roomState: getRoomPublicState(room)
    });

    console.log(`[ROOM] ${playerName} joined ${roomCode}`);
  });

  // ── Player ready ──
  socket.on('playerReady', () => {
    const room = rooms.get(socket.data.roomCode);
    if (!room) return;
    const player = room.players.get(socket.id);
    if (!player) return;

    player.ready = true;
    io.to(room.code).emit('lobbyUpdate', { roomState: getRoomPublicState(room) });

    // Auto-start if all ready (and at least 2 players, or host is alone)
    const allReady = Array.from(room.players.values()).every(p => p.ready);
    if (allReady && room.players.size >= 1) {
      setTimeout(() => startRound(room), 1000);
    }
  });

  // ── Host force start ──
  socket.on('startGame', () => {
    const room = rooms.get(socket.data.roomCode);
    if (!room || room.host !== socket.id) return;
    if (room.phase !== 'lobby') return;
    startRound(room);
  });

  // ── Submit guess ──
  socket.on('submitGuess', ({ lat, lon }) => {
    const room = rooms.get(socket.data.roomCode);
    if (!room || room.phase !== 'playing') return;
    const player = room.players.get(socket.id);
    if (!player || room.guessesIn.has(socket.id)) return;

    player.currentGuess = { lat, lon };
    room.guessesIn.add(socket.id);

    // Notify all players someone guessed (no coords revealed yet)
    io.to(room.code).emit('playerGuessed', {
      playerName: player.name,
      guessesIn: room.guessesIn.size,
      totalPlayers: room.players.size,
      roomState: getRoomPublicState(room)
    });

    // If everyone guessed, end round early
    if (room.guessesIn.size >= room.players.size) {
      if (room.timer) { clearInterval(room.timer); room.timer = null; }
      setTimeout(() => endRound(room), 800);
    }
  });

  // ── Buy clue ──
  socket.on('buyClue', ({ clueIndex }) => {
    const room = rooms.get(socket.data.roomCode);
    if (!room) return;
    const player = room.players.get(socket.id);
    if (!player || player.credits < 100) {
      socket.emit('error', { message: 'INSUFFICIENT CREDITS' });
      return;
    }
    player.credits -= 100;
    socket.emit('clueGranted', {
      clueIndex,
      credits: player.credits
    });
  });

  // ── Chat message ──
  socket.on('chatMessage', ({ text }) => {
    const room = rooms.get(socket.data.roomCode);
    if (!room) return;
    const player = room.players.get(socket.id);
    if (!player) return;
    const clean = (text || '').slice(0, 120);
    io.to(room.code).emit('chatMessage', {
      name: player.name,
      text: clean,
      ts: Date.now()
    });
  });

  // ── Disconnect ──
  socket.on('disconnect', () => {
    const room = rooms.get(socket.data.roomCode);
    if (!room) return;

    room.players.delete(socket.id);
    console.log(`[-] ${socket.data.name} left ${socket.data.roomCode}`);

    if (room.players.size === 0) {
      if (room.timer) clearInterval(room.timer);
      rooms.delete(socket.data.roomCode);
      console.log(`[ROOM] Destroyed: ${socket.data.roomCode} (empty)`);
      return;
    }

    // Transfer host if needed
    if (room.host === socket.id) {
      room.host = room.players.keys().next().value;
      io.to(room.code).emit('hostChanged', { newHost: room.host });
    }

    io.to(room.code).emit('playerLeft', {
      playerName: socket.data.name,
      roomState: getRoomPublicState(room)
    });

    // If everyone left during playing, end round
    if (room.phase === 'playing' && room.guessesIn.size >= room.players.size && room.players.size > 0) {
      if (room.timer) { clearInterval(room.timer); room.timer = null; }
      endRound(room);
    }
  });
});

// ─────────────────────────────────────────────
// START
// ─────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════════╗`);
  console.log(`║   CAMGUESSR SERVER — PORT ${PORT}        ║`);
  console.log(`╚══════════════════════════════════════╝`);
  console.log(`  http://localhost:${PORT}`);
  console.log(`  Active camera pool: ${CAMERA_DB.length}`);
  if (WINDY_KEY) console.log(`  Windy Webcams API: CONNECTED`);
  else console.log(`  Windy Webcams API: not configured (set WINDY_API_KEY)`);
  console.log('');
});
