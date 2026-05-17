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
  let finalLeaderboard = [];

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
      UI.toast('Connection lost - reconnecting...', 'err', 4000);
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
      if (data.roomState.phase === 'finished') {
        showFinalMP(data.finalLeaderboard || [], data.roomState);
      } else {
        renderLobby(data.roomState);
        UI.showScreen('lobby-screen');
      }
    });

    socket.on('playerJoined', (data) => {
      currentPlayers = data.roomState.players;
      hostId = data.roomState.host;
      isHost = socket.id === hostId;
      if (data.roomState.phase === 'finished' && document.getElementById('final-screen').classList.contains('active')) {
        renderFinalRematch(data.roomState);
      } else {
        renderLobby(data.roomState);
      }
      UI.toast(`${data.playerName} joined the channel`, 'ok');
      UI.addChatMessage('lobby-chat', 'SYS', `${data.playerName} connected`);
    });

    socket.on('playerLeft', (data) => {
      currentPlayers = data.roomState.players;
      hostId = data.roomState.host;
      isHost = socket.id === hostId;
      if (data.roomState.phase === 'finished' && document.getElementById('final-screen').classList.contains('active')) {
        renderFinalRematch(data.roomState);
      } else {
        renderLobby(data.roomState);
      }
      UI.toast(`${data.playerName} left`, 'warn');
      UI.addChatMessage('lobby-chat', 'SYS', `${data.playerName} disconnected`);
      if (Game.state.mode === 'mp') {
        UI.addChatMessage('game-chat', 'SYS', `${data.playerName} disconnected`);
      }
    });

    socket.on('hostChanged', (data) => {
      hostId = data.newHost;
      isHost = socket.id === hostId;
      if (socket.id === hostId) {
        UI.toast('You are now the HOST', 'warn');
        const fsbtn = document.getElementById('force-start-btn');
        if (fsbtn) fsbtn.style.display = 'block';
      }
      updateFinalRematchControls();
    });

    socket.on('lobbyUpdate', (data) => {
      currentPlayers = data.roomState.players;
      hostId = data.roomState.host;
      isHost = socket.id === hostId;
      if (data.roomState.phase === 'finished' && document.getElementById('final-screen').classList.contains('active')) {
        renderFinalRematch(data.roomState);
      } else {
        renderLobby(data.roomState);
      }
    });

    // ── Game events ──
    socket.on('roundStart', (data) => {
      if (resultCountdownTimer) { clearInterval(resultCountdownTimer); resultCountdownTimer = null; }
      currentPlayers = data.roomState?.players || [];
      const me = currentPlayers.find((p) => p.id === socket.id);
      if (me && Number.isFinite(me.credits)) {
        Game.state.credits = me.credits;
      }
      UI.renderMPOverlay(currentPlayers, socket.id);
      Game.mpLoadRound(data.camera, data.round, data.totalRounds, data.timeLeft, data.roundDuration);
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
      currentPlayers = data.roomState?.players || currentPlayers;
      hostId = data.roomState?.host || hostId;
      isHost = socket.id === hostId;
      showFinalMP(data.leaderboard, data.roomState);
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
        document.getElementById('buy-clue-btn').textContent = 'All hints unlocked';
      }
    });

    return socket;
  }

  function renderLobby(roomState) {
    document.getElementById('lobby-code').textContent = roomState.code;
    UI.renderLobbyPlayers(roomState.players, socket ? socket.id : null, roomState.host);

    const settingsEl = document.getElementById('lobby-settings');
    if (settingsEl) {
      const cfg = roomState.settings || {};
      const credits = Number.isFinite(Number(cfg.startingCredits)) ? Number(cfg.startingCredits) : 500;
      const rounds = Number.isFinite(Number(cfg.rounds)) ? Number(cfg.rounds) : (roomState.totalRounds || 5);
      const roundSeconds = Number.isFinite(Number(cfg.roundSeconds)) ? Number(cfg.roundSeconds) : 60;
      settingsEl.textContent = `Credits: ${credits} · Rounds: ${rounds} · Round Time: ${roundSeconds}s`;
    }

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

  function getMaxMultiplayerScore(roomState = null) {
    const cfg = roomState?.settings || {};
    const rounds = Number.isFinite(Number(cfg.rounds))
      ? Number(cfg.rounds)
      : (Number.isFinite(Number(roomState?.totalRounds)) ? Number(roomState.totalRounds) : 5);
    return Math.max(rounds, 1) * 5000;
  }

  function createRoom() {
    const nameEl = document.getElementById('create-name-input');
    const name = (nameEl.value || 'AGENT').trim().toUpperCase() || 'AGENT';
    const creditsVal = Number.parseInt((document.getElementById('create-credits-input')?.value || '500').trim(), 10);
    const roundsVal = Number.parseInt((document.getElementById('create-rounds-input')?.value || '5').trim(), 10);
    const roundSecondsVal = Number.parseInt((document.getElementById('create-round-seconds-input')?.value || '60').trim(), 10);

    const settings = {
      startingCredits: Number.isFinite(creditsVal) ? creditsVal : 500,
      rounds: Number.isFinite(roundsVal) ? roundsVal : 5,
      roundSeconds: Number.isFinite(roundSecondsVal) ? roundSecondsVal : 60,
    };

    myName = name;
    connect();
    socket.emit('createRoom', { name, settings });
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

    if (document.getElementById('final-screen').classList.contains('active')) {
      updateFinalRematchControls();
      return;
    }

    const btn = document.getElementById('ready-btn');
    if (btn) {
      btn.textContent = '✓ READY';
      btn.disabled = true;
      btn.style.opacity = '0.6';
    }
  }

  function forceStart() {
    if (!socket || !isHost) return;
    socket.emit('startGame');
  }

  function updateFinalRematchControls() {
    const readyBtn = document.getElementById('final-rematch-ready-btn');
    const forceBtn = document.getElementById('final-rematch-force-btn');
    const status = document.getElementById('final-rematch-status');
    if (!readyBtn || !forceBtn || !status) return;

    const me = currentPlayers.find(p => p.id === (socket ? socket.id : null));
    const readyCount = currentPlayers.filter(p => p.ready).length;
    const total = currentPlayers.length;

    status.textContent = total > 0
      ? `${readyCount}/${total} READY FOR REMATCH`
      : 'WAITING FOR REMATCH READY...';

    if (me && me.ready) {
      readyBtn.textContent = '✓ READY — WAITING';
      readyBtn.disabled = true;
      readyBtn.style.opacity = '0.6';
    } else {
      readyBtn.textContent = '▶ READY FOR REMATCH';
      readyBtn.disabled = false;
      readyBtn.style.opacity = '1';
    }

    forceBtn.style.display = isHost ? 'block' : 'none';
  }

  function renderFinalRematch(roomState) {
    currentPlayers = roomState.players || currentPlayers;
    hostId = roomState.host || hostId;
    isHost = socket && socket.id === hostId;
    roomCode = roomState.code || roomCode;

    const scoreById = new Map(finalLeaderboard.map(p => [p.id, p.score]));
    const displayPlayers = currentPlayers
      .map((p) => ({
        id: p.id,
        name: p.name,
        ready: !!p.ready,
        score: scoreById.has(p.id) ? scoreById.get(p.id) : 0
      }))
      .sort((a, b) => b.score - a.score);

    const roomCodeEl = document.getElementById('final-room-code');
    if (roomCodeEl) {
      roomCodeEl.textContent = `ROOM CODE: ${roomCode || '------'}`;
    }

    const maxScoreEl = document.getElementById('final-mp-score-max');
    if (maxScoreEl) {
      maxScoreEl.textContent = `/ ${getMaxMultiplayerScore(roomState).toLocaleString('en-US')} POINTS`;
    }

    const lbEl = document.getElementById('final-lb');
    lbEl.innerHTML = '';

    displayPlayers.forEach((p, i) => {
      const isMe = p.id === (socket ? socket.id : null);
      const row = document.createElement('div');
      row.className = 'player-row';
      const medals = ['🥇', '🥈', '🥉'];
      row.innerHTML = `
        <div class="player-dot ${p.ready ? '' : 'offline'}"></div>
        <div class="player-name" style="${isMe ? 'color:var(--green);' : ''}">
          ${medals[i] || `#${i+1}`} ${p.name}${isMe ? ' (YOU)' : ''}
        </div>
        <div class="player-status ${p.ready ? 'ready' : ''}">${p.ready ? 'READY' : 'STANDBY'}</div>
        <div class="player-score-badge">${p.score} pts</div>
      `;
      lbEl.appendChild(row);
    });

    const me = displayPlayers.find(p => p.id === (socket ? socket.id : null));
    const mpScoreEl = document.getElementById('final-mp-score');
    if (mpScoreEl) {
      mpScoreEl.textContent = me ? me.score : 0;
    }

    updateFinalRematchControls();
  }

  function buildFinalSummaryRounds() {
    const rounds = new Map();

    finalLeaderboard.forEach((player) => {
      (player.roundResults || []).forEach((rr, idx) => {
        const roundNum = Number.isFinite(rr.round) ? rr.round + 1 : idx + 1;
        if (!rounds.has(roundNum)) {
          rounds.set(roundNum, {
            round: roundNum,
            actual: rr.actual || null,
            guesses: []
          });
        }

        const bucket = rounds.get(roundNum);
        if (!bucket.actual && rr.actual) bucket.actual = rr.actual;
        bucket.guesses.push({
          playerId: player.id,
          playerName: player.name,
          guess: rr.guess || null,
          dist: rr.dist === null || rr.dist === undefined ? null : rr.dist
        });
      });
    });

    return Array.from(rounds.values())
      .sort((a, b) => a.round - b.round)
      .map((round) => ({
        ...round,
        guesses: round.guesses.sort((a, b) => {
          if (a.dist === null) return 1;
          if (b.dist === null) return -1;
          return a.dist - b.dist;
        })
      }));
  }

  function renderFinalDistanceList(summaryRounds) {
    const list = document.getElementById('final-distance-list');
    if (!list) return;
    list.innerHTML = '';

    summaryRounds.forEach((round) => {
      const head = document.createElement('div');
      head.className = 'fd-head';
      head.textContent = `ROUND ${round.round} • ${round.actual?.location || 'Unknown location'}`;
      list.appendChild(head);

      round.guesses.forEach((g) => {
        const isMe = g.playerId === (socket ? socket.id : null);
        const row = document.createElement('div');
        row.className = 'fd-row';
        row.innerHTML = `
          <div class="fd-player">${g.playerName}${isMe ? ' (YOU)' : ''}</div>
          <div class="fd-dist ${g.dist === null ? 'none' : ''}">${g.dist === null ? 'No guess' : `${g.dist} km`}</div>
        `;
        list.appendChild(row);
      });
    });
  }

  function renderFinalSummary() {
    const summaryBlock = document.getElementById('final-summary-block');
    if (!summaryBlock) return;

    const summaryRounds = buildFinalSummaryRounds();
    const hasPlottable = summaryRounds.some(r => r.actual && r.guesses.some(g => g.guess));
    if (!hasPlottable) {
      summaryBlock.style.display = 'none';
      return;
    }

    summaryBlock.style.display = 'flex';
    WorldMap.drawFinalSummaryMap('final-summary-map', summaryRounds);
    renderFinalDistanceList(summaryRounds);
  }

  function leaveRoom() {
    if (resultCountdownTimer) {
      clearInterval(resultCountdownTimer);
      resultCountdownTimer = null;
    }

    if (socket) {
      socket.emit('leaveRoom');
      socket.disconnect();
      socket = null;
    }

    roomCode = null;
    isHost = false;
    currentPlayers = [];
    hostId = null;
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
    else if (pts >= 2000) { header.textContent = '[ SOLID ROUND ]'; header.className = 'result-header ok'; }
    else if (pts >= 500) { header.textContent = '[ NOT BAD ]'; header.className = 'result-header ok'; }
    else                  { header.textContent = '[ WAY OFF ]'; header.className = 'result-header fail'; }

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

  function showFinalMP(leaderboard, roomState = null) {
    if (resultCountdownTimer) { clearInterval(resultCountdownTimer); resultCountdownTimer = null; }
    finalLeaderboard = Array.isArray(leaderboard) ? leaderboard : [];
    UI.showScreen('final-screen');
    document.getElementById('final-sp').style.display = 'none';
    document.getElementById('final-mp').style.display = 'grid';
    document.getElementById('final-actions-sp').style.display = 'none';

    if (roomState) {
      renderFinalRematch(roomState);
    } else {
      renderFinalRematch({ players: currentPlayers, host: hostId });
    }
    renderFinalSummary();

  }

  return {
    get socket() { return socket; },
    connect, createRoom, joinRoom, setReady, forceStart, leaveRoom, sendChat,
  };
})();
