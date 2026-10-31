/**
 * Unified Database & Realtime Adapter
 * Interfaces with Server API & Supabase with Admin Authentication & Signature Rules.
 */

class DatabaseAdapter {
  constructor() {
    this.client = null;
    this.mode = 'local';
    this.adminToken = sessionStorage.getItem('ieee_admin_token') || null;
    this.init();
  }

  init() {
    if (window.supabase && window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.isConfigured()) {
      try {
        this.client = window.supabase.createClient(
          window.SUPABASE_CONFIG.url,
          window.SUPABASE_CONFIG.anonKey
        );
        this.mode = 'supabase';
        console.log('⚡ Connected to Supabase Database');
      } catch (e) {
        console.warn('Fallback to local API:', e);
        this.mode = 'local';
      }
    } else {
      this.mode = 'local';
    }
  }

  // --- Admin Authentication ---
  async loginAdmin(username, password) {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Login failed');
    }
    this.adminToken = data.token;
    sessionStorage.setItem('ieee_admin_token', data.token);
    return data;
  }

  async verifyAdminSession() {
    if (!this.adminToken) return false;
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'x-admin-token': this.adminToken }
      });
      const data = await res.json();
      return Boolean(data.valid);
    } catch {
      return false;
    }
  }

  logoutAdmin() {
    this.adminToken = null;
    sessionStorage.removeItem('ieee_admin_token');
  }

  getAdminHeaders() {
    return {
      'Content-Type': 'application/json',
      'x-admin-token': this.adminToken || ''
    };
  }

  // --- Task Operations ---
  async getTasks() {
    // Always use server API for tasks - server handles Supabase sync internally
    // This ensures task IDs are always consistent for edit/delete operations
    const res = await fetch('/api/tasks');
    const data = await res.json();
    return data.tasks || [];
  }

  async addTask(text, category = 'General') {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: this.getAdminHeaders(),
      body: JSON.stringify({ text, category })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.task;
  }

  async updateTask(id, updates) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PUT',
      headers: this.getAdminHeaders(),
      body: JSON.stringify(updates)
    });
    return await res.json();
  }

  async deleteTask(id) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'DELETE',
      headers: this.getAdminHeaders()
    });
    return await res.json();
  }

  // --- Participant Operations ---
  async joinParticipant(name, branch, existingId = null) {
    const res = await fetch('/api/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, collegeBranch: branch, participantId: existingId })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.participant;
  }

  // Enforces:
  // 1. Task filled ONLY when there's a name on it
  // 2. Name cannot appear > 2 times on individual card
  // 3. Name cannot appear > 8 times across entire event
  async verifyAndFillTask(participantId, cellIndex, personName, action = 'fill') {
    const res = await fetch('/api/card/verify-and-fill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participantId, cellIndex, personName, action })
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error);
    }
    return data.participant;
  }

  async getParticipants() {
    const res = await fetch('/api/participants', {
      headers: this.getAdminHeaders()
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.participants || [];
  }

  async deleteParticipant(id) {
    const res = await fetch(`/api/participants/${id}`, {
      method: 'DELETE',
      headers: this.getAdminHeaders()
    });
    return await res.json();
  }

  async resetAllParticipants() {
    const res = await fetch('/api/reset-game', {
      method: 'POST',
      headers: this.getAdminHeaders()
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return true;
  }

  // Realtime Subscriptions
  subscribe(onParticipantChange, onTasksChange) {
    if (window.io) {
      const socket = window.io();
      if (onParticipantChange) {
        socket.on('participant:joined', () => onParticipantChange({ eventType: 'INSERT' }));
        socket.on('participant:updated', (p) => onParticipantChange({ eventType: 'UPDATE', new: p }));
        socket.on('participant:removed', () => onParticipantChange({ eventType: 'DELETE' }));
        socket.on('game:reset', () => onParticipantChange({ eventType: 'RESET' }));
      }
      if (onTasksChange) {
        socket.on('tasks:updated', () => onTasksChange({ eventType: 'TASKS_CHANGED' }));
      }
      return socket;
    }
  }

  calculateLines(board) {
    let completedLines = 0;
    for (let r = 0; r < 5; r++) {
      if ([0,1,2,3,4].every(c => board[r*5 + c] && board[r*5 + c].checked)) completedLines++;
    }
    for (let c = 0; c < 5; c++) {
      if ([0,1,2,3,4].every(r => board[r*5 + c] && board[r*5 + c].checked)) completedLines++;
    }
    if ([0, 6, 12, 18, 24].every(i => board[i] && board[i].checked)) completedLines++;
    if ([4, 8, 12, 16, 20].every(i => board[i] && board[i].checked)) completedLines++;
    return { completedLines, hasBingo: completedLines >= 5 };
  }
}

window.appDb = new DatabaseAdapter();
