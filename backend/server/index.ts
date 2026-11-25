import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import multer from 'multer';
import { WebSocketServer, WebSocket } from 'ws';
import archiver from 'archiver';
import { db, normalizeCode } from './db.js';

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    cb(null, `file_${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// Configure CORS for local & production (Vercel / Render)
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
  : '*';

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint for external pingers (UptimeRobot, etc.) without data side-effects
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime(), timestamp: Date.now() });
});

// Serve uploads
app.use('/uploads', express.static(UPLOADS_DIR));

// WebSocket Rooms
interface ClientMeta {
  ws: WebSocket;
  code: string;
  clientId: string;
  clientColor: string;
}

const rooms = new Map<string, Set<ClientMeta>>();

const wss = new WebSocketServer({ server, path: '/ws' });

function broadcastToRoom(code: string, message: any, excludeWs?: WebSocket) {
  const room = rooms.get(code);
  if (!room) return;
  const payload = JSON.stringify(message);
  for (const client of room) {
    if (client.ws !== excludeWs && client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(payload);
      } catch (err) {
        console.error('WS send error:', err);
      }
    }
  }
}

function broadcastPresence(code: string) {
  const room = rooms.get(code);
  const count = room ? room.size : 0;
  broadcastToRoom(code, {
    type: 'presence',
    count,
    viewers: count
  });
}

const USER_COLORS = [
  '#B600A8', '#7621B0', '#BE4C00', '#00A8B6', '#10B981', '#F59E0B', '#3B82F6', '#EC4899'
];

wss.on('connection', (ws) => {
  let currentMeta: ClientMeta | null = null;

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === 'join') {
        const code = normalizeCode(msg.code || 'home');
        const clientId = msg.clientId || Math.random().toString(36).substring(2, 9);
        const color = USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];

        // Clean up from previous room if any
        if (currentMeta) {
          const oldRoom = rooms.get(currentMeta.code);
          if (oldRoom) {
            oldRoom.delete(currentMeta);
            broadcastPresence(currentMeta.code);
          }
        }

        currentMeta = { ws, code, clientId, clientColor: color };
        if (!rooms.has(code)) {
          rooms.set(code, new Set());
        }
        rooms.get(code)!.add(currentMeta);

        // Send welcome
        ws.send(JSON.stringify({
          type: 'joined',
          code,
          clientId,
          color,
          presence: rooms.get(code)!.size
        }));

        // Send chat history
        const chatHistory = db.getChatMessages(code);
        ws.send(JSON.stringify({
          type: 'chat_history',
          messages: chatHistory
        }));

        broadcastPresence(code);
      } else if (msg.type === 'chat_message') {
        if (currentMeta) {
          const savedMsg = db.addChatMessage(currentMeta.code, {
            sender_id: currentMeta.clientId,
            sender_name: msg.senderName || 'Peer',
            color: currentMeta.clientColor,
            text: msg.text
          });
          broadcastToRoom(currentMeta.code, {
            type: 'chat_message',
            message: savedMsg
          });
        }
      } else if (msg.type === 'call_signal') {
        if (currentMeta) {
          // Forward signaling to room (excluding sender)
          broadcastToRoom(currentMeta.code, {
            type: 'call_signal',
            signalType: msg.signalType,
            from: currentMeta.clientId,
            fromColor: currentMeta.clientColor,
            fromName: msg.fromName || 'Peer',
            callMode: msg.callMode || 'video',
            targetId: msg.targetId,
            data: msg.data
          }, ws);
        }
      } else if (msg.type === 'caption_message') {
        if (currentMeta) {
          broadcastToRoom(currentMeta.code, {
            type: 'caption_message',
            fromName: msg.fromName || 'Peer',
            text: msg.text,
            timestamp: Date.now()
          });
        }
      } else if (msg.type === 'content_change') {
        if (currentMeta) {
          broadcastToRoom(currentMeta.code, {
            type: 'content_change',
            content: msg.content,
            mode: msg.mode,
            title: msg.title,
            senderId: currentMeta.clientId,
            updatedAt: Date.now()
          }, ws);
        }
      } else if (msg.type === 'cursor') {
        if (currentMeta) {
          broadcastToRoom(currentMeta.code, {
            type: 'cursor',
            senderId: currentMeta.clientId,
            color: currentMeta.clientColor,
            cursor: msg.cursor
          }, ws);
        }
      } else if (msg.type === 'file_uploaded') {
        if (currentMeta) {
          broadcastToRoom(currentMeta.code, {
            type: 'file_uploaded',
            senderId: currentMeta.clientId
          }, ws);
        }
      }
    } catch (e) {
      console.error('Malformed WS message', e);
    }
  });

  ws.on('close', () => {
    if (currentMeta) {
      const room = rooms.get(currentMeta.code);
      if (room) {
        room.delete(currentMeta);
        if (room.size === 0) {
          rooms.delete(currentMeta.code);
        } else {
          broadcastPresence(currentMeta.code);
        }
      }
    }
  });
});

// REST API ROUTES

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', name: 'Padly', timestamp: Date.now() });
});

// Generate random 4-digit nearby code
app.get('/api/nearby-code', (_req, res) => {
  let code = '';
  // Find a 4-digit number not taken or generate clean one
  for (let attempt = 0; attempt < 20; attempt++) {
    const num = Math.floor(1000 + Math.random() * 9000).toString();
    if (!db.getPage(num)) {
      code = num;
      break;
    }
  }
  if (!code) code = Math.floor(1000 + Math.random() * 9000).toString();
  res.json({ code });
});

// Recent pads list
app.get('/api/recent-pads', (_req, res) => {
  const pads = db.getRecentPads(8);
  res.json(pads);
});

// Specific sub-routes MUST precede the catch-all /api/pages/*

// Get files for page
app.get('/api/pages/*/files', (req, res) => {
  const rawCode = req.params[0] || 'home';
  const files = db.getFiles(rawCode);
  res.json(files);
});

// Get chats for page
app.get('/api/pages/*/chats', (req, res) => {
  const rawCode = req.params[0] || 'home';
  const chats = db.getChatMessages(rawCode);
  res.json(chats);
});

// Get version history
app.get('/api/pages/*/versions', (req, res) => {
  const rawCode = req.params[0] || 'home';
  const versions = db.getVersions(rawCode);
  res.json(versions);
});

// Download all files as ZIP
app.get('/api/pages/*/zip', (req, res) => {
  const rawCode = req.params[0] || 'home';
  const files = db.getFiles(rawCode);

  if (files.length === 0) {
    return res.status(404).json({ error: 'No files to download for this pad' });
  }

  res.attachment(`padly_${normalizeCode(rawCode).replace(/\//g, '_')}_files.zip`);
  const archive = archiver('zip', { zlib: { level: 9 } });

  archive.on('error', (err) => {
    res.status(500).send({ error: err.message });
  });

  archive.pipe(res);

  for (const file of files) {
    const filePath = path.join(UPLOADS_DIR, file.stored_name);
    if (fs.existsSync(filePath)) {
      archive.file(filePath, { name: file.filename });
    }
  }

  archive.finalize();
});

// Get page details
app.get('/api/pages/*', (req, res) => {
  const rawCode = req.params[0] || 'home';
  const page = db.getPage(rawCode);

  if (!page) {
    return res.status(200).json({
      exists: false,
      code: normalizeCode(rawCode),
      content: '',
      title: normalizeCode(rawCode).split('/').pop() || 'Untitled'
    });
  }

  // Record view count
  const recorded = db.recordPageView(rawCode);
  if (!recorded) {
    return res.status(410).json({
      error: 'This pad burned after reading and has been erased.',
      burned: true
    });
  }

  res.json({
    exists: true,
    ...recorded
  });
});

// Save page content
app.put('/api/pages/*', (req, res) => {
  const rawCode = req.params[0] || 'home';
  const payload = req.body || {};

  const saved = db.savePage(rawCode, payload);
  res.json({ success: true, page: saved });
});

// Delete page
app.delete('/api/pages/*', (req, res) => {
  const rawCode = req.params[0];
  db.deletePage(rawCode);
  res.json({ success: true });
});

// File upload
app.post('/api/pages/*/files', upload.array('files', 10), (req, res) => {
  const rawCode = req.params[0] || 'home';
  const uploadedFiles = req.files as Express.Multer.File[];

  if (!uploadedFiles || uploadedFiles.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const addedRecords = [];
  for (const file of uploadedFiles) {
    const record = db.addFile(rawCode, {
      filename: file.originalname,
      stored_name: file.filename,
      mime_type: file.mimetype,
      size: file.size,
      url: `/uploads/${file.filename}`
    });
    addedRecords.push(record);
  }

  // Broadcast to peers
  broadcastToRoom(normalizeCode(rawCode), {
    type: 'file_uploaded',
    files: addedRecords
  });

  res.json({ success: true, files: addedRecords });
});

// Delete single file
app.delete('/api/files/:id', (req, res) => {
  const fileId = req.params.id;
  const deleted = db.deleteFile(fileId);
  if (deleted) {
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

// Restore version
app.post('/api/pages/*/restore', (req, res) => {
  const rawCode = req.params[0] || 'home';
  const { versionId } = req.body;
  if (!versionId) return res.status(400).json({ error: 'versionId required' });

  const restored = db.restoreVersion(rawCode, versionId);
  if (!restored) return res.status(404).json({ error: 'Version not found' });

  // Broadcast restoration to all clients in the room
  broadcastToRoom(normalizeCode(rawCode), {
    type: 'content_change',
    content: restored.content,
    mode: restored.mode,
    title: restored.title,
    restored: true
  });

  res.json({ success: true, page: restored });
});

// In production, serve Vite dist if present
const distCandidates = [
  path.resolve(process.cwd(), 'dist'),
  path.resolve(process.cwd(), '../frontend/dist'),
  path.resolve(process.cwd(), 'frontend/dist')
];

for (const distPath of distCandidates) {
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    break;
  }
}

server.listen(PORT, () => {
  console.log(`🚀 Padly server running on http://localhost:${PORT}`);
});
