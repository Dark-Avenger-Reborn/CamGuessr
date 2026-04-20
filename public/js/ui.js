// ─────────────────────────────────────────────
// UI.JS — Screen management & visual helpers
// ─────────────────────────────────────────────

const UI = (() => {
  const BOOT_LINES = [
    { text: '[OK] Secure tunnel initialized — TLS 1.3', cls: 'log-ok', delay: 150 },
    { text: '[OK] Proxy chain established — 7 nodes', cls: 'log-ok', delay: 350 },
    { text: '[..] Scanning global camera network...', cls: '', delay: 600 },
    { text: '[OK] 47,293 nodes located — 12,041 online', cls: 'log-ok', delay: 1000 },
    { text: '[WARN] 3 nodes behind firewall — bypassing...', cls: 'log-warn', delay: 1250 },
    { text: '[OK] Firewall bypass successful', cls: 'log-ok', delay: 1650 },
    { text: '[..] Connecting to Socket.IO relay server...', cls: '', delay: 1900 },
    { text: '[OK] Real-time channel open — multiplayer ready', cls: 'log-ok', delay: 2200 },
    { text: '[..] Loading geolocation engine v4.2...', cls: '', delay: 2450 },
    { text: '[OK] All systems nominal — ready to infiltrate', cls: 'log-ok', delay: 2750 },
  ];

  const LOAD_STEPS = [
    { text: 'Routing through proxy...', ticker: '// Establishing encrypted tunnel...' },
    { text: 'Bypassing firewall...', ticker: '// Decrypting access credentials...' },
    { text: 'Accessing node...', ticker: '// Authenticating with remote server...' },
    { text: 'Decrypting stream...', ticker: '// Intercepting live feed...' },
    { text: 'Stabilizing feed...', ticker: '// Decoding video signal...' },
  ];

  let toastTimer = null;

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
  }

  function runBoot() {
    const log = document.getElementById('boot-log');
    BOOT_LINES.forEach((line, i) => {
      setTimeout(() => {
        const div = document.createElement('div');
        div.className = `log-line ${line.cls}`;
        div.textContent = line.text;
        log.appendChild(div);
        setTimeout(() => div.classList.add('visible'), 40);
        if (i === BOOT_LINES.length - 1) {
          setTimeout(() => {
            document.getElementById('main-menu').style.display = 'flex';
            document.getElementById('ver-tag').style.display = 'block';
          }, 400);
        }
      }, line.delay);
    });
  }

  function showMPCreate() {
    document.getElementById('mp-mode-select').style.display = 'none';
    document.getElementById('mp-create-form').style.display = 'flex';
    document.getElementById('mp-join-form').style.display = 'none';
    document.getElementById('mp-create-form').style.flexDirection = 'column';
    document.getElementById('mp-create-form').style.gap = '12px';
    document.getElementById('mp-error').style.display = 'none';
  }

  function showMPJoin() {
    document.getElementById('mp-mode-select').style.display = 'none';
    document.getElementById('mp-create-form').style.display = 'none';
    document.getElementById('mp-join-form').style.display = 'flex';
    document.getElementById('mp-join-form').style.flexDirection = 'column';
    document.getElementById('mp-join-form').style.gap = '8px';
    document.getElementById('mp-error').style.display = 'none';
  }

  function showMPSelect() {
    document.getElementById('mp-mode-select').style.display = 'block';
    document.getElementById('mp-create-form').style.display = 'none';
    document.getElementById('mp-join-form').style.display = 'none';
    document.getElementById('mp-error').style.display = 'none';
  }

  function showMPError(msg) {
    const el = document.getElementById('mp-error');
    el.textContent = `[ERR] ${msg}`;
    el.style.display = 'block';
  }

  function toast(msg, type = 'ok', duration = 2800) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = `toast show${type === 'warn' ? ' warn' : type === 'err' ? ' err' : ''}`;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.classList.remove('show'); }, duration);
  }

  function startCameraLoad(camId) {
    const loadingEl = document.getElementById('cam-loading');
    const imgEl = document.getElementById('camera-img');
    const overlay = document.getElementById('cam-overlay');

    imgEl.style.display = 'none';
    loadingEl.style.display = 'block';
    overlay.style.display = 'none';

    let step = 0;
    function next() {
      if (step < LOAD_STEPS.length) {
        document.getElementById('load-text').innerHTML = `<span>${LOAD_STEPS[step].text}</span>`;
        document.getElementById('load-ticker').textContent = LOAD_STEPS[step].ticker;
        step++;
      }
    }
    next();
    const interval = setInterval(next, 850);

    document.getElementById('cam-id-label').textContent = `NODE: ${(camId || '???').toUpperCase()}`;
    return interval;
  }

  function onImageLoaded() {
    document.getElementById('cam-loading').style.display = 'none';
    document.getElementById('camera-img').style.display = 'block';
    document.getElementById('cam-overlay').style.display = 'block';
  }

  function onImageError() {
    const cam = Game.state.currentCamera;
    document.getElementById('camera-img').style.display = 'none';
    document.getElementById('cam-loading').innerHTML = `
      <div style="text-align:center; padding:16px;">
        <div style="font-size:36px; color:var(--green-dim); margin-bottom:14px;">📡</div>
        <div style="font-size:13px; color:var(--green);">FEED ACQUIRED — METADATA ENCRYPTED</div>
        <div style="font-size:11px; color:var(--text-dim); margin-top:8px;">Node: ${cam ? cam.id : '---'}</div>
        <div style="margin-top:14px; display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:10px; color:var(--text-dim); text-align:left; max-width:260px; margin-left:auto; margin-right:auto;">
          <div>Lat: [ENCRYPTED]</div>
          <div>Lon: [ENCRYPTED]</div>
          <div>Signal: ████████░░ 82%</div>
          <div>Codec: H.264 / 1080p</div>
        </div>
        <div style="margin-top:14px; font-size:10px; color:var(--amber);">↓ Use Intel Intercepts to identify location</div>
      </div>`;
    document.getElementById('cam-loading').style.display = 'block';
    document.getElementById('cam-overlay').style.display = 'block';
  }

  function renderLobbyPlayers(players, myId, hostId) {
    const container = document.getElementById('lobby-players');
    container.innerHTML = '';
    players.forEach(p => {
      const row = document.createElement('div');
      row.className = 'player-row';
      row.innerHTML = `
        <div class="player-dot ${p.ready ? '' : 'offline'}"></div>
        <div class="player-name">
          ${p.name}${p.id === myId ? ' <span style="color:var(--text-dim);font-size:10px;">(YOU)</span>' : ''}
          ${p.id === hostId ? '<span class="player-host-badge">HOST</span>' : ''}
        </div>
        <div class="player-status ${p.ready ? 'ready' : ''}">${p.ready ? 'READY' : 'STANDBY'}</div>
      `;
      container.appendChild(row);
    });
  }

  function renderMPOverlay(players, myId, guessedSet) {
    const overlay = document.getElementById('mp-players-overlay');
    const list = document.getElementById('mpo-list');
    if (!players || players.length <= 1) { overlay.style.display = 'none'; return; }
    overlay.style.display = 'block';
    list.innerHTML = '';
    players.forEach(p => {
      const guessed = p.hasGuessed || false;
      const div = document.createElement('div');
      div.className = 'mpo-player';
      div.innerHTML = `
        <div class="mpo-dot ${guessed ? 'guessed' : 'waiting'}"></div>
        <div class="mpo-name">${p.name}${p.id === myId ? '*' : ''}</div>
        <div class="mpo-pts">${p.score}</div>
      `;
      list.appendChild(div);
    });
  }

  function renderClue(clueText, index) {
    const container = document.getElementById('clues-container');
    const div = document.createElement('div');
    div.className = 'clue-item';
    div.innerHTML = `<span class="clue-num">INTEL-${String(index + 1).padStart(2, '0')}</span>${clueText}`;
    container.appendChild(div);
    setTimeout(() => div.classList.add('revealed'), 50);
  }

  function addChatMessage(containerid, name, text) {
    const box = document.getElementById(containerid);
    if (!box) return;
    const div = document.createElement('div');
    div.className = 'chat-msg';
    div.innerHTML = `<span class="chat-name">${name} &gt;</span> <span class="chat-text">${text}</span>`;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  }

  function showHowTo() {
    alert(
`MISSION BRIEFING
════════════════════════════════════════

OBJECTIVE:
Identify the location of a live surveillance
camera feed somewhere in the world.

HOW TO PLAY:
1. Observe the camera feed for visual clues
2. Click the world map to place your guess
3. Purchase Intel Intercepts for hints (100cr each)
4. Hit TRANSMIT COORDINATES before time runs out

TIMER:
90 seconds per round. Timer bar depletes in
real-time. Unused time doesn't carry over.
Guess early for the same points!

SCORING (per round, max 5,000):
• Under 10km    → 5,000 pts (FLAWLESS)
• Under 100km   → ~4,500 pts
• Under 1,000km → ~1,000 pts
• Over 5,000km  → 0 pts

MULTIPLAYER:
All players see the same camera. Guesses are
hidden until round ends. First to guess gets
no bonus — accuracy is everything.

Credits do not affect score. Intel = tactical
advantage, not required.

5 rounds · max 25,000 points

GOOD LUCK, OPERATIVE.`
    );
  }

  return {
    showScreen, runBoot, showMPCreate, showMPJoin, showMPSelect, showMPError,
    toast, startCameraLoad, onImageLoaded, onImageError,
    renderLobbyPlayers, renderMPOverlay, renderClue, addChatMessage, showHowTo
  };
})();
