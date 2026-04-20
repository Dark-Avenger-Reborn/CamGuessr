// ─────────────────────────────────────────────
// MP.JS — Multiplayer Socket.IO client
// ─────────────────────────────────────────────

const MP = (() => {
  let socket = null;
  let myId = null;
  let myName = null;
  let roomCode = null;
  let isHost = false;
  let currentPlayers = [];
  let hostId = null;
  let resultCountdownTimer = null;

  function connect() {
    if (socket && socket.connected) return socket;
    socket = io();
    myId = null; // will be set from socket.id on connect

    socket.on('connect', () => {
      myId = socket.id;
      console.log('[MP] Connected:', myId);
    });

    socket.on('disconnect', () => {
      console.log('[MP] Disconnected');
      UI.toast('CONNECTION LOST — reconnecting...', 'err', 4000);
    });

    socket.on('error', (data) => {
      UI.showMPError(data.message || 'Unknown error');
      UI.toast(data.message, 'err');
    });

    // ── Room events ──
    socket.on('roomCreated', (data) => {
      roomCode = data.code;
      isHost = true;
      hostId = socket.id;
      currentPlayers = data.roomState.players;
      renderLobby(data.roomState);
      UI.showScreen('lobby-screen');
    });

    socket.on('roomJoined', (data) => {
      roomCode = data.code;
      isHost = false;
      hostId = data.roomState.host;
      currentPlayers = data.roomState.players;
      renderLobby(data.roomState);
      UI.showScreen('lobby-screen');
    });

    socket.on('playerJoined', (data) => {
      currentPlayers = data.roomState.players;
      hostId = data.roomState.host;
      renderLobby(data.roomState);
      UI.toast(`${data.playerName} joined the channel`, 'ok');
      UI.addChatMessage('lobby-chat', 'SYS', `${data.playerName} connected`);
    });

    socket.on('playerLeft', (data) => {
      currentPlayers = data.roomState.players;
      hostId = data.roomState.host;
      renderLobby(data.roomState);
      UI.toast(`${data.playerName} left`, 'warn');
      UI.addChatMessage('lobby-chat', 'SYS', `${data.playerName} disconnected`);
      if (Game.state.mode === 'mp') {
        UI.addChatMessage('game-chat', 'SYS', `${data.playerName} disconnected`);
      }
    });

    socket.on('hostChanged', (data) => {
      hostId = data.newHost;
      if (socket.id === hostId) {
        isHost = true;
        UI.toast('You are now the HOST', 'warn');
        const fsbtn = document.getElementById('force-start-btn');
        if (fsbtn) fsbtn.style.display = 'block';
      }
    });

    socket.on('lobbyUpdate', (data) => {
      currentPlayers = data.roomState.players;
      hostId = data.roomState.host;
      renderLobby(data.roomState);
    });

    // ── Game events ──
    socket.on('roundStart', (data) => {
      if (resultCountdownTimer) { clearInterval(resultCountdownTimer); resultCountdownTimer = null; }
      currentPlayers = [];
      Game.mpLoadRound(data.camera, data.round, data.totalRounds, data.timeLeft);
    });

    socket.on('timerTick', (data) => {
      Game.mpTimerTick(data.timeLeft);
    });

    socket.on('playerGuessed', (data) => {
      currentPlayers = data.roomState.players;
      UI.renderMPOverlay(currentPlayers, socket.id);
      UI.toast(`${data.playerName} transmitted coordinates (${data.guessesIn}/${data.totalPlayers})`, 'ok');
      UI.addChatMessage('game-chat', 'SYS', `${data.playerName} guessed`);
    });

    socket.on('roundEnd', (data) => {
      showMPResult(data);
    });

    socket.on('gameOver', (data) => {
      showFinalMP(data.leaderboard);
    });

    // ── Chat ──
    socket.on('chatMessage', (data) => {
      UI.addChatMessage('lobby-chat', data.name, data.text);
      if (Game.state.mode === 'mp') {
        UI.addChatMessage('game-chat', data.name, data.text);
      }
    });

    // ── Clue ──
    socket.on('clueGranted', (data) => {
      Game.state.credits = data.credits;
      document.getElementById('credits-display').textContent = data.credits;
      UI.renderClue(Game.state.cluesAvailable[data.clueIndex], data.clueIndex);
      Game.state.cluesRevealed++;
      if (Game.state.cluesRevealed >= Game.state.cluesAvailable.length) {
        document.getElementById('buy-clue-btn').disabled = true;
        document.getElementById('buy-clue-btn').textContent = '// ALL INTEL DECRYPTED';
      }
    });

    return socket;
  }

  function renderLobby(roomState) {
    document.getElementById('lobby-code').textContent = roomState.code;
    UI.renderLobbyPlayers(roomState.players, socket ? socket.id : null, roomState.host);

    // Show force-start only to host
    const fsbtn = document.getElementById('force-start-btn');
    if (fsbtn) fsbtn.style.display = isHost ? 'block' : 'none';

    // Update ready button
    const me = roomState.players.find(p => p.id === (socket ? socket.id : null));
    const readyBtn = document.getElementById('ready-btn');
    if (readyBtn && me && me.ready) {
      readyBtn.textContent = '✓ READY — STANDING BY';
      readyBtn.disabled = true;
      readyBtn.style.opacity = '0.6';
    }
  }

  function createRoom() {
    const nameEl = document.getElementById('create-name-input');
    const name = (nameEl.value || 'AGENT').trim().toUpperCase() || 'AGENT';
    myName = name;
    connect();
    socket.emit('createRoom', { name });
  }

  function joinRoom() {
    const code = (document.getElementById('join-code-input').value || '').trim().toUpperCase();
    const name = (document.getElementById('join-name-input').value || 'AGENT').trim().toUpperCase();
    if (!code || code.length < 4) { UI.showMPError('Enter a valid access code'); return; }
    myName = name;
    connect();
    socket.emit('joinRoom', { code, name });
  }

  function setReady() {
    if (!socket) return;
    socket.emit('playerReady');
    const btn = document.getElementById('ready-btn');
    if (btn) {
      btn.textContent = '✓ READY — STANDING BY';
      btn.disabled = true;
      btn.style.opacity = '0.6';
    }
  }

  function forceStart() {
    if (!socket || !isHost) return;
    socket.emit('startGame');
  }

  function sendChat() {
    const inGame = document.getElementById('game-screen').classList.contains('active');
    const inputId = inGame ? 'game-chat-input' : 'lobby-chat-input';
    const input = document.getElementById(inputId);
    if (!input || !socket) return;
    const text = input.value.trim();
    if (!text) return;
    socket.emit('chatMessage', { text });
    input.value = '';
  }

  function showMPResult(data) {
    UI.showScreen('result-screen');

    // Find my result
    const me = data.results.find(r => r.playerId === (socket ? socket.id : null));
    const pts = me ? me.pts : 0;
    const dist = me ? me.dist : null;
    const score = me ? me.score : 0;

    const header = document.getElementById('result-header');
    if (pts >= 4000)      { header.textContent = '[ PRECISE INFILTRATION ]'; header.className = 'result-header great'; }
    else if (pts >= 2000) { header.textContent = '[ OPERATIVE CONFIRMED ]'; header.className = 'result-header ok'; }
    else if (pts >= 500)  { header.textContent = '[ PARTIAL SUCCESS ]'; header.className = 'result-header ok'; }
    else                  { header.textContent = '[ TARGET MISSED ]'; header.className = 'result-header fail'; }

    // Draw map with ALL guesses
    WorldMap.drawResultMap('result-map', {
      results: data.results,
      actual: { lat: data.actualCamera.lat, lon: data.actualCamera.lon }
    });

    document.getElementById('res-distance').textContent = dist !== null ? `${dist}km` : 'NO GUESS';
    document.getElementById('res-points').textContent = `+${pts}`;
    document.getElementById('res-total').textContent = score;
    document.getElementById('res-location').textContent = data.actualCamera.location;

    // Leaderboard
    const lbSection = document.getElementById('result-leaderboard');
    lbSection.style.display = 'block';
    const lbList = document.getElementById('result-lb-list');
    lbList.innerHTML = '';
    data.leaderboard.forEach((r, i) => {
      const row = document.createElement('div');
      row.className = 'player-row';
      const isMe = r.playerId === (socket ? socket.id : null);
      row.innerHTML = `
        <div class="player-dot"></div>
        <div class="player-name" style="${isMe ? 'color:var(--green)' : ''}">
          #${i + 1} ${r.playerName}${isMe ? ' (YOU)' : ''}
        </div>
        <div class="player-score-badge">+${r.pts}</div>
        <div class="player-score-badge" style="color:var(--amber);">${r.score}</div>
      `;
      lbList.appendChild(row);
    });

    // Countdown (server auto-advances in 8s)
    const countdownEl = document.getElementById('result-countdown');
    const valEl = document.getElementById('countdown-val');
    countdownEl.style.display = 'block';
    let cd = 8;
    valEl.textContent = cd;
    if (resultCountdownTimer) clearInterval(resultCountdownTimer);
    resultCountdownTimer = setInterval(() => {
      cd--;
      valEl.textContent = cd;
      if (cd <= 0) clearInterval(resultCountdownTimer);
    }, 1000);
  }

  function showFinalMP(leaderboard) {
    if (resultCountdownTimer) { clearInterval(resultCountdownTimer); resultCountdownTimer = null; }
    UI.showScreen('final-screen');
    document.getElementById('final-sp').style.display = 'none';
    document.getElementById('final-mp').style.display = 'block';

    const lbEl = document.getElementById('final-lb');
    lbEl.innerHTML = '';
    leaderboard.forEach((p, i) => {
      const isMe = p.id === (socket ? socket.id : null);
      const row = document.createElement('div');
      row.className = 'player-row';
      const medals = ['🥇', '🥈', '🥉'];
      row.innerHTML = `
        <div class="player-dot"></div>
        <div class="player-name" style="${isMe ? 'color:var(--green);' : ''}">
          ${medals[i] || `#${i+1}`} ${p.name}${isMe ? ' (YOU)' : ''}
        </div>
        <div class="player-score-badge">${p.score} pts</div>
      `;
      lbEl.appendChild(row);
    });

    // Show MY breakdown
    const me = leaderboard.find(p => p.id === (socket ? socket.id : null));
    const breakdown = document.getElementById('rounds-breakdown');
    breakdown.innerHTML = '';
    if (me && me.roundResults) {
      me.roundResults.forEach((r, i) => {
        const row = document.createElement('div');
        row.className = 'rbd-row';
        row.innerHTML = `
          <div class="rbd-num">#${i + 1}</div>
          <div class="rbd-loc">${r.dist !== null ? `${r.dist}km off` : 'No guess'}</div>
          <div class="rbd-pts">+${r.pts}</div>
        `;
        breakdown.appendChild(row);
      });
    }
  }

  return {
    get socket() { return socket; },
    connect, createRoom, joinRoom, setReady, forceStart, sendChat,
  };
})();
