#!/usr/bin/env node
/* eslint-disable no-console */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const WINDY_KEY = process.env.WINDY_API_KEY || '';
const CATALOG_PATH = path.resolve(process.env.CAMERA_CATALOG_PATH || path.join(__dirname, '../data/camera-catalog.json'));

const WINDY_RADIUS_KM = Math.min(Math.max(parseInt(process.env.SYNC_WINDY_RADIUS_KM || '250', 10) || 250, 20), 250);
const WINDY_LIMIT = Math.min(Math.max(parseInt(process.env.SYNC_WINDY_LIMIT || '50', 10) || 50, 5), 50);
const WINDY_MAX_TILES = Math.min(Math.max(parseInt(process.env.SYNC_WINDY_MAX_TILES || '180', 10) || 180, 1), 800);
const WINDY_DELAY_MS = Math.min(Math.max(parseInt(process.env.SYNC_WINDY_DELAY_MS || '60', 10) || 60, 0), 1000);
const WINDY_OFFSETS = String(process.env.SYNC_WINDY_OFFSETS || '0,50,100,150')
  .split(',')
  .map(v => parseInt(v.trim(), 10))
  .filter(v => Number.isFinite(v) && v >= 0 && v <= 1000);

const SYNC_INCLUDE_NYC = String(process.env.SYNC_INCLUDE_NYC || 'true').toLowerCase() !== 'false';
const SYNC_INCLUDE_ONTARIO = String(process.env.SYNC_INCLUDE_ONTARIO || 'true').toLowerCase() !== 'false';
const SYNC_INCLUDE_ALBERTA = String(process.env.SYNC_INCLUDE_ALBERTA || 'true').toLowerCase() !== 'false';
const SYNC_MAX_PER_PROVIDER = Math.min(Math.max(parseInt(process.env.SYNC_MAX_PER_PROVIDER || '1200', 10) || 1200, 50), 20000);
const SYNC_MAX_PER_COUNTRY = Math.min(Math.max(parseInt(process.env.SYNC_MAX_PER_COUNTRY || '180', 10) || 180, 20), 5000);
const SYNC_MAX_US = Math.min(Math.max(parseInt(process.env.SYNC_MAX_US || '260', 10) || 260, 20), 5000);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function createGlobalTiles() {
  const priorityTiles = [
    { lat: 40.7128, lon: -74.0060 }, // New York
    { lat: 34.0522, lon: -118.2437 }, // Los Angeles
    { lat: 41.8781, lon: -87.6298 }, // Chicago
    { lat: 47.6062, lon: -122.3321 }, // Seattle
    { lat: 29.7604, lon: -95.3698 }, // Houston
    { lat: 51.5074, lon: -0.1278 }, // London
    { lat: 48.8566, lon: 2.3522 }, // Paris
    { lat: 52.5200, lon: 13.4050 }, // Berlin
    { lat: 41.3851, lon: 2.1734 }, // Barcelona
    { lat: 45.4642, lon: 9.1900 }, // Milan
    { lat: 35.6762, lon: 139.6503 }, // Tokyo
    { lat: 34.6937, lon: 135.5023 }, // Osaka
    { lat: 37.5665, lon: 126.9780 }, // Seoul
    { lat: 1.3521, lon: 103.8198 }, // Singapore
    { lat: 13.7563, lon: 100.5018 }, // Bangkok
    { lat: 22.3193, lon: 114.1694 }, // Hong Kong
    { lat: -33.8688, lon: 151.2093 }, // Sydney
    { lat: -37.8136, lon: 144.9631 }, // Melbourne
    { lat: -23.5505, lon: -46.6333 }, // Sao Paulo
    { lat: -22.9068, lon: -43.1729 }, // Rio de Janeiro
    { lat: 19.4326, lon: -99.1332 }, // Mexico City
    { lat: 25.2048, lon: 55.2708 }, // Dubai
    { lat: -26.2041, lon: 28.0473 }, // Johannesburg
    { lat: 30.0444, lon: 31.2357 } // Cairo
  ];

  const tiles = [...priorityTiles];
  const seen = new Set(priorityTiles.map(t => `${Math.round(t.lat * 10)}:${Math.round(t.lon * 10)}`));

  for (let lat = -55; lat <= 75; lat += 10) {
    for (let lon = -170; lon <= 170; lon += 15) {
      const key = `${Math.round(lat * 10)}:${Math.round(lon * 10)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      tiles.push({ lat, lon });
    }
  }

  return tiles;
}

function createDefaultClues(cam) {
  const country = cam.country || 'Unknown country';
  const region = cam.state || cam.region || cam.city || 'regional center';
  return [
    `Live roadway view in ${country}`,
    `Urban and lane-layout hints point toward ${region}`,
    'Vehicle direction and signage style can reveal traffic side',
    'Architecture and street furniture narrow down the region',
    'Use climate and daylight cues to estimate latitude'
  ];
}

function normalizeCamera(raw) {
  const id = String(raw.id || raw.cameraId || '').trim();
  const lat = Number(raw.lat);
  const lon = Number(raw.lon);
  if (!id || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  return {
    id,
    location: raw.location || raw.title || `${raw.city || 'Unknown'}, ${raw.country || 'Unknown'}`,
    city: raw.city || 'Unknown',
    state: raw.state || raw.region || 'Unknown',
    country: raw.country || 'Unknown',
    lat,
    lon,
    imgUrl: raw.imgUrl || null,
    clues: Array.isArray(raw.clues) && raw.clues.length > 0 ? raw.clues : createDefaultClues(raw),
    provider: raw.provider || 'unknown'
  };
}

function upsert(map, row) {
  const normalized = normalizeCamera(row);
  if (!normalized) return;
  map.set(normalized.id, normalized);
}

async function syncWindy(cameraMap) {
  if (!WINDY_KEY) {
    console.warn('[SYNC] WINDY_API_KEY missing, skipping Windy ingest');
    return;
  }

  const tiles = createGlobalTiles().slice(0, WINDY_MAX_TILES);
  console.log(`[SYNC] Windy ingest over ${tiles.length} geo tiles`);

  for (let i = 0; i < tiles.length; i++) {
    const tile = tiles[i];

    for (const offset of WINDY_OFFSETS) {
      const url = `https://api.windy.com/webcams/api/v3/webcams?nearby=${tile.lat},${tile.lon},${WINDY_RADIUS_KM}&include=images,location&limit=${WINDY_LIMIT}&offset=${offset}`;

      try {
        const resp = await fetch(url, { headers: { 'x-windy-api-key': WINDY_KEY } });
        if (!resp.ok) {
          break;
        }

        const payload = await resp.json();
        const webcams = Array.isArray(payload?.webcams) ? payload.webcams : [];
        if (webcams.length === 0) break;

        for (const cam of webcams) {
          if (!cam?.webcamId) continue;
          if (!cam?.images?.current?.preview && !cam?.images?.daylight?.preview) continue;

          const location = cam.location || {};
          upsert(cameraMap, {
            id: `windy_${cam.webcamId}`,
            cameraId: `windy_${cam.webcamId}`,
            location: cam.title || `${location.city || 'Unknown'} webcam`,
            city: location.city || 'Unknown',
            state: location.region || 'Unknown',
            country: location.country || 'Unknown',
            lat: location.latitude,
            lon: location.longitude,
            imgUrl: `/api/windy/snapshot/${encodeURIComponent(String(cam.webcamId))}`,
            provider: 'windy'
          });
        }
      } catch (err) {
        break;
      }

      if (WINDY_DELAY_MS > 0) await sleep(WINDY_DELAY_MS);
    }

    if ((i + 1) % 20 === 0 || i + 1 === tiles.length) {
      console.log(`[SYNC] Windy progress ${i + 1}/${tiles.length} tiles, catalog size ${cameraMap.size}`);
    }
  }
}

