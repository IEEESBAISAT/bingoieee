/**
 * Unified Database & Realtime Adapter
 * Seamlessly interfaces with Supabase if configured, or falls back to local Express server.
 */

class DatabaseAdapter {
  constructor() {
    this.client = null;
    this.mode = 'local'; // 'supabase' or 'local'
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
        console.log('⚡ Connected to Supabase Database (Realtime enabled)');
      } catch (e) {
        console.warn('Failed to initialize Supabase client, falling back to local API:', e);
        this.mode = 'local';
      }
    } else {
      this.mode = 'local';
      console.log('📁 Operating in Local API mode (Connect Supabase in Admin Dashboard)');
    }
  }

  // --- Task Operations ---
  async getTasks() {
    if (this.mode === 'supabase') {
      const { data, error } = await this.client
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data.map(t => ({ id: t.id, text: t.text, category: t.category, active: t.is_active }));
    } else {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      return data.tasks || [];
    }
  }

  async addTask(text, category = 'General') {
    if (this.mode === 'supabase') {
      const { data, error } = await this.client
        .from('tasks')
        .insert([{ text, category, is_active: true }])
        .select();
      if (error) throw error;
      return { id: data[0].id, text: data[0].text, category: data[0].category, active: data[0].is_active };
    } else {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, category })
      });
      const data = await res.json();
      return data.task;
    }
  }

  async updateTask(id, updates) {
    if (this.mode === 'supabase') {
      const payload = {};
      if (updates.text !== undefined) payload.text = updates.text;
      if (updates.category !== undefined) payload.category = updates.category;
      if (updates.active !== undefined) payload.is_active = updates.active;

      const { data, error } = await this.client
        .from('tasks')
        .update(payload)
        .eq('id', id)
        .select();
      if (error) throw error;
      return data[0];
    } else {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      return await res.json();
    }
  }

  async deleteTask(id) {
    if (this.mode === 'supabase') {
      const { error } = await this.client
        .from('tasks')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return true;
    } else {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      return await res.json();
    }
  }

  // --- Participant Operations ---
  async joinParticipant(name, branch, existingId = null) {
    if (this.mode === 'supabase') {
      // If reconnecting with existing ID
      if (existingId) {
        const { data, error } = await this.client
          .from('participants')
          .select('*')
          .eq('id', existingId)
          .maybeSingle();

        if (data && !error) {
          await this.client
            .from('participants')
            .update({ last_active: new Date().toISOString() })
            .eq('id', existingId);
          return {
            id: data.id,
            name: data.name,
            collegeBranch: data.branch,
            board: data.board,
            completedLines: data.completed_lines,
            completedCount: data.completed_count,
            hasBingo: data.has_bingo
          };
        }
      }

      // Generate randomized 5x5 board from active tasks in Supabase
      const tasks = await this.getTasks();
      const board = this.generateBoardFromTasks(tasks);

      const { data, error } = await this.client
        .from('participants')
        .insert([{
          name,
          branch: branch || '',
          board,
          completed_lines: 0,
          completed_count: 1, // Free space
          has_bingo: false
        }])
        .select();

      if (error) throw error;
      const p = data[0];
      return {
        id: p.id,
        name: p.name,
        collegeBranch: p.branch,
        board: p.board,
        completedLines: p.completed_lines,
        completedCount: p.completed_count,
        hasBingo: p.has_bingo
      };
    } else {
      const res = await fetch('/api/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, collegeBranch: branch, participantId: existingId })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.participant;
    }
  }

  async updateCardState(participantId, cellIndex, checked, notes, currentBoard) {
    // Clone and mutate board
    const updatedBoard = [...currentBoard];
    if (cellIndex !== 12) {
      if (checked !== undefined) updatedBoard[cellIndex].checked = Boolean(checked);
    }
    if (notes !== undefined) {
      updatedBoard[cellIndex].notes = notes;
    }

    const { completedLines, hasBingo } = this.calculateLines(updatedBoard);
    const completedCount = updatedBoard.filter(c => c.checked).length;

    if (this.mode === 'supabase') {
      const { error } = await this.client
        .from('participants')
        .update({
          board: updatedBoard,
          completed_lines: completedLines,
          completed_count: completedCount,
          has_bingo: hasBingo,
          last_active: new Date().toISOString()
        })
        .eq('id', participantId);

      if (error) throw error;
      return { board: updatedBoard, completedLines, completedCount, hasBingo };
    } else {
      const res = await fetch('/api/card/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId, cellIndex, checked, notes })
      });
      const data = await res.json();
      return data.participant;
    }
  }

  async getParticipants() {
    if (this.mode === 'supabase') {
      const { data, error } = await this.client
        .from('participants')
        .select('*')
        .order('last_active', { ascending: false });

      if (error) throw error;
      return data.map(p => ({
        id: p.id,
        name: p.name,
        collegeBranch: p.branch,
        board: p.board,
        completedLines: p.completed_lines,
        completedCount: p.completed_count,
        hasBingo: p.has_bingo,
        joinedAt: p.joined_at,
        lastActive: p.last_active
      }));
    } else {
      const res = await fetch('/api/participants');
      const data = await res.json();
      return data.participants || [];
    }
  }

  async deleteParticipant(id) {
    if (this.mode === 'supabase') {
      const { error } = await this.client.from('participants').delete().eq('id', id);
      if (error) throw error;
      return true;
    } else {
      await fetch(`/api/participants/${id}`, { method: 'DELETE' });
      return true;
    }
  }

  async resetAllParticipants() {
    if (this.mode === 'supabase') {
      // In Supabase, delete all rows from participants
      const { error } = await this.client.from('participants').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;
      return true;
    } else {
      await fetch('/api/reset-game', { method: 'POST' });
      return true;
    }
  }

  // --- Realtime Subscriptions ---
  subscribe(onParticipantChange, onTasksChange) {
    if (this.mode === 'supabase') {
      const channel = this.client
        .channel('db-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'participants' }, payload => {
          if (onParticipantChange) onParticipantChange(payload);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, payload => {
          if (onTasksChange) onTasksChange(payload);
        })
        .subscribe();
      return channel;
    } else if (window.io) {
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

  // Helper: Board Generator
  generateBoardFromTasks(taskPool) {
    let active = taskPool.filter(t => t.active !== false);
    if (active.length === 0) active = taskPool;

    // Shuffle
    const shuffled = [...active];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const selected = [];
    while (selected.length < 24) {
      if (shuffled.length === 0) break;
      for (let t of shuffled) {
        if (selected.length < 24) selected.push(t);
      }
    }

    const board = [];
    let taskIdx = 0;
    for (let i = 0; i < 25; i++) {
      if (i === 12) {
        board.push({
          index: 12,
          id: 'free_space',
          text: '⭐ IEEE FREE SPACE ⭐',
          category: 'Free',
          checked: true,
          notes: 'Icebreaker Star'
        });
      } else {
        const item = selected[taskIdx++];
        board.push({
          index: i,
          id: item.id || `cell_${i}`,
          text: item.text,
          category: item.category || 'General',
          checked: false,
          notes: ''
        });
      }
    }
    return board;
  }

  // Helper: Bingo Lines calculation
  calculateLines(board) {
    let completedLines = 0;
    // Rows
    for (let r = 0; r < 5; r++) {
      if ([0,1,2,3,4].every(c => board[r*5 + c] && board[r*5 + c].checked)) completedLines++;
    }
    // Cols
    for (let c = 0; c < 5; c++) {
      if ([0,1,2,3,4].every(r => board[r*5 + c] && board[r*5 + c].checked)) completedLines++;
    }
    // Diagonals
    if ([0, 6, 12, 18, 24].every(i => board[i] && board[i].checked)) completedLines++;
    if ([4, 8, 12, 16, 20].every(i => board[i] && board[i].checked)) completedLines++;

    return { completedLines, hasBingo: completedLines >= 5 };
  }
}

window.appDb = new DatabaseAdapter();
