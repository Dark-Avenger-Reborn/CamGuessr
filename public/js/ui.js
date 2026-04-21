// ─────────────────────────────────────────────
// UI.JS — Screen management & visual helpers
// ─────────────────────────────────────────────

const UI = (() => {
  const BOOT_LINES = [
    { text: '[OK] Loading camera catalog', cls: 'log-ok', delay: 150 },
    { text: '[OK] Building map interface', cls: 'log-ok', delay: 450 },
    { text: '[..] Syncing round data', cls: '', delay: 750 },
    { text: '[OK] Multiplayer channel online', cls: 'log-ok', delay: 1100 },
    { text: '[..] Calibrating score model', cls: '', delay: 1450 },
    { text: '[OK] Ready to play', cls: 'log-ok', delay: 1800 },
  ];

  const LOAD_STEPS = [
    { text: 'Connecting to camera...', ticker: 'Fetching latest frame' },
    { text: 'Loading street view...', ticker: 'Optimizing image quality' },
    { text: 'Finalizing round...', ticker: 'Timer starts after image appears' },
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

    document.getElementById('cam-id-label').textContent = `CAMERA: ${(camId || '???').toUpperCase()}`;
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
        <div style="font-size:13px; color:var(--green);">IMAGE UNAVAILABLE - YOU CAN STILL GUESS</div>
        <div style="font-size:11px; color:var(--text-dim); margin-top:8px;">Camera: ${cam ? cam.id : '---'}</div>
        <div style="margin-top:14px; display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:10px; color:var(--text-dim); text-align:left; max-width:260px; margin-left:auto; margin-right:auto;">
          <div>Status: Offline</div>
          <div>Frame: Not received</div>
          <div>Hint 1: Available</div>
          <div>Hint 2+: Buy with credits</div>
        </div>
        <div style="margin-top:14px; font-size:10px; color:var(--amber);">Use hints and map context to make your best guess.</div>
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
    div.innerHTML = `<span class="clue-num">HINT ${String(index + 1).padStart(2, '0')}</span>${clueText}`;
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
`HOW TO PLAY
════════════════════════════════════════

OBJECTIVE:
Find where the street camera image was taken.

HOW TO PLAY:
1. Study the image for clues (signs, roads, weather, terrain)
2. Click the world map to place your guess
3. Buy hints if needed (100 credits each)
4. Submit before time runs out

TIMER:
60 seconds per round. The timer starts after
the image is shown. Unused time does not carry over.

SCORING (per round, max 5,000):
• Under 10km    → 5,000 pts (FLAWLESS)
• Under 100km   → ~4,500 pts
• Under 1,000km → ~1,000 pts
• Over 5,000km  → 0 pts

MULTIPLAYER:
All players see the same camera. Guesses are
hidden until round end. Accuracy matters most.

Credits do not affect score. Hints are optional.

5 rounds · max 25,000 points

Good luck!`
    );
  }

  return {
    showScreen, runBoot, showMPCreate, showMPJoin, showMPSelect, showMPError,
    toast, startCameraLoad, onImageLoaded, onImageError,
    renderLobbyPlayers, renderMPOverlay, renderClue, addChatMessage, showHowTo
  };
})();
