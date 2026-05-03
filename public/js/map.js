// ─────────────────────────────────────────────
// MAP.JS — Leaflet/OpenStreetMap + geo math
// ─────────────────────────────────────────────

const WorldMap = (() => {
  const MARKER_COLORS = ['#ffaa00', '#00aaff', '#ff44aa', '#aa00ff', '#00ffcc', '#ff8800', '#44ff00', '#ff0044'];

  let gameMap = null;
  let gameTileLayer = null;
  let gameGuessMarker = null;
  let gameClickHandler = null;

  let resultMap = null;
  let resultTileLayer = null;
  let resultLayerGroup = null;
  let resultContainerId = null;

  function ensureLeaflet() {
    if (!window.L) {
      throw new Error('Leaflet is not loaded. Add leaflet.js and leaflet.css to index.html.');
    }
  }

  function createTileLayer() {
      return L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      minZoom: 1,
        subdomains: 'abcd',
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
    });
  }

  function fitWorld(map, animate = false) {
    map.fitBounds([[-60, -180], [84, 180]], {
      padding: [8, 8],
      animate
    });
  }

  function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function calcPoints(distKm) {
    if (distKm < 10)   return 5000;
    if (distKm < 100)  return Math.round(5000 - (distKm - 10) * 40);
    if (distKm < 1000) return Math.round(1400 - (distKm - 100) * 1.1);
    if (distKm < 5000) return Math.round(400 - (distKm - 1000) * 0.08);
    return 0;
  }

  function initGameMap(containerId, onGuessSelected) {
    ensureLeaflet();
    const el = document.getElementById(containerId);
    if (!el) return;

    if (!gameMap) {
      gameMap = L.map(el, {
        worldCopyJump: false,
        zoomControl: true,
        minZoom: 1,
        maxZoom: 18
      });
      gameTileLayer = createTileLayer();
      gameTileLayer.addTo(gameMap);
      fitWorld(gameMap, false);
    }

    if (gameClickHandler) {
      gameMap.off('click', gameClickHandler);
    }

    gameClickHandler = (e) => {
      const { lat, lng } = e.latlng;
      setGameGuess({ lat, lon: lng }, true);
      if (typeof onGuessSelected === 'function') {
        onGuessSelected({ lat, lon: lng });
      }
    };

    gameMap.on('click', gameClickHandler);
    setTimeout(() => gameMap.invalidateSize(), 0);
  }

  function setGameGuess(guess, recenter = false) {
    if (!gameMap || !guess) return;
    const ll = [guess.lat, guess.lon];

    if (!gameGuessMarker) {
      gameGuessMarker = L.circleMarker(ll, {
        radius: 7,
        color: '#00ff41',
        fillColor: '#00ff41',
        fillOpacity: 0.4,
        weight: 2
      }).addTo(gameMap);
    } else {
      gameGuessMarker.setLatLng(ll);
    }

    if (recenter) {
      const nextZoom = Math.max(gameMap.getZoom(), 3);
      gameMap.setView(ll, nextZoom, { animate: true });
    }
  }

  function clearGameGuess() {
    if (gameGuessMarker && gameMap) {
      gameMap.removeLayer(gameGuessMarker);
      gameGuessMarker = null;
    }
  }

  function prepareResultMap(containerId) {
    ensureLeaflet();
    const el = document.getElementById(containerId);
    if (!el) return null;

    if (resultMap && resultContainerId && resultContainerId !== containerId) {
      resultMap.remove();
      resultMap = null;
      resultTileLayer = null;
      resultLayerGroup = null;
    }

    if (!resultMap) {
      resultMap = L.map(el, {
        worldCopyJump: false,
        zoomControl: true,
        minZoom: 1,
        maxZoom: 18
      });
      resultTileLayer = createTileLayer();
      resultTileLayer.addTo(resultMap);
      resultContainerId = containerId;
    }

    if (!resultLayerGroup) {
      resultLayerGroup = L.layerGroup().addTo(resultMap);
    } else {
      resultLayerGroup.clearLayers();
    }

    setTimeout(() => resultMap.invalidateSize(), 0);
    return resultMap;
  }

  function addResultPoint(map, lat, lon, color, popupLabel) {
    return L.circleMarker([lat, lon], {
      radius: 7,
      color,
      fillColor: color,
      fillOpacity: 0.35,
      weight: 2
    }).bindPopup(popupLabel || '').addTo(resultLayerGroup);
  }

  function colorFromKey(key) {
    const text = String(key || 'anon');
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % MARKER_COLORS.length;
    return MARKER_COLORS[idx];
  }

  function drawResultMap(containerId, opts = {}) {
    const map = prepareResultMap(containerId);
    if (!map || !opts.actual) return;

    const boundsPoints = [];
    const actualMarker = addResultPoint(map, opts.actual.lat, opts.actual.lon, '#00ff41', 'ACTUAL LOCATION');
    boundsPoints.push(actualMarker.getLatLng());

    if (opts.results && Array.isArray(opts.results)) {
      opts.results.forEach((r, idx) => {
        if (!r.guess) return;
        const color = MARKER_COLORS[idx % MARKER_COLORS.length];
        const label = r.playerName ? `${r.playerName}` : `GUESS ${idx + 1}`;
        const marker = addResultPoint(map, r.guess.lat, r.guess.lon, color, label);
        boundsPoints.push(marker.getLatLng());

        L.polyline([
          [r.guess.lat, r.guess.lon],
          [opts.actual.lat, opts.actual.lon]
        ], {
          color,
          weight: 2,
          opacity: 0.5,
          dashArray: '5 6'
        }).addTo(resultLayerGroup);
      });
    } else if (opts.guess) {
      const marker = addResultPoint(map, opts.guess.lat, opts.guess.lon, '#ffaa00', 'YOUR GUESS');
      boundsPoints.push(marker.getLatLng());

      L.polyline([
        [opts.guess.lat, opts.guess.lon],
        [opts.actual.lat, opts.actual.lon]
      ], {
        color: '#ffaa00',
        weight: 2,
        opacity: 0.6,
        dashArray: '5 6'
      }).addTo(resultLayerGroup);
    }

    if (boundsPoints.length > 1) {
      map.fitBounds(L.latLngBounds(boundsPoints), { padding: [18, 18], animate: true });
    } else {
      map.setView([opts.actual.lat, opts.actual.lon], 5, { animate: true });
    }
  }

  function drawFinalSummaryMap(containerId, rounds = []) {
    const map = prepareResultMap(containerId);
    if (!map || !Array.isArray(rounds) || rounds.length === 0) return;

    const boundsPoints = [];

    rounds.forEach((roundInfo) => {
      if (!roundInfo || !roundInfo.actual) return;

      const actualLabel = `ROUND ${roundInfo.round} ACTUAL: ${roundInfo.actual.location || 'Unknown'}`;
      const actualMarker = addResultPoint(map, roundInfo.actual.lat, roundInfo.actual.lon, '#00ff41', actualLabel);
      boundsPoints.push(actualMarker.getLatLng());

      (roundInfo.guesses || []).forEach((entry) => {
        if (!entry || !entry.guess) return;
        const color = colorFromKey(entry.playerId || entry.playerName);
        const distText = entry.dist !== null && entry.dist !== undefined ? `${entry.dist}km off` : 'No guess';
        const label = `R${roundInfo.round} ${entry.playerName}: ${distText}`;
        const marker = addResultPoint(map, entry.guess.lat, entry.guess.lon, color, label);
        boundsPoints.push(marker.getLatLng());

        L.polyline([
          [entry.guess.lat, entry.guess.lon],
          [roundInfo.actual.lat, roundInfo.actual.lon]
        ], {
          color,
          weight: 2,
          opacity: 0.45,
          dashArray: '4 7'
        }).addTo(resultLayerGroup);
      });
    });

    if (boundsPoints.length > 1) {
      map.fitBounds(L.latLngBounds(boundsPoints), { padding: [22, 22], animate: true });
    } else if (boundsPoints.length === 1) {
      map.setView(boundsPoints[0], 4, { animate: true });
    } else {
      fitWorld(map, true);
    }
  }

  function resetGameMapView() {
    if (!gameMap) return;
    fitWorld(gameMap, true);
    setTimeout(() => gameMap.invalidateSize(), 0);
  }

  function refreshGameMapSize() {
    if (!gameMap) return;
    setTimeout(() => gameMap.invalidateSize(), 0);
  }

  return {
    haversineKm,
    calcPoints,
    initGameMap,
    setGameGuess,
    clearGameGuess,
    resetGameMapView,
    refreshGameMapSize,
    drawResultMap,
    drawFinalSummaryMap
  };
})();