async function syncNycTraffic(cameraMap) {
  if (!SYNC_INCLUDE_NYC) {
    console.log('[SYNC] NYC ingest disabled');
    return;
  }

  const url = 'https://webcams.nyctmc.org/api/cameras';

  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      console.warn(`[SYNC] NYC ingest failed with status ${resp.status}`);
      return;
    }

    const rows = await resp.json();
    const cams = Array.isArray(rows) ? rows : [];

    cams.forEach(cam => {
      if (!cam?.id || String(cam.isOnline).toLowerCase() !== 'true') return;
      upsert(cameraMap, {
        id: `nyctmc_${cam.id}`,
        location: cam.name || 'NYC traffic camera',
        city: 'New York City',
        state: 'New York',
        country: 'United States',
        lat: cam.latitude,
        lon: cam.longitude,
        imgUrl: cam.imageUrl || null,
        provider: 'nyctmc',
        clues: [
          'Dense US urban grid and heavy arterial traffic',
          'Northeast roadway markings and signage conventions',
          'Frequent bus lanes, taxis, and mixed commuter patterns',
          'Temperate coastal light with seasonal variation',
          'Large metropolitan street furniture and signal infrastructure'
        ]
      });
    });

    console.log(`[SYNC] NYC ingest complete, added online cameras from ${cams.length} records`);
  } catch (err) {
    console.warn(`[SYNC] NYC ingest failed: ${err.message}`);
  }
}

