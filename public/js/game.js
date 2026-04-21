// ─────────────────────────────────────────────
// GAME.JS — Core game logic (SP + shared MP state)
// ─────────────────────────────────────────────

const Game = (() => {
  const state = {
    mode: 'sp',          // 'sp' | 'mp'
    round: 0,
    totalRounds: 5,
    score: 0,
    credits: 500,
    currentCamera: null,
    cameras: [],         // SP only
    guessLat: null,
    guessLon: null,
    cluesRevealed: 0,
    cluesAvailable: [],
    submitted: false,
    timerInterval: null,
    timeLeft: 90,
    roundResults: [],    // SP only
    loadInterval: null,
  };

  let hasInitializedLeafletMap = false;

  const FALLBACK_SP_CAMERAS = [
    {
      id: 'cam_ny_001',
      location: 'Times Square, New York, USA',
      city: 'New York City', state: 'New York', country: 'United States',
      lat: 40.758, lon: -73.985,
      imgUrl: 'https://trafficcamphotobooth.com/cams/511ny/TDOT_CCTV_Camera_0000000000023774.jpg',
      clues: [
        'Dense urban canyon — skyscrapers frame every angle',
        'English signage — Western alphabet confirmed',
        'North American traffic — vehicles drive on right',
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
        'Green highway signage — US DOT standard format',
        'Midwestern US — flat terrain, wide corridors',
        'Traffic density suggests metro population over 2M',
        'Chicago grid street pattern visible overhead'
      ]
    },
    {
      id: 'cam_ca_001',
      location: 'Pacific Coast Highway, Malibu, California',
      city: 'Malibu', state: 'California', country: 'United States',
      lat: 34.019, lon: -118.492,
      imgUrl: 'https://trafficcamphotobooth.com/cams/caltrans/1200233.jpg',
      clues: [
        'Coastal road — ocean visible in background',
        'Right-hand traffic — North American territory',
        'Mediterranean climate — drought-resistant vegetation',
        'Pacific Ocean horizon detected in feed',
        'Caltrans DOT infrastructure — California confirmed'
      ]
    },
    {
      id: 'cam_ca_002',
      location: 'US-101, San Francisco Bay Area',
      city: 'San Francisco', state: 'California', country: 'United States',
      lat: 37.774, lon: -122.419,
      imgUrl: 'https://trafficcamphotobooth.com/cams/caltrans/1200096.jpg',
      clues: [
        'Bay Area elevated freeway — coastal hills behind',
        'Persistent marine fog layer — signature of SF Bay',
        'Heavy tech-commuter traffic — Silicon Valley proximity',
        'Suspension bridge structure detected in distance',
        'Northern California — Caltrans District 4'
      ]
    },
    {
      id: 'cam_nj_001',
      location: 'NJ Turnpike I-95, Newark, New Jersey',
      city: 'Newark', state: 'New Jersey', country: 'United States',
      lat: 40.499, lon: -74.449,
      imgUrl: 'https://trafficcamphotobooth.com/cams/511nj/NJDOT_CCTV_Camera_00004.jpg',
      clues: [
        'New Jersey Turnpike — one of the busiest US toll roads',
        'Port Newark industrial backdrop — major container facility',
        'Heavy commercial vehicle presence — logistics hub',
        'Northeast corridor — densest highway network in North America',
        'NJ DOT traffic management — Garden State'
      ]
    },
    {
      id: 'cam_ga_001',
      location: 'I-285 Perimeter, Atlanta, Georgia',
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
      id: 'cam_tx_001',
      location: 'I-35 Austin, Texas',
      city: 'Austin', state: 'Texas', country: 'United States',
      lat: 30.267, lon: -97.743,
      imgUrl: 'https://trafficcamphotobooth.com/cams/txdot/IH0035-0-006.jpg',
      clues: [
        'Texas DOT highway camera — Lone Star State',
        'Semi-arid scrub vegetation — Central Texas',
        'Wide highway corridor — characteristic Texas infrastructure',
        'Capitol dome skyline visible in some angles',
        'I-35 — the backbone of Central Texas'
      ]
    },
    {
      id: 'cam_wa_001',
      location: 'I-5 Corridor, Seattle, Washington',
      city: 'Seattle', state: 'Washington', country: 'United States',
      lat: 47.606, lon: -122.332,
      imgUrl: 'https://trafficcamphotobooth.com/cams/wsdot/I5-SB-024.jpg',
      clues: [
        'Pacific Northwest highway — tall evergreen conifers',
        'Heavy overcast — marine climate signature',
        'Mountain range silhouette — Cascade Range',
        'Dense urban core approach — major tech city',
        'Washington State DOT — Pacific Northwest'
      ]
    }
  ];

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  async function loadServerRoundSet() {
    try {
      const response = await fetch(`/api/cameras/rounds?count=${state.totalRounds}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const cameras = await response.json();
      if (!Array.isArray(cameras)) throw new Error('Invalid camera payload');

      const usable = cameras.filter(c =>
        Number.isFinite(c.lat) &&
        Number.isFinite(c.lon) &&
        Array.isArray(c.clues) &&
        c.clues.length > 0
      );

      if (usable.length < state.totalRounds) {
        throw new Error('Not enough camera nodes available');
      }

      return usable;
    } catch (err) {
      console.warn('[SP] Balanced camera API unavailable, using fallback list.', err);
      UI.toast('Using offline node set while camera API reconnects', 'warn', 3200);
      return FALLBACK_SP_CAMERAS;
    }
  }

  function initGuessMap() {
    if (hasInitializedLeafletMap) return;

    WorldMap.initGameMap('world-map', ({ lat, lon }) => {
      if (state.submitted) return;
      state.guessLat = lat;
      state.guessLon = lon;

      document.getElementById('selected-coords').innerHTML =
        `<span>LAT: ${state.guessLat.toFixed(2)}° &nbsp; LON: ${state.guessLon.toFixed(2)}°</span>`;
      document.getElementById('submit-btn').disabled = false;
      document.getElementById('map-instructions').textContent = 'ZOOM/PAN ENABLED • CLICK TO UPDATE GUESS';
    });

    hasInitializedLeafletMap = true;
  }

  async function startSinglePlayer() {
    const nameInput = document.getElementById('sp-name-input');
    state.mode = 'sp';
    state.round = 0;
    state.score = 0;
    state.credits = 500;
    state.roundResults = [];

    const pool = await loadServerRoundSet();
    state.cameras = pool.length > state.totalRounds ? shuffle(pool).slice(0, state.totalRounds) : pool;

    UI.showScreen('game-screen');
    document.getElementById('game-chat-section').style.display = 'none';
    document.getElementById('mp-players-overlay').style.display = 'none';
    initGuessMap();
    loadRound();
  }

  function loadRound(camera = null) {
    // Reset state
    state.guessLat = null;
    state.guessLon = null;
    state.cluesRevealed = 0;
    state.submitted = false;

    if (state.timerInterval) { clearInterval(state.timerInterval); state.timerInterval = null; }
    if (state.loadInterval) { clearInterval(state.loadInterval); state.loadInterval = null; }

    const cam = camera || state.cameras[state.round];
    state.currentCamera = cam;
    state.cluesAvailable = cam.clues || [];

    // UI reset
    document.getElementById('round-display').textContent = `${state.round + 1}/${state.totalRounds}`;
    document.getElementById('score-display').textContent = state.score;
    document.getElementById('credits-display').textContent = state.credits;
    document.getElementById('clues-container').innerHTML = '';
    document.getElementById('submit-btn').disabled = true;
    document.getElementById('submit-btn').textContent = '▶ TRANSMIT COORDINATES';
    document.getElementById('selected-coords').textContent = 'SELECT LOCATION ON MAP';
    document.getElementById('buy-clue-btn').disabled = false;
    document.getElementById('buy-clue-btn').textContent = '⬇ DECRYPT NEXT INTEL [-100 credits]';

    // Round dots
    const dots = document.getElementById('round-dots');
    dots.innerHTML = '';
    for (let i = 0; i < state.totalRounds; i++) {
      const dot = document.createElement('div');
      dot.className = 'round-dot' + (i < state.round ? ' done' : i === state.round ? ' current' : '');
      dots.appendChild(dot);
    }

    // Prepare map for a fresh round
    initGuessMap();
    WorldMap.clearGameGuess();
    WorldMap.resetGameMapView();
    document.getElementById('map-instructions').textContent = 'ZOOM WITH SCROLL • DRAG TO PAN • CLICK TO GUESS';

    // Start timer
    startTimer(90);

    // Load camera
    const interval = UI.startCameraLoad(cam.id);
    state.loadInterval = interval;
    setTimeout(() => {
      clearInterval(interval);
      const imgEl = document.getElementById('camera-img');

      const proxyUrl = cam.id ? `/api/camera-image/${encodeURIComponent(cam.id)}` : '';
      const primaryUrl = proxyUrl || (cam.imgUrl || '');
      const fallbackUrl = cam.imgUrl || '';
      const cacheBust = url => `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`;

      imgEl.onerror = () => {
        if (imgEl.dataset.fallbackTried === '1') return;
        imgEl.dataset.fallbackTried = '1';
        if (fallbackUrl && fallbackUrl !== primaryUrl) {
          imgEl.src = cacheBust(fallbackUrl);
        }
      };

      imgEl.dataset.fallbackTried = '0';
      imgEl.src = cacheBust(primaryUrl);
      imgEl.style.display = 'block';
    }, 2200);
  }

  function startTimer(seconds) {
    state.timeLeft = seconds;
    updateTimerUI(seconds, seconds);

    state.timerInterval = setInterval(() => {
      state.timeLeft--;
      updateTimerUI(state.timeLeft, seconds);
      if (state.timeLeft <= 0) {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
        if (!state.submitted) {
          UI.toast('TIME EXPIRED — Auto-submitting...', 'warn');
          submitGuess(true);
        }
      }
    }, 1000);
  }

  function updateTimerUI(timeLeft, total) {
    const el = document.getElementById('timer-display');
    const bar = document.getElementById('timer-bar');
    if (!el || !bar) return;

    el.textContent = timeLeft;
    const pct = Math.max(0, (timeLeft / total) * 100);
    bar.style.width = pct + '%';

    const urgent = timeLeft <= 15;
    el.classList.toggle('urgent', urgent);
    bar.classList.toggle('urgent', urgent);
  }

  function placePin(e) {
    // Legacy no-op. Guesses are now placed via Leaflet click events.
  }

  function buyClue() {
    if (state.credits < 100) { UI.toast('INSUFFICIENT CREDITS', 'err'); return; }
    if (state.cluesRevealed >= state.cluesAvailable.length) return;

    if (state.mode === 'mp') {
      // Ask server
      MP.socket && MP.socket.emit('buyClue', { clueIndex: state.cluesRevealed });
    } else {
      // SP: local
      state.credits -= 100;
      document.getElementById('credits-display').textContent = state.credits;
      UI.renderClue(state.cluesAvailable[state.cluesRevealed], state.cluesRevealed);
      state.cluesRevealed++;
      if (state.cluesRevealed >= state.cluesAvailable.length) {
        document.getElementById('buy-clue-btn').disabled = true;
        document.getElementById('buy-clue-btn').textContent = '// ALL INTEL DECRYPTED';
      }
    }
  }

  function submitGuess(auto = false) {
    if (state.submitted) return;
    state.submitted = true;

    if (state.timerInterval) { clearInterval(state.timerInterval); state.timerInterval = null; }

    const lat = state.guessLat;
    const lon = state.guessLon;

    if (state.mode === 'mp') {
      document.getElementById('submit-btn').disabled = true;
      document.getElementById('submit-btn').textContent = auto ? '⏱ TIME EXPIRED' : '✓ COORDINATES TRANSMITTED';
      if (lat !== null && lon !== null) {
        MP.socket && MP.socket.emit('submitGuess', { lat, lon });
      } else {
        MP.socket && MP.socket.emit('submitGuess', { lat: 0, lon: 0 }); // null guess
      }
      UI.toast(auto ? 'Time up — guess sent' : 'Coordinates transmitted — awaiting others...', 'ok');
      return;
    }

    // Single player result
    const cam = state.currentCamera;
    let dist = null, pts = 0;
    if (lat !== null && lon !== null) {
      dist = WorldMap.haversineKm(lat, lon, cam.lat, cam.lon);
      pts = WorldMap.calcPoints(dist);
    }
    state.score += pts;
    state.roundResults.push({ cam, dist, pts, score: state.score });
    showSPResult(cam, lat, lon, dist, pts);
  }

  function showSPResult(cam, guessLat, guessLon, dist, pts) {
    UI.showScreen('result-screen');
    document.getElementById('result-leaderboard').style.display = 'none';

    const header = document.getElementById('result-header');
    if (pts >= 4000)      { header.textContent = '[ PRECISE INFILTRATION ]'; header.className = 'result-header great'; }
    else if (pts >= 2000) { header.textContent = '[ OPERATIVE CONFIRMED ]'; header.className = 'result-header ok'; }
    else if (pts >= 500)  { header.textContent = '[ PARTIAL SUCCESS ]'; header.className = 'result-header ok'; }
    else                  { header.textContent = '[ TARGET MISSED ]'; header.className = 'result-header fail'; }

    WorldMap.drawResultMap('result-map', {
      guess: guessLat !== null ? { lat: guessLat, lon: guessLon } : null,
      actual: { lat: cam.lat, lon: cam.lon }
    });

    document.getElementById('res-distance').textContent = dist !== null
      ? (dist < 100 ? `${Math.round(dist)}km` : `${Math.round(dist / 10) * 10}km`)
      : 'NO GUESS';
    document.getElementById('res-points').textContent = `+${pts}`;
    document.getElementById('res-total').textContent = state.score;
    document.getElementById('res-location').textContent = cam.location;

    // Countdown
    const countdownEl = document.getElementById('result-countdown');
    const valEl = document.getElementById('countdown-val');
    countdownEl.style.display = 'block';
    let cd = 8;
    valEl.textContent = cd;
    const cdTimer = setInterval(() => {
      cd--;
      valEl.textContent = cd;
      if (cd <= 0) {
        clearInterval(cdTimer);
        nextRound();
      }
    }, 1000);

    // Allow clicking "next" to skip countdown
    document.getElementById('result-countdown').onclick = () => { clearInterval(cdTimer); nextRound(); };
  }

  function nextRound() {
    if (state.mode === 'mp') return; // MP handles own flow
    state.round++;
    if (state.round >= state.totalRounds) {
      showFinalSP();
    } else {
      state.credits = Math.min(state.credits + 50, 500); // small credit refresh
      document.getElementById('credits-display').textContent = state.credits;
      UI.showScreen('game-screen');
      loadRound();
    }
  }

  function showFinalSP() {
    UI.showScreen('final-screen');
    document.getElementById('final-sp').style.display = 'block';
    document.getElementById('final-mp').style.display = 'none';

    const score = state.score;
    document.getElementById('final-score').textContent = score;

    let rank;
    if (score >= 22000)      rank = '[ GHOST OPERATIVE ]';
    else if (score >= 18000) rank = '[ ELITE INFILTRATOR ]';
    else if (score >= 13000) rank = '[ FIELD OPERATIVE ]';
    else if (score >= 7000)  rank = '[ JUNIOR AGENT ]';
    else                     rank = '[ ROOKIE ]';
    document.getElementById('final-rank').textContent = rank;

    const breakdown = document.getElementById('rounds-breakdown');
    breakdown.innerHTML = '';
    state.roundResults.forEach((r, i) => {
      const row = document.createElement('div');
      row.className = 'rbd-row';
      row.innerHTML = `
        <div class="rbd-num">#${i + 1}</div>
        <div class="rbd-loc">${r.cam.location}</div>
        <div class="rbd-pts">+${r.pts}</div>
      `;
      breakdown.appendChild(row);
    });
  }

  // Called by MP module when server sends roundStart
  function mpLoadRound(camera, round, totalRounds, timeLeft) {
    state.mode = 'mp';
    state.round = round;
    state.totalRounds = totalRounds;
    state.currentCamera = camera;
    state.cluesAvailable = camera.clues || [];
    UI.showScreen('game-screen');
    document.getElementById('game-chat-section').style.display = 'flex';
    document.getElementById('game-chat-section').style.flexDirection = 'column';
    initGuessMap();
    loadRound(camera);
    // Override timer with server time
    if (state.timerInterval) { clearInterval(state.timerInterval); }
    state.timeLeft = timeLeft;
    updateTimerUI(timeLeft, 90);
  }

  // Server ticks time
  function mpTimerTick(timeLeft) {
    state.timeLeft = timeLeft;
    updateTimerUI(timeLeft, 90);
    if (timeLeft <= 0 && !state.submitted) {
      submitGuess(true);
    }
  }

  return {
    state,
    startSinglePlayer,
    loadRound,
    placePin,
    buyClue,
    submitGuess,
    nextRound,
    showFinalSP,
    mpLoadRound,
    mpTimerTick,
  };
})();
