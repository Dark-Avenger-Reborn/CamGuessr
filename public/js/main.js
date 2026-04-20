// ─────────────────────────────────────────────
// MAIN.JS — Entry point
// ─────────────────────────────────────────────

window.addEventListener('load', () => {
  setTimeout(() => UI.runBoot(), 200);
});

// Enter key support for multiplayer inputs
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const active = document.querySelector('.screen.active');
    if (!active) return;
    const id = active.id;
    if (id === 'mp-screen') {
      const joinForm = document.getElementById('mp-join-form');
      if (joinForm.style.display !== 'none') MP.joinRoom();
      const createForm = document.getElementById('mp-create-form');
      if (createForm.style.display !== 'none') MP.createRoom();
    }
    if (id === 'sp-setup-screen') Game.startSinglePlayer();
  }
});
