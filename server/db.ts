import fs from 'fs';
import path from 'path';

export interface PageRecord {
  id: string;
  code: string;
  title: string;
  content: string;
  mode: 'rich' | 'markdown' | 'plain' | 'code';
  is_encrypted: boolean;
  encryption_salt?: string;
  password_hash?: string;
  read_token: string;
  edit_token: string;
  expires_at: number | null; // null = never
  burn_after_reading: boolean;
  views_count: number;
  created_at: number;
  updated_at: number;
}

export interface VersionRecord {
  id: string;
  page_code: string;
  content: string;
  mode: string;
  created_at: number;
  summary: string;
}

export interface FileRecord {
  id: string;
  page_code: string;
  filename: string;
  stored_name: string;
  mime_type: string;
  size: number;
  url: string;
  created_at: number;
}

export interface ChatMessage {
  id: string;
  page_code: string;
  sender_id: string;
  sender_name: string;
  color: string;
  text: string;
  timestamp: number;
}

interface DatabaseSchema {
  pages: Record<string, PageRecord>;
  versions: Record<string, VersionRecord[]>;
  files: Record<string, FileRecord[]>;
  chats: Record<string, ChatMessage[]>;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'padly.json');
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

let dbData: DatabaseSchema = {
  pages: {},
  versions: {},
  files: {},
  chats: {}
};

function loadDatabase() {
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      dbData = JSON.parse(raw);
    } catch (e) {
      console.error('Failed to parse database file, initializing empty db', e);
    }
  } else {
    saveDatabase();
  }
}

