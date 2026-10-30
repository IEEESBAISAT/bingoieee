// IEEE Icebreaker Bingo Player Client
document.addEventListener('DOMContentLoaded', async () => {
  const LOCAL_STORAGE_KEY = 'ieee_bingo_participant_id';

  // Elements
  const joinModal = document.getElementById('join-modal');
  const joinForm = document.getElementById('join-form');
  const nameInput = document.getElementById('player-name-input');
  const branchInput = document.getElementById('player-branch-input');
  const playerBar = document.getElementById('player-bar');
  const playerAvatar = document.getElementById('player-avatar');
  const playerDisplayName = document.getElementById('player-display-name');
  const playerDisplayBranch = document.getElementById('player-display-branch');
  const bingoGrid = document.getElementById('bingo-grid');
  const linesCountEl = document.getElementById('lines-count');
  const tasksCheckedCountEl = document.getElementById('tasks-checked-count');
  const bingoStatusPill = document.getElementById('bingo-status-pill');
  const soundToggleBtn = document.getElementById('sound-toggle-btn');
  const changeNameBtn = document.getElementById('change-name-btn');

  // Player Tutorial Modal Elements
  const playerTutorialBtn = document.getElementById('player-tutorial-btn');
  const inlineTutorialLink = document.getElementById('inline-tutorial-link');
  const playerTutorialModal = document.getElementById('player-tutorial-modal');
  const playerTutorialClose = document.getElementById('player-tutorial-close');
  const playerTutorialOkBtn = document.getElementById('player-tutorial-ok-btn');

  function openPlayerTutorial() {
    if (playerTutorialModal) playerTutorialModal.classList.remove('hidden');
  }

  function closePlayerTutorial() {
    if (playerTutorialModal) playerTutorialModal.classList.add('hidden');
  }

  if (playerTutorialBtn) playerTutorialBtn.addEventListener('click', openPlayerTutorial);
  if (inlineTutorialLink) inlineTutorialLink.addEventListener('click', openPlayerTutorial);
  if (playerTutorialClose) playerTutorialClose.addEventListener('click', closePlayerTutorial);
  if (playerTutorialOkBtn) playerTutorialOkBtn.addEventListener('click', closePlayerTutorial);

  // Sign / Verification Modal
  const signModal = document.getElementById('sign-task-modal');
  const modalTaskCategory = document.getElementById('modal-task-category');
  const modalTaskText = document.getElementById('modal-task-text');
  const modalErrorBox = document.getElementById('modal-error-box');
  const signTaskForm = document.getElementById('sign-task-form');
  const personNameInput = document.getElementById('person-name-input');
  const confirmSignBtn = document.getElementById('confirm-sign-btn');
  const clearTaskBtn = document.getElementById('clear-task-btn');
  const cancelSignBtn = document.getElementById('cancel-sign-btn');

  const victoryModal = document.getElementById('victory-modal');
  const continuePlayingBtn = document.getElementById('continue-playing-btn');

  // State
  let currentParticipant = null;
  let activeCellIndex = null;

  // Sound settings
  let soundEnabled = localStorage.getItem('sound_enabled') !== 'false';
  updateSoundButton();

  soundToggleBtn.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    window.sfx.enabled = soundEnabled;
    localStorage.setItem('sound_enabled', soundEnabled);
    updateSoundButton();
  });

  function updateSoundButton() {
    window.sfx.enabled = soundEnabled;
    soundToggleBtn.innerHTML = soundEnabled ? '🔊 Sound' : '🔇 Muted';
  }

  // Restore Session
  const savedId = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (savedId) {
    try {
      const p = await window.appDb.joinParticipant('', '', savedId);
      if (p && p.board) {
        currentParticipant = p;
        joinModal.classList.add('hidden');
        renderPlayerBar();
        renderBoard();
        updateProgress();
      } else {
        joinModal.classList.remove('hidden');
      }
    } catch {
      joinModal.classList.remove('hidden');
    }
  } else {
    joinModal.classList.remove('hidden');
  }

  // Join Form Submit
  joinForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    const branch = branchInput.value.trim();
    if (!name) return;

    try {
      const p = await window.appDb.joinParticipant(name, branch, currentParticipant ? currentParticipant.id : null);
      currentParticipant = p;
      localStorage.setItem(LOCAL_STORAGE_KEY, p.id);
      joinModal.classList.add('hidden');
      renderPlayerBar();
      renderBoard();
      updateProgress();
      window.sfx.playPop();
    } catch (err) {
      alert('Error joining icebreaker session. Please try again.');
      console.error(err);
    }
  });

  changeNameBtn.addEventListener('click', () => {
    if (currentParticipant) {
      nameInput.value = currentParticipant.name || '';
      branchInput.value = currentParticipant.collegeBranch || '';
    }
    joinModal.classList.remove('hidden');
  });

  function renderPlayerBar() {
    if (!currentParticipant) return;
    playerBar.style.display = 'flex';
    playerAvatar.textContent = (currentParticipant.name || 'P').charAt(0).toUpperCase();
    playerDisplayName.textContent = currentParticipant.name;
    playerDisplayBranch.textContent = currentParticipant.collegeBranch ? `(${currentParticipant.collegeBranch})` : '';
  }

  // Render 5x5 Bingo Grid
  function renderBoard() {
    if (!currentParticipant || !currentParticipant.board) return;
    bingoGrid.innerHTML = '';

    currentParticipant.board.forEach((cell, idx) => {
      const cellEl = document.createElement('div');
      cellEl.className = 'bingo-cell';
      cellEl.dataset.index = idx;

      if (cell.checked) cellEl.classList.add('checked');
      if (idx === 12) cellEl.classList.add('free-space');

      // Category badge
      const catBadge = document.createElement('span');
      catBadge.className = 'cell-category';
      catBadge.textContent = idx === 12 ? 'FREE' : (cell.category || 'TASK');

      // Main Text
      const textEl = document.createElement('div');
      textEl.className = 'cell-text';
      textEl.textContent = cell.text;

      // Note / Signer tag
      const noteEl = document.createElement('div');
      noteEl.className = 'cell-note';
      if (idx === 12) {
        noteEl.textContent = '🌟 Freebie';
      } else if (cell.notes) {
        noteEl.textContent = `✍️ ${cell.notes}`;
      } else {
        noteEl.textContent = '';
      }

      // Checkmark indicator
      const checkIndicator = document.createElement('div');
      checkIndicator.className = 'check-indicator';
      checkIndicator.innerHTML = '✓';

      cellEl.appendChild(catBadge);
      cellEl.appendChild(textEl);
      cellEl.appendChild(noteEl);
      cellEl.appendChild(checkIndicator);

      // Handle Cell Click -> Open Verification Modal
      cellEl.addEventListener('click', () => openSignModal(idx));

      bingoGrid.appendChild(cellEl);
    });
  }

  // Open Name Verification Modal (Enforces name requirement)
  function openSignModal(index) {
    if (index === 12) return; // Free space cannot be modified
    activeCellIndex = index;
    const cell = currentParticipant.board[index];

    modalTaskCategory.textContent = (cell.category || 'General').toUpperCase();
    modalTaskText.textContent = cell.text;
    personNameInput.value = cell.notes || '';
    modalErrorBox.style.display = 'none';
    modalErrorBox.textContent = '';

    if (cell.checked) {
      confirmSignBtn.textContent = 'Update Name';
      clearTaskBtn.style.display = 'block';
    } else {
      confirmSignBtn.textContent = 'Sign & Check Square ✓';
      clearTaskBtn.style.display = 'none';
    }

    signModal.classList.remove('hidden');
    setTimeout(() => personNameInput.focus(), 150);
  }

  // Handle Sign Form Submit
  signTaskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (activeCellIndex === null || !currentParticipant) return;

    const personName = personNameInput.value.trim();
    if (!personName) {
      showModalError('Please enter the name of the person who completed this challenge with you!');
      return;
    }

    confirmSignBtn.disabled = true;
    confirmSignBtn.textContent = 'Verifying...';

    try {
      const prevLines = currentParticipant.completedLines || 0;
      const updated = await window.appDb.verifyAndFillTask(
        currentParticipant.id,
        activeCellIndex,
        personName,
        'fill'
      );

      currentParticipant.board = updated.board;
      currentParticipant.completedLines = updated.completedLines;
      currentParticipant.completedCount = updated.completedCount;
      currentParticipant.hasBingo = updated.hasBingo;

      window.sfx.playPop();
      signModal.classList.add('hidden');
      renderBoard();
      updateProgress();

      if (updated.completedLines > prevLines) {
        window.sfx.playLineChime();
      }

      if (updated.hasBingo && !currentParticipant._celebrated) {
        currentParticipant._celebrated = true;
        triggerBingoCelebration();
      }
    } catch (err) {
      showModalError(err.message || 'Validation failed.');
    } finally {
      confirmSignBtn.disabled = false;
      confirmSignBtn.textContent = 'Sign & Check Square ✓';
    }
  });

  // Handle Clear / Unmark
  clearTaskBtn.addEventListener('click', async () => {
    if (activeCellIndex === null || !currentParticipant) return;
    try {
      const updated = await window.appDb.verifyAndFillTask(
        currentParticipant.id,
        activeCellIndex,
        '',
        'clear'
      );
      currentParticipant.board = updated.board;
      currentParticipant.completedLines = updated.completedLines;
      currentParticipant.completedCount = updated.completedCount;
      currentParticipant.hasBingo = updated.hasBingo;

      signModal.classList.add('hidden');
      renderBoard();
      updateProgress();
    } catch (err) {
      showModalError(err.message);
    }
  });

  cancelSignBtn.addEventListener('click', () => {
    signModal.classList.add('hidden');
    activeCellIndex = null;
  });

  function showModalError(msg) {
    modalErrorBox.textContent = msg;
    modalErrorBox.style.display = 'block';
  }

  // Update Progress & Lit Letters
  function updateProgress() {
    if (!currentParticipant) return;
    const lines = currentParticipant.completedLines || 0;
    const checkedCount = currentParticipant.board ? currentParticipant.board.filter(c => c.checked).length : 1;

    linesCountEl.textContent = `${lines} / 5`;
    tasksCheckedCountEl.textContent = `${checkedCount} / 25`;

    for (let i = 0; i < 5; i++) {
      const letterEl = document.getElementById(`letter-${i}`);
      if (letterEl) {
        if (i < lines) {
          letterEl.classList.add('lit');
        } else {
          letterEl.classList.remove('lit');
        }
      }
    }

    if (currentParticipant.hasBingo || lines >= 5) {
      bingoStatusPill.textContent = '🌟 BINGO ACHIEVED! 🌟';
      bingoStatusPill.style.color = '#38bdf8';
    } else {
      bingoStatusPill.textContent = `${5 - lines} more line${5 - lines === 1 ? '' : 's'} to BINGO`;
      bingoStatusPill.style.color = 'var(--accent-gold)';
    }
  }

  function triggerBingoCelebration() {
    window.sfx.playBingoFanfare();
    victoryModal.classList.remove('hidden');

    if (window.confetti) {
      const count = 200;
      const defaults = { origin: { y: 0.7 } };
      function fire(particleRatio, opts) {
        window.confetti(Object.assign({}, defaults, opts, {
          particleCount: Math.floor(count * particleRatio)
        }));
      }
      fire(0.25, { spread: 26, startVelocity: 55 });
      fire(0.2, { spread: 60 });
      fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
      fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
      fire(0.1, { spread: 120, startVelocity: 45 });
    }
  }

  continuePlayingBtn.addEventListener('click', () => {
    victoryModal.classList.add('hidden');
  });

  window.appDb.subscribe(
    (payload) => {
      if (payload && payload.eventType === 'RESET') {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        alert('A new round has been started by the organizers! Get ready for a fresh card.');
        location.reload();
      }
    },
    null
  );
});
