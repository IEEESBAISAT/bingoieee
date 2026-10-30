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
  const noteModal = document.getElementById('note-modal');
  const noteInput = document.getElementById('note-input');
  const noteTaskTitle = document.getElementById('note-task-title');
  const saveNoteBtn = document.getElementById('save-note-btn');
  const closeNoteBtn = document.getElementById('close-note-btn');
  const victoryModal = document.getElementById('victory-modal');
  const continuePlayingBtn = document.getElementById('continue-playing-btn');

  // App State
  let currentParticipant = null;
  let activeEditingCell = null;
  let previousLines = 0;

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

  // Check existing session
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
    } catch (err) {
      console.warn('Could not restore session, starting fresh:', err);
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
      alert('Error joining icebreaker session. Please verify your connection.');
      console.error(err);
    }
  });

  // Change Name / Edit Profile
  changeNameBtn.addEventListener('click', () => {
    if (currentParticipant) {
      nameInput.value = currentParticipant.name || '';
      branchInput.value = currentParticipant.collegeBranch || '';
    }
    joinModal.classList.remove('hidden');
  });

  // Render Player Bar
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

      // Note tag if present
      const noteEl = document.createElement('div');
      noteEl.className = 'cell-note';
      noteEl.textContent = cell.notes ? `✍️ ${cell.notes}` : '';

      // Check indicator checkmark
      const checkIndicator = document.createElement('div');
      checkIndicator.className = 'check-indicator';
      checkIndicator.innerHTML = '✓';

      cellEl.appendChild(catBadge);
      cellEl.appendChild(textEl);
      cellEl.appendChild(noteEl);
      cellEl.appendChild(checkIndicator);

      // Handle Cell Click (Toggle task check)
      cellEl.addEventListener('click', () => handleCellClick(idx));

      // Handle Double Click or Long Press (Add note of who was met)
      cellEl.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        openNoteModal(idx);
      });

      bingoGrid.appendChild(cellEl);
    });
  }

  // Cell Click Handler
  async function handleCellClick(index) {
    if (!currentParticipant) return;
    if (index === 12) return; // Free space cannot be untoggled

    const cell = currentParticipant.board[index];
    const newChecked = !cell.checked;
    cell.checked = newChecked;

    // Visual sound effect
    if (newChecked) {
      window.sfx.playPop();
    }

    // Immediately update local DOM for instant snappy feel
    const cellEl = bingoGrid.children[index];
    if (cellEl) {
      cellEl.classList.toggle('checked', newChecked);
    }

    // Recalculate progress
    const prevLines = currentParticipant.completedLines || 0;
    const { completedLines, hasBingo } = window.appDb.calculateLines(currentParticipant.board);
    currentParticipant.completedLines = completedLines;
    currentParticipant.hasBingo = hasBingo;
    currentParticipant.completedCount = currentParticipant.board.filter(c => c.checked).length;

    updateProgress();

    // Check if new line was formed
    if (completedLines > prevLines) {
      window.sfx.playLineChime();
    }

    // Check for full Bingo!
    if (hasBingo && !currentParticipant._celebrated) {
      currentParticipant._celebrated = true;
      triggerBingoCelebration();
    }

    // Persist to Database / Supabase
    try {
      await window.appDb.updateCardState(
        currentParticipant.id,
        index,
        newChecked,
        cell.notes || '',
        currentParticipant.board
      );
    } catch (err) {
      console.error('Failed to sync card state:', err);
    }

    // If checked for first time and no note, gently prompt note
    if (newChecked && !cell.notes) {
      setTimeout(() => {
        openNoteModal(index);
      }, 400);
    }
  }

  // Open note modal to record who they met
  function openNoteModal(index) {
    if (index === 12) return;
    activeEditingCell = index;
    const cell = currentParticipant.board[index];
    noteTaskTitle.textContent = cell.text;
    noteInput.value = cell.notes || '';
    noteModal.classList.remove('hidden');
    setTimeout(() => noteInput.focus(), 100);
  }

  saveNoteBtn.addEventListener('click', async () => {
    if (activeEditingCell === null || !currentParticipant) return;
    const note = noteInput.value.trim();
    currentParticipant.board[activeEditingCell].notes = note;

    const cellEl = bingoGrid.children[activeEditingCell];
    if (cellEl) {
      const noteEl = cellEl.querySelector('.cell-note');
      if (noteEl) noteEl.textContent = note ? `✍️ ${note}` : '';
    }

    noteModal.classList.add('hidden');

    try {
      await window.appDb.updateCardState(
        currentParticipant.id,
        activeEditingCell,
        currentParticipant.board[activeEditingCell].checked,
        note,
        currentParticipant.board
      );
    } catch (e) {
      console.error(e);
    }
    activeEditingCell = null;
  });

  closeNoteBtn.addEventListener('click', () => {
    noteModal.classList.add('hidden');
    activeEditingCell = null;
  });

  // Update B-I-N-G-O letters & statistics
  function updateProgress() {
    if (!currentParticipant) return;
    const lines = currentParticipant.completedLines || 0;
    const checkedCount = currentParticipant.board.filter(c => c.checked).length;

    linesCountEl.textContent = `${lines} / 5`;
    tasksCheckedCountEl.textContent = `${checkedCount} / 25`;

    // Light up B-I-N-G-O letters (1 line = B, 2 = I, 3 = N, 4 = G, 5 = O)
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

  // Bingo Celebration Explosion
  function triggerBingoCelebration() {
    window.sfx.playBingoFanfare();
    victoryModal.classList.remove('hidden');

    // Confetti cannon blast
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

  // Listen to remote reset event
  window.appDb.subscribe(
    (payload) => {
      if (payload && payload.eventType === 'RESET') {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        alert('A new round has started! Please enter your name to get a new card.');
        location.reload();
      }
    },
    null
  );
});
