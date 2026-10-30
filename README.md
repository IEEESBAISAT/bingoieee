# ⚡ IEEE Icebreaker Bingo (5x5 Real-Time Game)

A modern, responsive, and real-time **Human Bingo Web Application** designed for college icebreaker sessions, orientations, and IEEE student branch events.

Built by a Web Designer, Full-Stack Developer, and Game Analyst to maximize student mingling, conversations, and engagement.

---

## 🌟 Key Features

### 🎮 Player Experience (`/`)
- **Zero-Friction Onboarding**: No passwords or logins required. Students just enter their name (and optional department) to generate their unique card.
- **Randomized 5x5 Card**: Each student receives a unique shuffle of icebreaker challenges from the live task pool, with a central glowing **"⭐ IEEE FREE SPACE ⭐"**.
- **Interactive Mechanics**:
  - Tap any cell to check off a task with haptic/pop sound feedback.
  - Right-click or long-press to record notes (e.g. *"Met Rahul from ECE"*).
  - Top **B-I-N-G-O** letters illuminate in gold as players complete horizontal, vertical, and diagonal lines.
  - Reaching 5 lines triggers celebratory confetti cannon explosions and victory sound fanfare!
- **Persistent State**: Card states are saved locally (`localStorage`) and synced live with the database, so refreshing or network blips won't lose their board.

### 🛠️ Admin Dashboard (`/admin12.html`)
- **Dynamic Task Management (No Hardcoding)**:
  - Add new icebreaker challenges live with category tags (*Tech, College, Social, Fun, Quirky*).
  - Toggle tasks on/off or delete them in real time.
  - Automatically randomizes tasks into players' boards without redeploying code.
- **Live Participant Monitoring**:
  - Real-time roster showing student names, department, checked tasks count, lines completed, and glowing **🏆 BINGO!** badges.
  - **🔍 Inspect Board**: Click any participant to open a live modal of their 5x5 board and see which tasks they completed and the notes they took!
- **Stage / Projector Mode**:
  - Fullscreen display with real-time QR code generation (`qrcode.js`) for students in the auditorium to scan and join instantly.
- **Round Management & Reset**:
  - One-click "Reset Round" to wipe participants and start a fresh round with new cards.

### 🗄️ Database & Realtime Architecture (Supabase + Local Fallback)
- **Supabase Integration**:
  - Uses PostgreSQL tables `tasks` and `participants` with Supabase Realtime (CDC) enabled.
  - One-click SQL migration provided in `supabase_schema.sql`.
  - Can configure Supabase keys directly inside the Admin Dashboard or via `public/js/config.js`.
- **Dual-Engine Graceful Fallback**:
  - If Supabase is not yet configured, the app runs smoothly with the included Express + Socket.IO server.

---

## 🚀 Quick Start Guide

### 1. Start Local Server
```bash
npm install
npm start
```

Open your browser:
- **Player Interface**: [http://localhost:3000](http://localhost:3000)
- **Admin Dashboard**: [http://localhost:3000/admin12.html](http://localhost:3000/admin12.html)

---

## 🗄️ Connecting Supabase (Recommended)

1. Go to [supabase.com](https://supabase.com) and create a free project.
2. Open the **SQL Editor** in your Supabase project dashboard.
3. Open [`supabase_schema.sql`](./supabase_schema.sql), copy its content, and paste it into the SQL editor, then click **Run**.
   - This creates the `tasks` and `participants` tables, sets public access policies, enables Realtime subscriptions, and pre-populates 30+ IEEE & college icebreaker tasks.
4. Copy your **Project URL** and **anon public key** from *Project Settings -> API*.
5. In your running application, open the **Admin Dashboard** (`/admin12.html`), click the top-right green/blue **Database Status Badge**, paste your URL & key, and hit **Save & Connect**!
