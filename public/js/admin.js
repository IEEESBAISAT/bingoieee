// Admin Dashboard Controller with Authentication Gate
document.addEventListener('DOMContentLoaded', async () => {
  // Elements - Auth
  const loginOverlay = document.getElementById('admin-login-overlay');
  const adminMainLayout = document.getElementById('admin-main-layout');
  const adminLoginForm = document.getElementById('admin-login-form');
  const adminUserInput = document.getElementById('admin-user-input');
  const adminPassInput = document.getElementById('admin-pass-input');
  const loginErrorBox = document.getElementById('login-error-box');
  const adminLogoutBtn = document.getElementById('admin-logout-btn');

  // Elements - Dashboard
  const dbStatusBtn = document.getElementById('db-status-btn');
  const dbStatusText = document.getElementById('db-status-text');
  const supabaseModal = document.getElementById('supabase-modal');
  const supabaseModalClose = document.getElementById('supabase-modal-close');
  const sbUrlInput = document.getElementById('sb-url-input');
  const sbKeyInput = document.getElementById('sb-key-input');
  const saveSupabaseBtn = document.getElementById('save-supabase-btn');
  const disconnectSupabaseBtn = document.getElementById('disconnect-supabase-btn');

  const kpiParticipants = document.getElementById('kpi-participants');
  const kpiBingos = document.getElementById('kpi-bingos');
  const kpiTasks = document.getElementById('kpi-tasks');
  const kpiAvgProgress = document.getElementById('kpi-avg-progress');
  const tabParticipantsCount = document.getElementById('tab-participants-count');
  const tabTasksCount = document.getElementById('tab-tasks-count');

  const participantsTableBody = document.getElementById('participants-table-body');
  const participantSearch = document.getElementById('participant-search');
  const refreshParticipantsBtn = document.getElementById('refresh-participants-btn');
  const resetRoundBtn = document.getElementById('reset-round-btn');

  const addTaskForm = document.getElementById('add-task-form');
  const newTaskText = document.getElementById('new-task-text');
  const newTaskCategory = document.getElementById('new-task-category');
  const tasksGrid = document.getElementById('tasks-grid');
  const seedDefaultTasksBtn = document.getElementById('seed-default-tasks-btn');

  const inspectModal = document.getElementById('inspect-modal');
  const inspectModalClose = document.getElementById('inspect-modal-close');
  const inspectName = document.getElementById('inspect-name');
  const inspectDetails = document.getElementById('inspect-details');
  const inspectGrid = document.getElementById('inspect-grid');

  // Tutorial / Host Guide
  const tutorialGuideBtn = document.getElementById('tutorial-guide-btn');
  const quickTutorialTrigger = document.getElementById('quick-tutorial-trigger');
  const tutorialModal = document.getElementById('tutorial-modal');
  const tutorialModalClose = document.getElementById('tutorial-modal-close');
  const tutorialGotItBtn = document.getElementById('tutorial-got-it-btn');

  if (tutorialGuideBtn) {
    tutorialGuideBtn.addEventListener('click', () => tutorialModal.classList.remove('hidden'));
  }
  if (quickTutorialTrigger) {
    quickTutorialTrigger.addEventListener('click', () => tutorialModal.classList.remove('hidden'));
  }
  if (tutorialModalClose) {
    tutorialModalClose.addEventListener('click', () => tutorialModal.classList.add('hidden'));
  }
  if (tutorialGotItBtn) {
    tutorialGotItBtn.addEventListener('click', () => tutorialModal.classList.add('hidden'));
  }

  const projectorModeBtn = document.getElementById('projector-mode-btn');
  const projectorModal = document.getElementById('projector-modal');
  const projectorModalClose = document.getElementById('projector-modal-close');
  const qrcodeContainer = document.getElementById('qrcode-container');
  const projectorUrlText = document.getElementById('projector-url-text');
  const popularTasksList = document.getElementById('popular-tasks-list');

  // State
  let allTasks = [];
  let allParticipants = [];
  let activeCategoryFilter = 'ALL';

  // --- Check Authentication Gate ---
  const isAuthenticated = await window.appDb.verifyAdminSession();
  if (isAuthenticated) {
    showDashboard();
  } else {
    showLogin();
  }

  function showLogin() {
    loginOverlay.style.display = 'flex';
    adminMainLayout.style.display = 'none';
  }

  function showDashboard() {
    loginOverlay.style.display = 'none';
    adminMainLayout.style.display = 'flex';
    updateDbStatus();
    loadAllData();
  }

  // Admin Login Submit
  adminLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = adminUserInput.value.trim();
    const pass = adminPassInput.value;
    loginErrorBox.style.display = 'none';

    try {
      await window.appDb.loginAdmin(user, pass);
      showDashboard();
    } catch (err) {
      loginErrorBox.textContent = err.message || 'Invalid username or password.';
      loginErrorBox.style.display = 'block';
    }
  });

  // Admin Logout
  adminLogoutBtn.addEventListener('click', () => {
    window.appDb.logoutAdmin();
    showLogin();
  });

  // Update DB Status Pill
  async function updateDbStatus() {
    dbStatusText.textContent = 'Supabase Connected ⚡';
    dbStatusBtn.style.color = '#34d399';
  }

  // Supabase Settings Modal
  dbStatusBtn.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/supabase/status');
      const data = await res.json();
      if (data.url) sbUrlInput.value = data.url;
    } catch {}
    if (!sbUrlInput.value) sbUrlInput.value = window.SUPABASE_CONFIG.url || '';
    sbKeyInput.value = window.SUPABASE_CONFIG.anonKey || '';
    supabaseModal.classList.remove('hidden');
  });

  supabaseModalClose.addEventListener('click', () => supabaseModal.classList.add('hidden'));

  saveSupabaseBtn.addEventListener('click', async () => {
    const url = sbUrlInput.value.trim();
    const key = sbKeyInput.value.trim();
    if (!url || !key) {
      alert('Please provide both Supabase URL and Anon Key');
      return;
    }
    saveSupabaseBtn.textContent = 'Connecting & Syncing...';
    saveSupabaseBtn.disabled = true;

    try {
      // 1. Send keys to server so all players automatically sync to Supabase!
      await fetch('/api/supabase/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, anonKey: key })
      });

      // 2. Save in client adapter as well
      window.SUPABASE_CONFIG.save(url, key);
      window.appDb.init();
      await updateDbStatus();
      supabaseModal.classList.add('hidden');
      await loadAllData();
      alert('Supabase connected successfully! All tasks and participants are now synced to your Supabase tables.');
    } catch (err) {
      alert('Error connecting to Supabase: ' + err.message);
    } finally {
      saveSupabaseBtn.textContent = 'Save & Connect';
      saveSupabaseBtn.disabled = false;
    }
  });

  disconnectSupabaseBtn.addEventListener('click', async () => {
    await fetch('/api/supabase/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: '', anonKey: '' })
    });
    window.SUPABASE_CONFIG.save('', '');
    window.appDb.init();
    await updateDbStatus();
    supabaseModal.classList.add('hidden');
    loadAllData();
  });

  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const tabId = btn.dataset.tab;
      document.getElementById(tabId).classList.add('active');
    });
  });

  // --- Load Initial Data ---
  async function loadAllData() {
    await Promise.all([loadTasks(), loadParticipants()]);
    calculateKPIs();
    renderPopularTasks();
  }

  // --- Tasks Logic ---
  async function loadTasks() {
    try {
      allTasks = await window.appDb.getTasks();
      tabTasksCount.textContent = allTasks.length;
      kpiTasks.textContent = allTasks.filter(t => t.active !== false).length;
      renderTasks();
    } catch (err) {
      console.error('Failed to load tasks:', err);
    }
  }

  function renderTasks() {
    tasksGrid.innerHTML = '';
    const filtered = activeCategoryFilter === 'ALL' 
      ? allTasks 
      : allTasks.filter(t => (t.category || '').toLowerCase() === activeCategoryFilter.toLowerCase());

    if (filtered.length === 0) {
      tasksGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 2rem;">No tasks found in this category.</div>';
      return;
    }

    filtered.forEach(task => {
      const card = document.createElement('div');
      card.className = `task-card ${task.active === false ? 'inactive' : ''}`;
      const catLower = (task.category || 'general').toLowerCase();

      card.innerHTML = `
        <div class="task-card-header">
          <span class="badge ${catLower}">${task.category || 'General'}</span>
          <span style="font-size: 0.75rem; color: ${task.active !== false ? 'var(--accent-emerald)' : 'var(--text-muted)'}">
            ${task.active !== false ? '● Active' : '○ Inactive'}
          </span>
        </div>
        <div class="task-card-text">${escapeHtml(task.text)}</div>
        <div class="task-card-actions">
          <button class="btn" style="padding: 4px 8px; font-size: 0.75rem;" data-toggle-id="${task.id}">
            ${task.active !== false ? 'Deactivate' : 'Activate'}
          </button>
          <button class="btn btn-danger" style="padding: 4px 8px; font-size: 0.75rem;" data-delete-id="${task.id}">
            Delete
          </button>
        </div>
      `;

      card.querySelector(`[data-toggle-id="${task.id}"]`).addEventListener('click', async () => {
        const newActive = task.active === false;
        await window.appDb.updateTask(task.id, { active: newActive });
        task.active = newActive;
        renderTasks();
        kpiTasks.textContent = allTasks.filter(t => t.active !== false).length;
      });

      card.querySelector(`[data-delete-id="${task.id}"]`).addEventListener('click', async () => {
        if (confirm(`Delete task: "${task.text}"?`)) {
          await window.appDb.deleteTask(task.id);
          allTasks = allTasks.filter(t => t.id !== task.id);
          renderTasks();
          kpiTasks.textContent = allTasks.filter(t => t.active !== false).length;
          tabTasksCount.textContent = allTasks.length;
        }
      });

      tasksGrid.appendChild(card);
    });
  }

  addTaskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = newTaskText.value.trim();
    const category = newTaskCategory.value;
    if (!text) return;

    try {
      const created = await window.appDb.addTask(text, category);
      allTasks.unshift(created);
      newTaskText.value = '';
      renderTasks();
      kpiTasks.textContent = allTasks.filter(t => t.active !== false).length;
      tabTasksCount.textContent = allTasks.length;
    } catch (err) {
      alert('Error adding task: ' + err.message);
    }
  });

  document.querySelectorAll('.task-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.task-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategoryFilter = btn.dataset.category;
      renderTasks();
    });
  });

  seedDefaultTasksBtn.addEventListener('click', async () => {
    if (confirm('Add IEEE curated challenge presets to the task pool?')) {
      const presets = [
        { text: 'Uses Dark Mode on every single app 🌙', category: 'Tech' },
        { text: 'Pulled an all-nighter for a hackathon or exam ☕', category: 'College' },
        { text: 'From a different college branch than you 🎓', category: 'Social' },
        { text: 'Accidentally pushed an API key to GitHub 🙈', category: 'Tech' },
        { text: 'Takes a quick selfie together! 📸', category: 'Fun' },
        { text: 'Can solve a Rubik\'s cube under 2 minutes 🧊', category: 'Fun' },
        { text: 'Owns an Arduino, Raspberry Pi, or ESP32 🤖', category: 'Tech' },
        { text: 'First-year attending their first IEEE event 🌟', category: 'College' }
      ];
      for (let p of presets) {
        const added = await window.appDb.addTask(p.text, p.category);
        allTasks.push(added);
      }
      renderTasks();
      kpiTasks.textContent = allTasks.filter(t => t.active !== false).length;
      tabTasksCount.textContent = allTasks.length;
    }
  });

  // --- Participants Logic ---
  async function loadParticipants() {
    try {
      allParticipants = await window.appDb.getParticipants();
      tabParticipantsCount.textContent = allParticipants.length;
      renderParticipantsTable();
    } catch (err) {
      console.error('Failed to load participants:', err);
    }
  }

  function renderParticipantsTable() {
    const q = (participantSearch.value || '').toLowerCase().trim();
    const filtered = allParticipants.filter(p => 
      (p.name || '').toLowerCase().includes(q) || (p.collegeBranch || '').toLowerCase().includes(q)
    );

    if (filtered.length === 0) {
      participantsTableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">
            ${allParticipants.length === 0 ? 'No participants joined yet. Share the QR code!' : 'No matching participants found.'}
          </td>
        </tr>
      `;
      return;
    }

    participantsTableBody.innerHTML = '';
    filtered.forEach(p => {
      const tr = document.createElement('tr');
      const lines = p.completedLines || 0;
      const tasksDone = p.completedCount !== undefined ? p.completedCount : (p.board ? p.board.filter(c => c.checked).length : 0);
      const isBingo = p.hasBingo || lines >= 5;

      tr.innerHTML = `
        <td>
          <div style="font-weight: 700; color: #fff;">${escapeHtml(p.name)}</div>
          <div style="font-size: 0.72rem; color: var(--text-muted);">ID: ${escapeHtml(p.id.substring(0, 8))}</div>
        </td>
        <td>
          <span style="font-size: 0.85rem; color: var(--accent-cyan);">${escapeHtml(p.collegeBranch || 'General')}</span>
        </td>
        <td>
          <span style="font-weight: 700;">${tasksDone} / 25</span>
        </td>
        <td>
          <span style="font-weight: 700; color: ${lines > 0 ? 'var(--accent-gold)' : 'var(--text-muted)'};">${lines} lines</span>
        </td>
        <td>
          ${isBingo 
            ? '<span class="bingo-badge">🏆 BINGO!</span>' 
            : `<span style="font-size: 0.8rem; color: var(--text-muted);">${5 - lines} more to go</span>`}
        </td>
        <td style="font-size: 0.78rem; color: var(--text-muted);">
          ${formatTime(p.lastActive || p.joinedAt)}
        </td>
        <td>
          <div style="display: flex; gap: 6px;">
            <button class="btn" style="padding: 4px 8px; font-size: 0.75rem;" data-inspect-id="${p.id}">
              🔍 Inspect
            </button>
            <button class="btn btn-danger" style="padding: 4px 8px; font-size: 0.75rem;" data-remove-id="${p.id}">
              &times;
            </button>
          </div>
        </td>
      `;

      tr.querySelector(`[data-inspect-id="${p.id}"]`).addEventListener('click', () => openInspectModal(p));
      tr.querySelector(`[data-remove-id="${p.id}"]`).addEventListener('click', async () => {
        if (confirm(`Remove participant "${p.name}"?`)) {
          await window.appDb.deleteParticipant(p.id);
          allParticipants = allParticipants.filter(part => part.id !== p.id);
          renderParticipantsTable();
          calculateKPIs();
        }
      });

      participantsTableBody.appendChild(tr);
    });
  }

  participantSearch.addEventListener('input', renderParticipantsTable);
  refreshParticipantsBtn.addEventListener('click', loadParticipants);

  // Inspect Participant Board Modal
  function openInspectModal(p) {
    inspectName.textContent = `${p.name}’s 5x5 Bingo Card`;
    inspectDetails.textContent = `Branch: ${p.collegeBranch || 'None'} • Lines: ${p.completedLines || 0}/5 • Signed: ${p.completedCount || 0}/25`;
    inspectGrid.innerHTML = '';

    if (p.board && Array.isArray(p.board)) {
      p.board.forEach((cell, idx) => {
        const cellEl = document.createElement('div');
        cellEl.className = `bingo-cell ${cell.checked ? 'checked' : ''} ${idx === 12 ? 'free-space' : ''}`;
        cellEl.style.minHeight = '75px';
        cellEl.style.padding = '4px';

        cellEl.innerHTML = `
          <span class="cell-category">${idx === 12 ? 'FREE' : (cell.category || '')}</span>
          <div class="cell-text" style="font-size: 0.65rem;">${escapeHtml(cell.text)}</div>
          ${cell.notes ? `<div class="cell-note" style="font-size: 0.6rem; color: #38bdf8; font-weight: 600;">✍️ Signed by: ${escapeHtml(cell.notes)}</div>` : ''}
          <div class="check-indicator">${cell.checked ? '✓' : ''}</div>
        `;
        inspectGrid.appendChild(cellEl);
      });
    }

    inspectModal.classList.remove('hidden');
  }

  inspectModalClose.addEventListener('click', () => inspectModal.classList.add('hidden'));

  // Projector Mode & QR Code
  projectorModeBtn.addEventListener('click', () => {
    projectorModal.classList.remove('hidden');
    const playerUrl = window.location.origin;
    projectorUrlText.textContent = playerUrl;

    qrcodeContainer.innerHTML = '';
    if (window.QRCode) {
      new QRCode(qrcodeContainer, {
        text: playerUrl,
        width: 220,
        height: 220,
        colorDark: "#0b0f19",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
      });
    }
  });

  projectorModalClose.addEventListener('click', () => projectorModal.classList.add('hidden'));

  // Reset Round
  resetRoundBtn.addEventListener('click', async () => {
    const confirmation = prompt('Are you sure you want to RESET this round? All participants\' boards will be cleared! Type "RESET" to confirm:');
    if (confirmation === 'RESET') {
      await window.appDb.resetAllParticipants();
      allParticipants = [];
      renderParticipantsTable();
      calculateKPIs();
      alert('Event round reset successfully!');
    }
  });

  function calculateKPIs() {
    const total = allParticipants.length;
    const bingos = allParticipants.filter(p => p.hasBingo || (p.completedLines && p.completedLines >= 5)).length;
    kpiParticipants.textContent = total;
    kpiBingos.textContent = bingos;

    if (total > 0) {
      const totalChecks = allParticipants.reduce((sum, p) => sum + (p.completedCount || 0), 0);
      const avg = Math.round((totalChecks / (total * 25)) * 100);
      kpiAvgProgress.textContent = `${avg}%`;
    } else {
      kpiAvgProgress.textContent = '0%';
    }
  }

  function renderPopularTasks() {
    const counts = {};
    allParticipants.forEach(p => {
      if (p.board) {
        p.board.forEach(c => {
          if (c.checked && c.id !== 'free_space') {
            counts[c.text] = (counts[c.text] || 0) + 1;
          }
        });
      }
    });

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    popularTasksList.innerHTML = '';

    if (sorted.length === 0) {
      popularTasksList.innerHTML = '<div style="color: var(--text-muted); font-size: 0.9rem;">No task completion data recorded yet.</div>';
      return;
    }

    sorted.forEach(([text, count], idx) => {
      const item = document.createElement('div');
      item.style.cssText = 'background: var(--bg-surface); padding: 12px 16px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; border: 1px solid var(--border);';
      item.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="font-weight: 800; color: var(--accent-gold); font-size: 1.1rem;">#${idx+1}</span>
          <span style="font-size: 0.9rem; font-weight: 500;">${escapeHtml(text)}</span>
        </div>
        <div style="font-weight: 700; color: var(--accent-cyan); font-size: 0.9rem; background: rgba(56, 189, 248, 0.1); padding: 4px 10px; border-radius: 6px;">
          ${count} people
        </div>
      `;
      popularTasksList.appendChild(item);
    });
  }

  window.appDb.subscribe(
    async () => {
      await loadParticipants();
      calculateKPIs();
      renderPopularTasks();
    },
    async () => {
      await loadTasks();
    }
  );

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function formatTime(isoStr) {
    if (!isoStr) return '-';
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '-';
    }
  }
});