function saveDatabase() {
  try {
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(dbData, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (e) {
    console.error('Error saving database', e);
  }
}

loadDatabase();

export function normalizeCode(rawCode: string): string {
  if (!rawCode) return 'home';
  // Trim, lowercase, clean slashes
  let code = rawCode.trim().toLowerCase();
  code = code.replace(/^\/+|\/+$/g, ''); // remove leading/trailing slashes
  code = code.replace(/\/+/g, '/'); // collapse multiple slashes
  return code || 'home';
}

export const db = {
  getPage(rawCode: string): PageRecord | null {
    const code = normalizeCode(rawCode);
    const page = dbData.pages[code];
    if (!page) return null;

    // Check expiry
    if (page.expires_at && Date.now() > page.expires_at) {
      // Clean up expired page
      this.deletePage(code);
      return null;
    }

    return page;
  },

  recordPageView(rawCode: string): PageRecord | null {
    const code = normalizeCode(rawCode);
    const page = dbData.pages[code];
    if (!page) return null;

    page.views_count = (page.views_count || 0) + 1;
    saveDatabase();

    // If burn after reading and viewed more than once
    if (page.burn_after_reading && page.views_count > 1) {
      this.deletePage(code);
      return null;
    }

    return page;
  },

  savePage(rawCode: string, payload: Partial<PageRecord>): PageRecord {
    const code = normalizeCode(rawCode);
    const existing = dbData.pages[code];
    const now = Date.now();

    if (existing) {
      // Check if content changed significantly to save a version
      const oldContent = existing.content;
      const newContent = payload.content !== undefined ? payload.content : oldContent;

      if (newContent !== oldContent && Math.abs((newContent || '').length - (oldContent || '').length) > 10) {
        this.addVersion(code, oldContent, existing.mode, 'Auto-saved version');
      }

      const updated: PageRecord = {
        ...existing,
        ...payload,
        code, // ensure consistent code
        updated_at: now
      };
      dbData.pages[code] = updated;
      saveDatabase();
      return updated;
    } else {
      const readToken = Math.random().toString(36).substring(2, 10);
      const editToken = Math.random().toString(36).substring(2, 12);
      const newPage: PageRecord = {
        id: `page_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        code,
        title: payload.title || (code.charAt(0).toUpperCase() + code.slice(1)),
        content: payload.content || '',
        mode: payload.mode || 'rich',
        is_encrypted: !!payload.is_encrypted,
        encryption_salt: payload.encryption_salt,
        password_hash: payload.password_hash,
        read_token: readToken,
        edit_token: editToken,
        expires_at: payload.expires_at || null,
        burn_after_reading: !!payload.burn_after_reading,
        views_count: 1,
        created_at: now,
        updated_at: now
      };

      dbData.pages[code] = newPage;
      this.addVersion(code, newPage.content, newPage.mode, 'Initial version');
      saveDatabase();
      return newPage;
    }
  },

  deletePage(rawCode: string) {
    const code = normalizeCode(rawCode);
    delete dbData.pages[code];
    delete dbData.versions[code];

    // Remove files
    const fileList = dbData.files[code] || [];
    for (const file of fileList) {
      try {
        const filePath = path.join(UPLOADS_DIR, file.stored_name);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (e) {
        console.error('Error removing file', file.stored_name, e);
      }
    }
    delete dbData.files[code];
    saveDatabase();
  },

  addVersion(rawCode: string, content: string, mode: string, summary: string): VersionRecord {
    const code = normalizeCode(rawCode);
    if (!dbData.versions[code]) {
      dbData.versions[code] = [];
    }
    const version: VersionRecord = {
      id: `ver_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      page_code: code,
      content,
      mode: mode || 'rich',
      created_at: Date.now(),
      summary
    };
    // Keep maximum 30 versions
    dbData.versions[code].unshift(version);
    if (dbData.versions[code].length > 30) {
      dbData.versions[code] = dbData.versions[code].slice(0, 30);
    }
    saveDatabase();
    return version;
  },

  getVersions(rawCode: string): VersionRecord[] {
    const code = normalizeCode(rawCode);
    return dbData.versions[code] || [];
  },

  restoreVersion(rawCode: string, versionId: string): PageRecord | null {
    const code = normalizeCode(rawCode);
    const versions = dbData.versions[code] || [];
    const target = versions.find(v => v.id === versionId);
    if (!target) return null;

    const page = dbData.pages[code];
    if (!page) return null;

    page.content = target.content;
    page.mode = (target.mode as any) || page.mode;
    page.updated_at = Date.now();
    this.addVersion(code, page.content, page.mode, `Restored from ${new Date(target.created_at).toLocaleTimeString()}`);
    saveDatabase();
    return page;
  },

  addFile(rawCode: string, fileData: Omit<FileRecord, 'id' | 'page_code' | 'created_at'>): FileRecord {
    const code = normalizeCode(rawCode);
    if (!dbData.files[code]) {
      dbData.files[code] = [];
    }
    const file: FileRecord = {
      id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      page_code: code,
      ...fileData,
      created_at: Date.now()
    };
    dbData.files[code].unshift(file);
    saveDatabase();
    return file;
  },

  getFiles(rawCode: string): FileRecord[] {
    const code = normalizeCode(rawCode);
    return dbData.files[code] || [];
  },

  deleteFile(fileId: string): boolean {
    for (const code of Object.keys(dbData.files)) {
      const idx = dbData.files[code].findIndex(f => f.id === fileId);
      if (idx !== -1) {
        const file = dbData.files[code][idx];
        try {
          const filePath = path.join(UPLOADS_DIR, file.stored_name);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (e) {
          console.error('Error unlinking file', e);
        }
        dbData.files[code].splice(idx, 1);
        saveDatabase();
        return true;
      }
    }
    return false;
  },

  getRecentPads(limit = 6) {
    const pages = Object.values(dbData.pages)
      .filter(p => !p.is_encrypted && p.code !== 'home')
      .sort((a, b) => b.updated_at - a.updated_at)
      .slice(0, limit)
      .map(p => ({
        code: p.code,
        title: p.title,
        updated_at: p.updated_at,
        charCount: p.content.length,
        mode: p.mode
      }));
    return pages;
  },

  getChatMessages(rawCode: string): ChatMessage[] {
    const code = normalizeCode(rawCode);
    if (!dbData.chats) dbData.chats = {};
    return dbData.chats[code] || [];
  },

  addChatMessage(rawCode: string, msg: Omit<ChatMessage, 'id' | 'page_code' | 'timestamp'>): ChatMessage {
    const code = normalizeCode(rawCode);
    if (!dbData.chats) dbData.chats = {};
    if (!dbData.chats[code]) dbData.chats[code] = [];

    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      page_code: code,
      ...msg,
      timestamp: Date.now()
    };

    dbData.chats[code].push(newMsg);
    // Keep last 100 messages
    if (dbData.chats[code].length > 100) {
      dbData.chats[code] = dbData.chats[code].slice(-100);
    }
    saveDatabase();
    return newMsg;
  },

  cleanupExpired() {
    const now = Date.now();
    for (const [code, page] of Object.entries(dbData.pages)) {
      if (page.expires_at && now > page.expires_at) {
        this.deletePage(code);
      }
    }
  }
};

// Periodic expiry check every 5 minutes
setInterval(() => {
  db.cleanupExpired();
}, 5 * 60 * 1000);
