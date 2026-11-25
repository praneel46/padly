# Padly — YOUR SPACE. ANYWHERE

<p align="center">
  <img src="public/assets/padly-logo-white.png" alt="Padly Logo" width="220" />
</p>

**Padly** is a real-time collaborative workspace, online notepad, and digital vault with zero signups or logins required. Open or share any pad simply by typing a code (e.g. `111`, `notes`, `project/design`).

Built with **React 18, TypeScript, Tailwind CSS, WebRTC, WebSockets, Web Crypto (AES-GCM), and Express.js**.

---

## 🌟 Core Capabilities

1. **📝 Left-Aligned Notepad & AI Assist**:
   - Clean, left-aligned rich editor with autosave (~500ms debounce).
   - Global `Ctrl+X` copies the entire pad to system clipboard (`Win+V` / `Ctrl+V` compatible) with toast alerts.
   - Built-in AI assistant for summaries, translation, proofreading, and action item extraction.
   - On-demand `[👁️ Preview]` toggle icon.

2. **📄 PDFs & Files Hub**:
   - Multi-file drag & drop supporting documents, PDFs, ZIPs, and video (up to 50MB per file).
   - One-click **"Download All as ZIP"**.

3. **🖼️ Photo & Visual Gallery**:
   - Image gallery with full-screen lightbox preview and OCR scanning.

4. **🎵 Audio & Background Player**:
   - Upload audio tracks (MP3, WAV, FLAC, AAC) into a persistent playlist that continues playing while writing.

5. **🔄 Document & Media Converter Studio**:
   - In-browser document tools (Photos to PDF, Merge PDF, Split Pages, Doc/PPT/PDF converter) with direct **"Save to Pad"**.

6. **📹 Multi-Person Video & Audio Calling (Google Meet / Zoom Style)**:
   - WebRTC multi-peer video grid showing every participant's face (including local camera preview).
   - **Screen Sharing**: Present laptop or mobile screens in real time.
   - **Live Captions (CC)**: In-browser speech-to-text generating real-time live captions broadcast to all peers.
   - **Inline Audio & Video Call Panel**: Sleek soundwave equalizer with Mute, Video, and End Call controls right in the chat sidebar.

7. **🔒 Client-Side AES-GCM Encryption**:
   - Optional password lock where content is encrypted client-side using PBKDF2 and AES-GCM 256-bit before reaching the server.

---

## 📁 Repository Structure

```
padly/
├── frontend/             # Frontend App (Deploy to Vercel)
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   ├── vercel.json       # SPA client routing fallback
│   ├── src/
│   └── public/
├── backend/              # Backend Server (Deploy to Render)
│   ├── package.json
│   ├── server/           # Express + WebSocket WebRTC signaling server
│   ├── data/             # JSON flat-file storage
│   ├── uploads/          # Multi-part file upload directory
│   └── render.yaml       # Render blueprint
├── package.json          # Root monorepo configuration
└── README.md
```

---

## 🚀 Deployment Guide

### Option 1: Deploy Frontend to Vercel

1. Import your GitHub repository (`https://github.com/praneel46/padly.git`) on [Vercel](https://vercel.com).
2. Set **Root Directory** to: `frontend`
3. Framework Preset: **Vite** (automatically detected).
4. In **Environment Variables**, add:
   - `VITE_BACKEND_URL`: Your Render backend URL (e.g. `https://padly-backend.onrender.com`)
   - `VITE_WS_URL`: Your Render WebSocket URL (e.g. `wss://padly-backend.onrender.com/ws`)
5. Click **Deploy**!

---

### Option 2: Deploy Backend to Render

1. Create a new **Web Service** on [Render](https://render.com) and link `https://github.com/praneel46/padly.git`.
2. Set **Root Directory** to: `backend`
3. Environment: **Node**
4. Build Command: `npm install`
5. Start Command: `npm start`
6. In **Environment Variables**, add:
   - `PORT`: `10000` (or `3001`)
   - `CORS_ORIGIN`: Your Vercel frontend URL (e.g. `https://padly.vercel.app` or `*`)
7. Click **Create Web Service**!

---

## 💻 Local Development

### Run Everything with One Command (Root)
```bash
npm install
npm run dev
```
- Frontend: `http://localhost:5173`
- Backend API & WebSockets: `http://localhost:3001`

### Or Run Frontend & Backend Independently

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Backend:**
```bash
cd backend
npm install
npm run dev
```

---

## 📄 License
MIT © 2026 Padly. Realtime Shared Vault & Notepad.
