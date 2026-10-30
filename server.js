const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');
const PARTICIPANTS_FILE = path.join(DATA_DIR, 'participants.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Helpers for file persistence
function readJSON(filePath, fallback = []) {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2));
      return fallback;
    }
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return fallback;
  }
}

function writeJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
  }
}

// In-memory cache for fast response, synced to disk
let tasks = readJSON(TASKS_FILE, []);
let participants = readJSON(PARTICIPANTS_FILE, []);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Shuffle utility (Fisher-Yates)
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Generate 5x5 randomized board
function generateBoard(taskPool) {
  let activePool = taskPool.filter(t => t.active !== false);
  if (activePool.length === 0) {
    activePool = taskPool;
  }
  
  let selected = [];
  if (activePool.length >= 24) {
    selected = shuffleArray(activePool).slice(0, 24);
  } else {
    // Fill up to 24 by looping
    let poolCopy = shuffleArray(activePool);
    while (selected.length < 24) {
      if (poolCopy.length === 0) poolCopy = shuffleArray(activePool);
      selected.push(poolCopy.pop());
    }
  }

  // Build 25 cells with center as Free Space
  const board = [];
  let taskIndex = 0;

  for (let i = 0; i < 25; i++) {
    if (i === 12) {
      board.push({
        index: 12,
        id: 'free_space',
        text: '⭐ FREE SPACE ⭐',
        category: 'Free',
        checked: true,
        notes: 'Host Freebie'
      });
    } else {
      const task = selected[taskIndex++];
      board.push({
        index: i,
        id: task.id || `t_${i}`,
        text: task.text,
        category: task.category || 'General',
        checked: false,
        notes: ''
      });
    }
  }

  return board;
}

// Calculate bingo lines (0 to 12 possible: 5 rows + 5 cols + 2 diagonals)
function checkBingoLines(board) {
  let completedLines = 0;
  const lineDetails = [];

  // Rows
  for (let r = 0; r < 5; r++) {
    const rowIndices = [r*5, r*5+1, r*5+2, r*5+3, r*5+4];
    if (rowIndices.every(idx => board[idx] && board[idx].checked)) {
      completedLines++;
      lineDetails.push({ type: 'row', index: r });
    }
  }

  // Columns
  for (let c = 0; c < 5; c++) {
    const colIndices = [c, c+5, c+10, c+15, c+20];
    if (colIndices.every(idx => board[idx] && board[idx].checked)) {
      completedLines++;
      lineDetails.push({ type: 'col', index: c });
    }
  }

  // Main diagonal (\)
  const d1 = [0, 6, 12, 18, 24];
  if (d1.every(idx => board[idx] && board[idx].checked)) {
    completedLines++;
    lineDetails.push({ type: 'diagonal', index: 1 });
  }

  // Anti-diagonal (/)
  const d2 = [4, 8, 12, 16, 20];
  if (d2.every(idx => board[idx] && board[idx].checked)) {
    completedLines++;
    lineDetails.push({ type: 'diagonal', index: 2 });
  }

  const hasBingo = completedLines >= 5; // Standard 5-line Bingo for 5 letters B-I-N-G-O (or >= 1 for early bingo)
  return { completedLines, lineDetails, hasBingo };
}

// ==================== API ROUTES ====================

// --- Tasks CRUD ---
app.get('/api/tasks', (req, res) => {
  res.json({ success: true, tasks });
});

app.post('/api/tasks', (req, res) => {
  const { text, category } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ success: false, error: 'Task text is required' });
  }
  const newTask = {
    id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    text: text.trim(),
    category: category ? category.trim() : 'General',
    active: true
  };
  tasks.push(newTask);
  writeJSON(TASKS_FILE, tasks);
  io.emit('tasks:updated', { count: tasks.length });
  res.status(201).json({ success: true, task: newTask, total: tasks.length });
});

app.put('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const { text, category, active } = req.body;
  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }

  if (text !== undefined) tasks[idx].text = text.trim();
  if (category !== undefined) tasks[idx].category = category.trim();
  if (active !== undefined) tasks[idx].active = Boolean(active);

  writeJSON(TASKS_FILE, tasks);
  io.emit('tasks:updated', { count: tasks.length });
  res.json({ success: true, task: tasks[idx] });
});

app.delete('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const initialLen = tasks.length;
  tasks = tasks.filter(t => t.id !== id);
  if (tasks.length === initialLen) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }
  writeJSON(TASKS_FILE, tasks);
  io.emit('tasks:updated', { count: tasks.length });
  res.json({ success: true, total: tasks.length });
});