async function syncOntarioTraffic(cameraMap) {
  if (!SYNC_INCLUDE_ONTARIO) {
    console.log('[SYNC] Ontario ingest disabled');
    return;
  }

  const url = 'https://511on.ca/api/v2/get/cameras';

  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      console.warn(`[SYNC] Ontario ingest failed with status ${resp.status}`);
      return;
    }

    const rows = await resp.json();
    const cams = Array.isArray(rows) ? rows : [];

    cams.forEach(cam => {
      if (!cam?.Id) return;
      const views = Array.isArray(cam.Views) ? cam.Views : [];
      const enabled = views.find(v => String(v?.Status || '').toLowerCase() === 'enabled' && v?.Url);
      const imageUrl = enabled?.Url || views.find(v => v?.Url)?.Url || null;

      if (!imageUrl) return;

      upsert(cameraMap, {
        id: `on511_${cam.Id}`,
        location: cam.Location || `${cam.Roadway || 'Ontario'} traffic camera`,
        city: 'Unknown',
        state: 'Ontario',
        country: 'Canada',
        lat: cam.Latitude,
        lon: cam.Longitude,
        imgUrl: imageUrl,
        provider: 'on511',
        clues: [
          'Canadian roadway conventions and signage style',
          'Temperate climate patterns with seasonal daylight shifts',
          'North American right-hand traffic flow',
          'Provincial highway engineering and camera mast layout',
          'Mixed urban-rural transport corridors in eastern Canada'
        ]
      });
    });

    console.log(`[SYNC] Ontario ingest complete from ${cams.length} records`);
  } catch (err) {
    console.warn(`[SYNC] Ontario ingest failed: ${err.message}`);
  }
}

async function syncAlbertaTraffic(cameraMap) {
  if (!SYNC_INCLUDE_ALBERTA) {
    console.log('[SYNC] Alberta ingest disabled');
    return;
  }

  const url = 'https://511.alberta.ca/api/v2/get/cameras';

  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      console.warn(`[SYNC] Alberta ingest failed with status ${resp.status}`);
      return;
    }

    const rows = await resp.json();
    const cams = Array.isArray(rows) ? rows : [];

    cams.forEach(cam => {
      if (!cam?.Id) return;
      const views = Array.isArray(cam.Views) ? cam.Views : [];
      const enabled = views.find(v => String(v?.Status || '').toLowerCase() === 'enabled' && v?.Url);
      const imageUrl = enabled?.Url || views.find(v => v?.Url)?.Url || null;
      if (!imageUrl) return;

      upsert(cameraMap, {
        id: `ab511_${cam.Id}`,
        location: cam.Location || `${cam.Roadway || 'Alberta'} traffic camera`,
        city: 'Unknown',
        state: 'Alberta',
        country: 'Canada',
        lat: cam.Latitude,
        lon: cam.Longitude,
        imgUrl: imageUrl,
        provider: 'ab511',
        clues: [
          'Canadian prairie and foothill transport corridor patterns',
          'Cold continental climate cues with seasonal extremes',
          'North American right-hand traffic behavior',
          'Long-distance highway geometry and wide shoulders',
          'Western Canada roadway infrastructure signatures'
        ]
      });
    });

    console.log(`[SYNC] Alberta ingest complete from ${cams.length} records`);
  } catch (err) {
    console.warn(`[SYNC] Alberta ingest failed: ${err.message}`);
  }
}

function rebalanceCatalog(cameras) {
  const providerCount = new Map();
  const countryCount = new Map();
  const balanced = [];

  for (const cam of shuffle(cameras)) {
    const provider = cam.provider || 'unknown';
    if (provider === 'wikimedia') continue;
    const country = cam.country || 'Unknown';
    const pCount = providerCount.get(provider) || 0;
    const cCount = countryCount.get(country) || 0;

    const countryCap = country === 'United States' ? SYNC_MAX_US : SYNC_MAX_PER_COUNTRY;
    if (pCount >= SYNC_MAX_PER_PROVIDER) continue;
    if (cCount >= countryCap) continue;

    balanced.push(cam);
    providerCount.set(provider, pCount + 1);
    countryCount.set(country, cCount + 1);
  }

  return balanced;
}

function loadExistingCatalog(cameraMap) {
  if (!fs.existsSync(CATALOG_PATH)) return;

  try {
    const text = fs.readFileSync(CATALOG_PATH, 'utf8');
    const parsed = JSON.parse(text);
    const rows = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.cameras)
        ? parsed.cameras
        : [];

    rows.forEach(row => {
      if (String(row?.provider || '').toLowerCase() === 'wikimedia') return;
      if (String(row?.id || '').toLowerCase().startsWith('wikimedia_')) return;
      upsert(cameraMap, row);
    });
    console.log(`[SYNC] Loaded ${rows.length} existing catalog rows`);
  } catch (err) {
    console.warn(`[SYNC] Failed to read existing catalog: ${err.message}`);
  }
}

function writeCatalog(cameraMap) {
  fs.mkdirSync(path.dirname(CATALOG_PATH), { recursive: true });

  const rawCameras = Array.from(cameraMap.values());
  const cameras = rebalanceCatalog(rawCameras);
  const payload = {
    generatedAt: new Date().toISOString(),
    total: cameras.length,
    rawTotal: rawCameras.length,
    cameras
  };

  fs.writeFileSync(CATALOG_PATH, JSON.stringify(payload, null, 2));
  console.log(`[SYNC] Wrote ${cameras.length} cameras to ${CATALOG_PATH}`);
}

(async () => {
  const cameraMap = new Map();
  loadExistingCatalog(cameraMap);

  await syncWindy(cameraMap);
  await syncNycTraffic(cameraMap);
  await syncOntarioTraffic(cameraMap);
  await syncAlbertaTraffic(cameraMap);

  writeCatalog(cameraMap);
})();