// --- Join / Participant Management ---
app.post('/api/join', (req, res) => {
  const { name, collegeBranch, participantId } = req.body;

  // Reconnect existing participant
  if (participantId) {
    const existing = participants.find(p => p.id === participantId);
    if (existing) {
      if (name && name.trim()) existing.name = name.trim();
      if (collegeBranch) existing.collegeBranch = collegeBranch.trim();
      existing.lastActive = new Date().toISOString();
      writeJSON(PARTICIPANTS_FILE, participants);
      return res.json({ success: true, participant: existing, isReturning: true });
    }
  }

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, error: 'Please enter your name to start.' });
  }

  // Create new player with randomized card
  const newId = `p_${uuidv4().substring(0, 8)}`;
  const board = generateBoard(tasks);
  const { completedLines, hasBingo } = checkBingoLines(board);

  const participant = {
    id: newId,
    name: name.trim(),
    collegeBranch: collegeBranch ? collegeBranch.trim() : '',
    board,
    completedLines,
    hasBingo,
    joinedAt: new Date().toISOString(),
    lastActive: new Date().toISOString(),
    completedCount: board.filter(c => c.checked).length
  };

  participants.push(participant);
  writeJSON(PARTICIPANTS_FILE, participants);

  // Notify admin dashboard in real-time
  io.emit('participant:joined', {
    id: participant.id,
    name: participant.name,
    collegeBranch: participant.collegeBranch,
    totalParticipants: participants.length
  });

  res.status(201).json({ success: true, participant });
});

// Update card checked state or notes
app.post('/api/card/update', (req, res) => {
  const { participantId, cellIndex, checked, notes } = req.body;
  if (!participantId || cellIndex === undefined) {
    return res.status(400).json({ success: false, error: 'Missing parameters' });
  }

  const p = participants.find(part => part.id === participantId);
  if (!p) {
    return res.status(404).json({ success: false, error: 'Participant not found' });
  }

  if (p.board && p.board[cellIndex]) {
    // Can't uncheck Free Space
    if (cellIndex !== 12) {
      if (checked !== undefined) p.board[cellIndex].checked = Boolean(checked);
    }
    if (notes !== undefined) {
      p.board[cellIndex].notes = notes.trim();
    }
  }

  const stats = checkBingoLines(p.board);
  const wasBingo = p.hasBingo;
  p.completedLines = stats.completedLines;
  p.hasBingo = stats.hasBingo;
  p.completedCount = p.board.filter(c => c.checked).length;
  p.lastActive = new Date().toISOString();

  writeJSON(PARTICIPANTS_FILE, participants);

  // Real-time broadcast to admin
  io.emit('participant:updated', {
    id: p.id,
    name: p.name,
    completedCount: p.completedCount,
    completedLines: p.completedLines,
    hasBingo: p.hasBingo,
    newBingo: !wasBingo && p.hasBingo,
    cellIndex,
    notes: p.board[cellIndex] ? p.board[cellIndex].notes : ''
  });

  res.json({
    success: true,
    participant: {
      id: p.id,
      completedCount: p.completedCount,
      completedLines: p.completedLines,
      hasBingo: p.hasBingo,
      lineDetails: stats.lineDetails,
      board: p.board
    }
  });
});

// Get participants list for admin
app.get('/api/participants', (req, res) => {
  res.json({
    success: true,
    count: participants.length,
    participants
  });
});

// Get single participant board (for live inspect modal on admin)
app.get('/api/participants/:id', (req, res) => {
  const p = participants.find(part => part.id === req.params.id);
  if (!p) return res.status(404).json({ success: false, error: 'Not found' });
  res.json({ success: true, participant: p });
});

// Delete a participant
app.delete('/api/participants/:id', (req, res) => {
  const { id } = req.params;
  const initial = participants.length;
  participants = participants.filter(p => p.id !== id);
  if (participants.length === initial) {
    return res.status(404).json({ success: false, error: 'Not found' });
  }
  writeJSON(PARTICIPANTS_FILE, participants);
  io.emit('participant:removed', { id, count: participants.length });
  res.json({ success: true, count: participants.length });
});

// Overall stats
app.get('/api/stats', (req, res) => {
  const total = participants.length;
  const withBingo = participants.filter(p => p.hasBingo).length;
  const totalTasks = tasks.length;
  const activeTasks = tasks.filter(t => t.active !== false).length;
  
  // Most completed tasks ranking
  const taskCounts = {};
  participants.forEach(p => {
    if (p.board) {
      p.board.forEach(cell => {
        if (cell.checked && cell.id !== 'free_space') {
          taskCounts[cell.text] = (taskCounts[cell.text] || 0) + 1;
        }
      });
    }
  });

  const topCompletedTasks = Object.entries(taskCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([text, count]) => ({ text, count }));

  res.json({
    success: true,
    totalParticipants: total,
    bingoAchievers: withBingo,
    totalTasks,
    activeTasks,
    topCompletedTasks
  });
});

// Reset participants for a fresh round
app.post('/api/reset-game', (req, res) => {
  participants = [];
  writeJSON(PARTICIPANTS_FILE, participants);
  io.emit('game:reset');
  res.json({ success: true, message: 'All participants and board states cleared.' });
});

// Socket connection
io.on('connection', (socket) => {
  // Can send quick heartbeat or initial stats
  socket.emit('connected', { timestamp: Date.now() });
});

server.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 IEEE Icebreaker Bingo Server is running!`);
  console.log(`📱 Player URL:    http://localhost:${PORT}`);
  console.log(`🛠️ Admin Dashboard: http://localhost:${PORT}/admin.html`);
  console.log(`===============================================`);
});
