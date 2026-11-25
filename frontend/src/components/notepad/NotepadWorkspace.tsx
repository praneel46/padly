import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft, Share2, Settings, History, Lock, Unlock,
  MessageSquare, Video, ShieldCheck, Sparkles, FileText,
  File, Image as ImageIcon, Music, Repeat, Upload,
  Download, Trash2, Eye, EyeOff, Play, Pause, RefreshCw,
  Clock, Flame, Check, AlertCircle, Users, Copy, Archive,
  X, Bold, Italic, Strikethrough, Heading1, Heading2,
  List, CheckSquare, Code, Quote, Loader2, MoreVertical,
  HelpCircle, Keyboard
} from 'lucide-react';
import { ShareModal } from './ShareModal';
import { LockModal } from './LockModal';
import { VersionHistoryModal, PadVersion } from './VersionHistoryModal';
import { SettingsModal } from './SettingsModal';
import { AIAssistantModal } from './AIAssistantModal';
import { ConverterStudio } from './ConverterStudio';
import { PeerChatAndCall } from './PeerChatAndCall';
import { MeetRoomModal } from './MeetRoomModal';
import { encryptText, decryptText, generateSalt } from '../../lib/crypto';
import { PadFile } from './FilesPanel';
import { getApiUrl, getWsUrl } from '../../lib/api';
import { CallProvider, useCall } from '../../context/CallContext';
import { AudioCallBar } from '../call/AudioCallBar';
import { MiniCallWindow } from '../call/MiniCallWindow';
import { FullScreenCallModal } from '../call/FullScreenCallModal';
import { IncomingCallDialog } from '../call/IncomingCallDialog';
import { SpeedDialCallButton } from '../call/SpeedDialCallButton';
import { CommandPalette } from '../call/CommandPalette';
import { ShortcutsHelpModal } from '../call/ShortcutsHelpModal';
import { ToastContainer, showToast } from '../common/ToastContainer';
import { startBackendPinger } from '../../lib/keepAlive';
import { getShortcutsList, isShortcutMatch } from '../../lib/shortcuts';

export interface NotepadWorkspaceProps {
  code: string;
  isReadOnlyMode?: boolean;
  onNavigateHome: () => void;
  onNavigateCode: (code: string) => void;
}

export const NotepadWorkspace: React.FC<NotepadWorkspaceProps> = (props) => {
  const { code, onNavigateHome, onNavigateCode } = props;
  const clientIdRef = useRef<string>(`client_${Math.random().toString(36).substring(2, 9)}`);
  const wsRef = useRef<WebSocket | null>(null);
  const [wsInstance, setWsInstance] = useState<WebSocket | null>(null);

  // Auto-ping Render backend every 4 minutes so it stays awake while padly is open
  useEffect(() => {
    startBackendPinger(4);
  }, []);

  // WebSocket Realtime Sync connection
  useEffect(() => {
    const wsUrl = getWsUrl();
    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;
    setWsInstance(socket);

    socket.onopen = () => {
      socket.send(JSON.stringify({
        type: 'join',
        code,
        clientId: clientIdRef.current,
      }));
    };

    return () => {
      socket.close();
    };
  }, [code]);

  return (
    <CallProvider
      code={code}
      clientId={clientIdRef.current}
      userName="You"
      ws={wsInstance}
    >
      <NotepadWorkspaceInner
        {...props}
        wsRef={wsRef}
        clientIdRef={clientIdRef}
      />
    </CallProvider>
  );
};

interface InnerProps extends NotepadWorkspaceProps {
  wsRef: React.MutableRefObject<WebSocket | null>;
  clientIdRef: React.MutableRefObject<string>;
}

const NotepadWorkspaceInner: React.FC<InnerProps> = ({
  code,
  onNavigateHome,
  onNavigateCode,
  wsRef,
  clientIdRef,
}) => {
  // Call Context
  const { callState, callDuration, startCall, setViewMode } = useCall();

  // Core Pad State
  const [content, setContent] = useState<string>('');
  const [title, setTitle] = useState<string>(code);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'offline'>('saved');
  const [isReadOnlyMode, setIsReadOnlyMode] = useState<boolean>(false);
  const [presenceCount, setPresenceCount] = useState<number>(1);
  const [isEncrypted, setIsEncrypted] = useState<boolean>(false);
  const [encryptionSalt, setEncryptionSalt] = useState<string | null>(null);
  const [needsUnlock, setNeedsUnlock] = useState<boolean>(false);
  const [unlockPassword, setUnlockPassword] = useState<string>('');
  const [showUnlockPass, setShowUnlockPass] = useState<boolean>(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [burnAfterReading, setBurnAfterReading] = useState<boolean>(false);

  // Tab & View Modes
  const [activeTab, setActiveTab] = useState<'notepad' | 'files' | 'photos' | 'audio' | 'converter'>('notepad');
  const [isMarkdownPreviewActive, setIsMarkdownPreviewActive] = useState<boolean>(false);

  // Modals & Panels
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [showLockModal, setShowLockModal] = useState<boolean>(false);
  const [showVersionsModal, setShowVersionsModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showAIModal, setShowAIModal] = useState<boolean>(false);
  const [showMeetModal, setShowMeetModal] = useState<boolean>(false);
  const [showChatPanel, setShowChatPanel] = useState<boolean>(false);
  const [showMoreMenu, setShowMoreMenu] = useState<boolean>(false);
  const [showCommandPalette, setShowCommandPalette] = useState<boolean>(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false);

  // Files & Media State
  const [files, setFiles] = useState<PadFile[]>([]);
  const [versions, setVersions] = useState<PadVersion[]>([]);
  const [selectedFileForPreview, setSelectedFileForPreview] = useState<PadFile | null>(null);
  const [activeAudioPlaying, setActiveAudioPlaying] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<{ [id: string]: number }>({});

  // Audio refs
  const audioElementsRef = useRef<{ [id: string]: HTMLAudioElement }>({});

  // Editor and Save refs
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const rawEncryptedContentRef = useRef<string>('');
  const passwordRef = useRef<string>('');
  const generalFileInputRef = useRef<HTMLInputElement | null>(null);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);

  // Close "more" dropdown on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Load Pad data
  const loadPage = useCallback(async () => {
    try {
      const res = await fetch(getApiUrl(`/api/pages/${encodeURIComponent(code)}`));
      const data = await res.json();

      if (data.exists) {
        setTitle(data.title || code);
        setIsEncrypted(!!data.is_encrypted);
        setEncryptionSalt(data.encryption_salt || null);
        setExpiresAt(data.expires_at || null);
        setBurnAfterReading(!!data.burn_after_reading);

        if (data.is_encrypted) {
          rawEncryptedContentRef.current = data.content || '';
          setNeedsUnlock(true);
        } else {
          setContent(data.content || '');
          setNeedsUnlock(false);
        }
      } else {
        setContent('');
        setTitle(code.split('/').pop() || code);
        setIsEncrypted(false);
        setNeedsUnlock(false);
      }
    } catch (e) {
      console.error('Failed to load page:', e);
      setSaveStatus('offline');
    }
  }, [code]);

  // Fetch Files & Versions
  const loadFiles = useCallback(async () => {
    try {
      const res = await fetch(getApiUrl(`/api/pages/${encodeURIComponent(code)}/files`));
      const data = await res.json();
      if (Array.isArray(data)) {
        setFiles(data);
      }
    } catch (e) {
      console.error('Failed to load files:', e);
    }
  }, [code]);

  const loadVersions = useCallback(async () => {
    try {
      const res = await fetch(getApiUrl(`/api/pages/${encodeURIComponent(code)}/versions`));
      const data = await res.json();
      if (Array.isArray(data)) {
        setVersions(data);
      }
    } catch (e) {
      console.error('Failed to load versions:', e);
    }
  }, [code]);

  useEffect(() => {
    document.title = `Padly — #${code}`;
  }, [code]);

  useEffect(() => {
    loadPage();
    loadFiles();
    loadVersions();
  }, [loadPage, loadFiles, loadVersions]);

  // Auto-focus editor on mount and when unlocking, placing caret at the end
  useEffect(() => {
    if (!needsUnlock && activeTab === 'notepad' && textareaRef.current) {
      textareaRef.current.focus();
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [needsUnlock, activeTab]);

  // WebSocket message receiver
  useEffect(() => {
    const socket = wsRef.current;
    if (!socket) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === 'page_update') {
          if (msg.clientId !== clientIdRef.current) {
            if (isEncrypted) {
              if (passwordRef.current) {
                decryptText(msg.content, passwordRef.current, msg.encryption_salt || encryptionSalt || '')
                  .then(dec => setContent(dec))
                  .catch(() => {});
              }
            } else {
              setContent(msg.content);
            }
          }
        } else if (msg.type === 'presence') {
          setPresenceCount(msg.count || 1);
        } else if (msg.type === 'file_uploaded') {
          loadFiles();
          showToast('info', 'A new file was uploaded to this pad');
        } else if (msg.type === 'file_deleted') {
          loadFiles();
        }
      } catch (err) {
        console.error('Error handling sync message:', err);
      }
    };

    socket.addEventListener('message', handleMessage);
    return () => {
      socket.removeEventListener('message', handleMessage);
    };
  }, [wsRef.current, isEncrypted, encryptionSalt, loadFiles]);

  // Save Content
  const saveImmediately = useCallback(async () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setSaveStatus('saving');

    try {
      let payloadContent = content;
      if (isEncrypted && passwordRef.current && encryptionSalt) {
        payloadContent = await encryptText(content, passwordRef.current, encryptionSalt);
      }

      await fetch(getApiUrl(`/api/pages/${encodeURIComponent(code)}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: payloadContent,
          title,
          clientId: clientIdRef.current,
        }),
      });

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'page_update',
          code,
          content: payloadContent,
          clientId: clientIdRef.current,
          encryption_salt: encryptionSalt,
        }));
      }

      setSaveStatus('saved');
    } catch (e) {
      console.error('Failed to save page:', e);
      setSaveStatus('offline');
    }
  }, [code, content, title, isEncrypted, encryptionSalt]);

  const handleContentChange = (newVal: string) => {
    setContent(newVal);
    setSaveStatus('saving');

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      await saveImmediately();
    }, 400);
  };

  // Click-to-focus on entire editor area, setting caret at end
  const handleEditorAreaClick = (e: React.MouseEvent) => {
    if (e.target !== textareaRef.current && textareaRef.current) {
      textareaRef.current.focus();
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  };

  // Text formatting helpers (Bold, Italic, Strike, H1, H2, List, etc.)
  const handleFormat = (type: string) => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selectedText = content.substring(start, end);
    let replacement = '';

    switch (type) {
      case 'bold':
        replacement = `**${selectedText || 'bold text'}**`;
        break;
      case 'italic':
        replacement = `*${selectedText || 'italic text'}*`;
        break;
      case 'strike':
        replacement = `~~${selectedText || 'struck text'}~~`;
        break;
      case 'h1':
        replacement = `\n# ${selectedText || 'Heading 1'}\n`;
        break;
      case 'h2':
        replacement = `\n## ${selectedText || 'Heading 2'}\n`;
        break;
      case 'ul':
        replacement = `\n- ${selectedText || 'List item'}\n`;
        break;
      case 'todo':
        replacement = `\n- [ ] ${selectedText || 'To-do item'}\n`;
        break;
      case 'code':
        replacement = selectedText.includes('\n')
          ? `\n\`\`\`\n${selectedText || 'code'}\n\`\`\`\n`
          : `\`${selectedText || 'code'}\``;
        break;
      case 'quote':
        replacement = `\n> ${selectedText || 'Quote'}\n`;
        break;
      default:
        return;
    }

    const updated = content.substring(0, start) + replacement + content.substring(end);
    handleContentChange(updated);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + replacement.length, start + replacement.length);
    }, 50);
  };

  // Dynamic Keyboard Shortcuts with Custom User Key Bindings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const list = getShortcutsList();
      const saveSc = list.find(s => s.id === 'save')?.currentKey || 'Ctrl + S';
      const boldSc = list.find(s => s.id === 'bold')?.currentKey || 'Ctrl + B';
      const chatSc = list.find(s => s.id === 'chat')?.currentKey || 'Ctrl + /';
      const cmdSc = list.find(s => s.id === 'command')?.currentKey || 'Ctrl + K';
      const prevSc = list.find(s => s.id === 'preview')?.currentKey || 'Ctrl + P';
      const meetSc = list.find(s => s.id === 'meet')?.currentKey || 'Ctrl + M';
      const helpSc = list.find(s => s.id === 'help')?.currentKey || '?';

      if (isShortcutMatch(e, saveSc)) {
        e.preventDefault();
        saveImmediately();
        showToast('success', 'Pad saved manually');
      } else if (isShortcutMatch(e, boldSc)) {
        if (activeTab === 'notepad' && textareaRef.current && document.activeElement === textareaRef.current) {
          e.preventDefault();
          handleFormat('bold');
        }
      } else if (isShortcutMatch(e, chatSc)) {
        e.preventDefault();
        setShowChatPanel(prev => !prev);
      } else if (isShortcutMatch(e, cmdSc)) {
        e.preventDefault();
        setShowCommandPalette(prev => !prev);
      } else if (isShortcutMatch(e, prevSc)) {
        e.preventDefault();
        setIsMarkdownPreviewActive(prev => !prev);
      } else if (isShortcutMatch(e, meetSc)) {
        e.preventDefault();
        startCall('video');
      } else if (isShortcutMatch(e, helpSc) && document.activeElement !== textareaRef.current) {
        e.preventDefault();
        setShowShortcutsModal(true);
      } else if (e.key === 'Escape') {
        setShowMoreMenu(false);
        setShowCommandPalette(false);
        setShowShortcutsModal(false);
        setSelectedFileForPreview(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, content, saveImmediately, startCall]);

  // Unlock password encrypted pad
  const handleUnlockPad = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnlockError(null);

    try {
      const salt = encryptionSalt || '';
      const decrypted = await decryptText(rawEncryptedContentRef.current, unlockPassword, salt);
      passwordRef.current = unlockPassword;
      setContent(decrypted);
      setNeedsUnlock(false);
      showToast('success', 'Pad decrypted and opened');
    } catch (err) {
      setUnlockError('Incorrect password. Please verify and try again.');
    }
  };

  // Lock Pad Encryption handlers
  const handleApplyLock = async (password: string) => {
    const salt = await generateSalt();
    const encrypted = await encryptText(content, password, salt);

    await fetch(getApiUrl(`/api/pages/${encodeURIComponent(code)}/lock`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password,
        encryption_salt: salt,
        content: encrypted,
      }),
    });

    passwordRef.current = password;
    setIsEncrypted(true);
    setEncryptionSalt(salt);
    showToast('success', 'Pad encrypted with AES-256');
  };

  const handleRemoveLock = async (password: string): Promise<boolean> => {
    const res = await fetch(getApiUrl(`/api/pages/${encodeURIComponent(code)}/unlock`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    const data = await res.json();
    if (data.success) {
      passwordRef.current = '';
      setIsEncrypted(false);
      setEncryptionSalt(null);
      showToast('info', 'Encryption removed from pad');
      return true;
    }
    return false;
  };

  // Upload Files
  const handleUploadFiles = async (uploadedFiles: FileList) => {
    if (!uploadedFiles || uploadedFiles.length === 0) return;
    const formData = new FormData();
    for (let i = 0; i < uploadedFiles.length; i++) {
      formData.append('files', uploadedFiles[i]);
    }

    try {
      showToast('info', `Uploading ${uploadedFiles.length} file(s)...`);
      await fetch(getApiUrl(`/api/pages/${encodeURIComponent(code)}/files`), {
        method: 'POST',
        body: formData,
      });
      await loadFiles();
      showToast('success', 'Files uploaded successfully');
    } catch (e) {
      console.error('File upload failed:', e);
      showToast('error', 'File upload failed');
    }
  };

  // Delete File
  const handleDeleteFile = async (fileId: string) => {
    try {
      await fetch(getApiUrl(`/api/pages/${encodeURIComponent(code)}/files/${fileId}`), {
        method: 'DELETE',
      });
      setFiles(prev => prev.filter(f => f.id !== fileId));
      showToast('info', 'File removed');
    } catch (e) {
      console.error('Failed to delete file:', e);
    }
  };

  // Word & Character count
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  // Filter files by tab
  const docFiles = files.filter(f => !f.mime_type.startsWith('image/') && !f.mime_type.startsWith('audio/'));
  const photoFiles = files.filter(f => f.mime_type.startsWith('image/'));
  const audioFiles = files.filter(f => f.mime_type.startsWith('audio/'));

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0C0C0C] text-[#D7E2EA] font-sans select-text">
      {/* ============================================================ */}
      {/* 1. TOP HEADER BAR: Grouped Clean Actions */}
      {/* ============================================================ */}
      <header className="h-14 bg-[#141414] border-b border-[#262626] px-4 sm:px-6 flex items-center justify-between z-30 flex-shrink-0 select-none">
        {/* Left: Back Arrow, Brand Logo, Code Chip, Save Status */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onNavigateHome}
            className="p-2 rounded-xl text-[#646973] hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Return to Home"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div
            onClick={onNavigateHome}
            className="flex items-center gap-2 cursor-pointer font-bold tracking-tight text-white hover:opacity-90 transition mr-1"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-[0_0_8px_#a855f7]" />
            <span className="text-sm uppercase tracking-wider font-extrabold hidden md:inline">
              padly
            </span>
          </div>

          {/* CODE CHIP WITH COPY ACTION */}
          <div
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              showToast('success', 'Pad link copied to clipboard');
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-950/40 border border-purple-500/30 text-purple-300 font-mono text-xs font-semibold cursor-pointer hover:bg-purple-900/50 transition"
            title="Click to copy pad share URL"
          >
            <span>#{code}</span>
            <Copy className="w-3 h-3 opacity-60 hover:opacity-100" />
          </div>

          {/* SAVE STATUS DOT (Problem 4 Indicator) */}
          <div className="hidden sm:flex items-center gap-2 text-xs pl-1">
            {saveStatus === 'saved' ? (
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
                <span>Saved</span>
              </span>
            ) : saveStatus === 'saving' ? (
              <span className="flex items-center gap-1.5 text-purple-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse shadow-[0_0_6px_rgba(192,132,252,0.8)]" />
                <span>Saving...</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-rose-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.8)]" />
                <span>Offline</span>
              </span>
            )}
          </div>
        </div>

        {/* Right: Primary Visible Actions + More Menu */}
        <div className="flex items-center gap-2">
          {/* CALL IN PROGRESS RESTORE PILL (When call active & chat closed) */}
          {callState !== 'idle' && !showChatPanel && (
            <button
              onClick={() => {
                setShowChatPanel(true);
                setViewMode('docked');
              }}
              className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs font-semibold hover:bg-emerald-900/80 transition animate-pulse cursor-pointer shadow-md"
              title="Call is active. Click to restore call controls"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>In Call ({formatDuration(callDuration)})</span>
            </button>
          )}

          {/* CHAT TOGGLE */}
          <button
            onClick={() => setShowChatPanel(!showChatPanel)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium uppercase tracking-wider transition cursor-pointer ${
              showChatPanel
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-white/5 border border-[#262626] text-[#D7E2EA] hover:bg-white/10'
            }`}
            title="Toggle Synchronized Chat Panel (Ctrl+/)"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Chat</span>
          </button>

          {/* MEET QUICK START */}
          <button
            onClick={() => startCall('video')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold uppercase tracking-wider transition shadow-[0_0_15px_rgba(118,33,176,0.4)] cursor-pointer"
            title="Start Video/Voice Meet (Persistent floating call)"
          >
            <Video className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Meet</span>
          </button>

          {/* AI ASSIST */}
          <button
            onClick={() => setShowAIModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-900/30 border border-purple-500/40 text-purple-300 hover:text-white text-xs font-medium uppercase tracking-wider transition hover:bg-purple-800/40 cursor-pointer"
            title="AI Writing & Coding Assistant"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">AI Assist</span>
          </button>

          {/* MORE MENU DROPDOWN (Collapsing Lock, Share, History, Settings) */}
          <div className="relative" ref={moreMenuRef}>
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="p-2 rounded-full hover:bg-white/10 text-[#646973] hover:text-[#D7E2EA] transition cursor-pointer"
              title="More Actions"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMoreMenu && (
              <div className="absolute right-0 mt-2 w-52 bg-[#141220] border border-purple-500/30 rounded-2xl shadow-2xl p-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    setShowLockModal(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs hover:bg-white/10 text-left transition"
                >
                  {isEncrypted ? <ShieldCheck className="w-4 h-4 text-emerald-400" /> : <Lock className="w-4 h-4 text-purple-400" />}
                  <span>{isEncrypted ? 'Pad Encrypted' : 'Lock & Encrypt'}</span>
                </button>

                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    setShowShareModal(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs hover:bg-white/10 text-left transition"
                >
                  <Share2 className="w-4 h-4 text-purple-400" />
                  <span>Share & QR Code</span>
                </button>

                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    loadVersions();
                    setShowVersionsModal(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs hover:bg-white/10 text-left transition"
                >
                  <History className="w-4 h-4 text-purple-400" />
                  <span>Version History</span>
                </button>

                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    setShowSettingsModal(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs hover:bg-white/10 text-left transition"
                >
                  <Settings className="w-4 h-4 text-purple-400" />
                  <span>Settings & Expiry</span>
                </button>

                <div className="my-1 border-t border-white/5" />

                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    setShowShortcutsModal(true);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs hover:bg-white/10 text-left transition text-white/70"
                >
                  <div className="flex items-center gap-2.5">
                    <Keyboard className="w-4 h-4 text-purple-400" />
                    <span>Shortcuts</span>
                  </div>
                  <kbd className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded border border-white/10">?</kbd>
                </button>

                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    setShowCommandPalette(true);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs hover:bg-white/10 text-left transition text-white/70"
                >
                  <div className="flex items-center gap-2.5">
                    <HelpCircle className="w-4 h-4 text-purple-400" />
                    <span>Command Palette</span>
                  </div>
                  <kbd className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded border border-white/10">Ctrl+K</kbd>
                </button>
              </div>
            )}
          </div>

          {/* Realtime Active Viewers */}
          <div
            className="flex items-center gap-1.5 bg-[#0C0C0C] border border-[#262626] px-2.5 py-1 rounded-full text-xs text-[#D7E2EA] ml-1"
            title={`${presenceCount} live participant(s)`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <Users className="w-3.5 h-3.5 text-[#646973]" />
            <span className="font-mono text-xs">{presenceCount}</span>
          </div>
        </div>
      </header>

      {/* ============================================================ */}
      {/* 2. AUDIO CALL SLIM BAR (Fixed under top bar during voice call) */}
      {/* ============================================================ */}
      <AudioCallBar />

      {/* ============================================================ */}
      {/* 3. THE 5 MAIN PRIMARY TABS (Animated & Clear file badges) */}
      {/* ============================================================ */}
      <div className="w-full bg-[#111111] border-b border-[#262626] px-4 sm:px-8 py-2.5 flex items-center justify-between z-10 flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto">
          {/* Tab 1: Notepad */}
          <button
            onClick={() => setActiveTab('notepad')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'notepad'
                ? 'bg-purple-600/25 border-2 border-purple-500 text-white shadow-[0_0_15px_rgba(118,33,176,0.3)]'
                : 'bg-[#181818] border border-[#262626] text-[#646973] hover:text-[#D7E2EA]'
            }`}
          >
            <FileText className={`w-4 h-4 ${activeTab === 'notepad' ? 'text-purple-400' : ''}`} />
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider">Notepad</span>
          </button>

          {/* Tab 2: PDFs & Files */}
          <button
            onClick={() => setActiveTab('files')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'files'
                ? 'bg-purple-600/25 border-2 border-purple-500 text-white shadow-[0_0_15px_rgba(118,33,176,0.3)]'
                : 'bg-[#181818] border border-[#262626] text-[#646973] hover:text-[#D7E2EA]'
            }`}
          >
            <File className={`w-4 h-4 ${activeTab === 'files' ? 'text-purple-400' : ''}`} />
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider">PDFs & Files</span>
            {docFiles.length > 0 && (
              <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-purple-900/60 text-purple-200 font-mono">
                {docFiles.length}
              </span>
            )}
          </button>

          {/* Tab 3: Photos */}
          <button
            onClick={() => setActiveTab('photos')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'photos'
                ? 'bg-purple-600/25 border-2 border-purple-500 text-white shadow-[0_0_15px_rgba(118,33,176,0.3)]'
                : 'bg-[#181818] border border-[#262626] text-[#646973] hover:text-[#D7E2EA]'
            }`}
          >
            <ImageIcon className={`w-4 h-4 ${activeTab === 'photos' ? 'text-pink-400' : ''}`} />
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider">Photos</span>
            {photoFiles.length > 0 && (
              <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-pink-900/60 text-pink-200 font-mono">
                {photoFiles.length}
              </span>
            )}
          </button>

          {/* Tab 4: Audio */}
          <button
            onClick={() => setActiveTab('audio')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'audio'
                ? 'bg-purple-600/25 border-2 border-purple-500 text-white shadow-[0_0_15px_rgba(118,33,176,0.3)]'
                : 'bg-[#181818] border border-[#262626] text-[#646973] hover:text-[#D7E2EA]'
            }`}
          >
            <Music className={`w-4 h-4 ${activeTab === 'audio' ? 'text-blue-400' : ''}`} />
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider">Audio</span>
            {audioFiles.length > 0 && (
              <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-blue-900/60 text-blue-200 font-mono">
                {audioFiles.length}
              </span>
            )}
          </button>

          {/* Tab 5: Converter */}
          <button
            onClick={() => setActiveTab('converter')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'converter'
                ? 'bg-purple-600/25 border-2 border-purple-500 text-white shadow-[0_0_15px_rgba(118,33,176,0.3)]'
                : 'bg-[#181818] border border-[#262626] text-[#646973] hover:text-[#D7E2EA]'
            }`}
          >
            <Repeat className={`w-4 h-4 ${activeTab === 'converter' ? 'text-emerald-400' : ''}`} />
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider">Converter</span>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. MAIN WORKSPACE / LOCKED STATE */}
      {/* ============================================================ */}
      {needsUnlock ? (
        <div className="flex-1 flex items-center justify-center p-4 bg-[#0C0C0C]">
          <div className="bg-[#141220] border border-purple-500/30 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center">
            <div className="w-16 h-16 rounded-full bg-purple-900/30 text-purple-400 border border-purple-500/20 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold uppercase tracking-wider text-white mb-2">
              Pad is Encrypted
            </h2>
            <p className="text-xs text-[#646973] mb-6 leading-relaxed">
              This pad is encrypted client-side using Web Crypto AES-GCM 256-bit. Enter the decryption passphrase below to view and edit.
            </p>

            {unlockError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs">
                {unlockError}
              </div>
            )}

            <form onSubmit={handleUnlockPad} className="space-y-4">
              <div className="relative">
                <input
                  type={showUnlockPass ? 'text' : 'password'}
                  name="padly-decryption-key"
                  id="padly-decryption-key"
                  autoComplete="new-password"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-form-type="other"
                  autoFocus
                  value={unlockPassword}
                  onChange={(e) => setUnlockPassword(e.target.value)}
                  placeholder="Enter decryption passphrase..."
                  className="w-full bg-[#0C0C0C] border border-[#262626] rounded-xl px-4 py-3 pr-10 text-sm text-[#D7E2EA] outline-none focus:border-purple-500"
                />
                <button
                  type="button"
                  onClick={() => setShowUnlockPass(!showUnlockPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                >
                  {showUnlockPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <button
                type="submit"
                className="w-full glow-btn py-3 rounded-xl text-white font-medium uppercase tracking-wider text-xs cursor-pointer shadow-lg"
              >
                Decrypt & Open
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden bg-[#0C0C0C]">
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden h-full">
            {/* VIEW 1: NOTEPAD (Left aligned text & styled caret) */}
            {activeTab === 'notepad' && (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Clean Formatting Toolbar */}
                <div className="bg-[#141414] border-b border-[#262626] px-3 sm:px-4 py-2 flex items-center justify-between text-xs select-none gap-2 overflow-x-auto">
                  <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                    <button
                      title="Bold (Ctrl+B)"
                      onClick={() => handleFormat('bold')}
                      className="p-1.5 rounded hover:bg-white/10 text-[#D7E2EA] cursor-pointer"
                    >
                      <Bold className="w-4 h-4" />
                    </button>
                    <button
                      title="Italic"
                      onClick={() => handleFormat('italic')}
                      className="p-1.5 rounded hover:bg-white/10 text-[#D7E2EA] cursor-pointer"
                    >
                      <Italic className="w-4 h-4" />
                    </button>
                    <button
                      title="Strikethrough"
                      onClick={() => handleFormat('strike')}
                      className="p-1.5 rounded hover:bg-white/10 text-[#D7E2EA] cursor-pointer"
                    >
                      <Strikethrough className="w-4 h-4" />
                    </button>

                    <div className="h-4 w-px bg-[#262626] mx-1" />

                    <button
                      title="Heading 1"
                      onClick={() => handleFormat('h1')}
                      className="p-1.5 rounded hover:bg-white/10 text-[#D7E2EA] cursor-pointer"
                    >
                      <Heading1 className="w-4 h-4" />
                    </button>
                    <button
                      title="Heading 2"
                      onClick={() => handleFormat('h2')}
                      className="p-1.5 rounded hover:bg-white/10 text-[#D7E2EA] cursor-pointer"
                    >
                      <Heading2 className="w-4 h-4" />
                    </button>

                    <div className="h-4 w-px bg-[#262626] mx-1" />

                    <button
                      title="Bullet List"
                      onClick={() => handleFormat('ul')}
                      className="p-1.5 rounded hover:bg-white/10 text-[#D7E2EA] cursor-pointer"
                    >
                      <List className="w-4 h-4" />
                    </button>
                    <button
                      title="Checklist / To-Do"
                      onClick={() => handleFormat('todo')}
                      className="p-1.5 rounded hover:bg-white/10 text-[#D7E2EA] cursor-pointer"
                    >
                      <CheckSquare className="w-4 h-4" />
                    </button>
                    <button
                      title="Code Block"
                      onClick={() => handleFormat('code')}
                      className="p-1.5 rounded hover:bg-white/10 text-[#D7E2EA] cursor-pointer"
                    >
                      <Code className="w-4 h-4" />
                    </button>
                    <button
                      title="Quote"
                      onClick={() => handleFormat('quote')}
                      className="p-1.5 rounded hover:bg-white/10 text-[#D7E2EA] cursor-pointer"
                    >
                      <Quote className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <span className="hidden md:inline text-[#646973] whitespace-nowrap">
                      {wordCount} words • {charCount} chars
                    </span>

                    <button
                      onClick={() => setIsMarkdownPreviewActive(!isMarkdownPreviewActive)}
                      className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-medium uppercase tracking-wider transition cursor-pointer shrink-0 ${
                        isMarkdownPreviewActive
                          ? 'bg-purple-600 text-white'
                          : 'bg-white/5 border border-[#262626] text-[#D7E2EA] hover:bg-white/10'
                      }`}
                      title="Toggle Rendered Preview"
                    >
                      {isMarkdownPreviewActive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-purple-400" />}
                      <span>{isMarkdownPreviewActive ? 'Edit Text' : 'Preview'}</span>
                    </button>
                  </div>
                </div>

                {/* Editor Area: Left-Anchored, Comfortable Padding, Click to Focus at End */}
                <div
                  onClick={handleEditorAreaClick}
                  className="flex-1 px-6 md:px-10 py-6 overflow-y-auto max-w-4xl min-w-0 w-full text-left cursor-text transition-all"
                >
                  {isMarkdownPreviewActive ? (
                    <div className="p-6 bg-[#141414] rounded-2xl border border-[#262626] text-left">
                      <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#262626]">
                        <span className="text-xs font-semibold text-purple-300 uppercase tracking-wider">
                          Rendered Preview
                        </span>
                        <button
                          onClick={() => setIsMarkdownPreviewActive(false)}
                          className="text-xs text-[#646973] hover:text-white cursor-pointer"
                        >
                          Return to Editor
                        </button>
                      </div>
                      <div className="prose prose-invert max-w-none text-left leading-relaxed">
                        {content || '*No content written yet.*'}
                      </div>
                    </div>
                  ) : (
                    <textarea
                      ref={textareaRef}
                      value={content}
                      onChange={(e) => handleContentChange(e.target.value)}
                      placeholder="Type anything here... Autosaves instantly. Switch to PDFs, Photos, Audio, or Converter above anytime."
                      style={{ textAlign: 'left', direction: 'ltr' }}
                      className="w-full h-full min-h-[500px] bg-transparent border-none outline-none resize-none text-[#D7E2EA] placeholder-[#4a4f58] text-[17px] leading-[1.7] selection:bg-purple-600/40 text-left placeholder:text-left block caret-purple-400 font-normal"
                    />
                  )}
                </div>
              </div>
            )}

            {/* VIEW 2: PDFS & FILES */}
            {activeTab === 'files' && (
              <div className="flex-1 p-6 md:p-8 overflow-y-auto max-w-4xl min-w-0 w-full flex flex-col gap-6 text-left">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold uppercase tracking-wider text-white">
                      PDFs & Document Storage
                    </h3>
                    <p className="text-xs text-[#646973]">
                      Upload and manage PDF docs, archives, and files for code #{code}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {docFiles.length > 0 && (
                      <a
                        href={getApiUrl(`/api/pages/${encodeURIComponent(code)}/zip`)}
                        download
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-900/30 border border-purple-500/30 text-purple-300 text-xs font-medium uppercase tracking-wider hover:bg-purple-800/40 transition"
                      >
                        <Archive className="w-3.5 h-3.5" /> Download ZIP
                      </a>
                    )}
                    <button
                      onClick={() => generalFileInputRef.current?.click()}
                      className="glow-btn px-5 py-2 rounded-xl text-white text-xs font-medium uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" /> Upload File
                    </button>
                    <input
                      ref={generalFileInputRef}
                      type="file"
                      multiple
                      onChange={(e) => e.target.files && handleUploadFiles(e.target.files)}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Drag and Drop Zone & File List */}
                {docFiles.length === 0 ? (
                  <div
                    onClick={() => generalFileInputRef.current?.click()}
                    className="border-2 border-dashed border-[#262626] hover:border-purple-500/50 rounded-3xl p-12 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 bg-[#111111]/50"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-purple-950/40 text-purple-400 border border-purple-500/20 flex items-center justify-center">
                      <File className="w-7 h-7" />
                    </div>
                    <p className="text-sm font-semibold text-white">Drop PDF or documents here</p>
                    <p className="text-xs text-[#646973]">Click to browse files from your computer</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {docFiles.map((file) => (
                      <div
                        key={file.id}
                        className="p-4 rounded-2xl bg-[#141414] border border-[#262626] flex items-center justify-between gap-3 hover:border-purple-500/30 transition"
                      >
                        <div
                          onClick={() => setSelectedFileForPreview(file)}
                          className="flex items-center gap-3 truncate cursor-pointer flex-1"
                        >
                          <div className="w-10 h-10 rounded-xl bg-purple-900/30 text-purple-300 flex items-center justify-center flex-shrink-0">
                            <File className="w-5 h-5" />
                          </div>
                          <div className="truncate">
                            <p className="text-xs font-semibold text-white truncate">{file.filename}</p>
                            <p className="text-[10px] text-[#646973]">{(file.size / 1024).toFixed(1)} KB</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <a
                            href={file.url}
                            download={file.filename}
                            className="p-2 text-[#646973] hover:text-white rounded-lg hover:bg-white/10"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => handleDeleteFile(file.id)}
                            className="p-2 text-[#646973] hover:text-rose-400 rounded-lg hover:bg-white/10 cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* VIEW 3: PHOTOS */}
            {activeTab === 'photos' && (
              <div className="flex-1 p-6 md:p-8 overflow-y-auto max-w-4xl min-w-0 w-full flex flex-col gap-6 text-left">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold uppercase tracking-wider text-white">
                      Photos & Images Gallery
                    </h3>
                    <p className="text-xs text-[#646973]">
                      Shared image gallery for pad #{code}
                    </p>
                  </div>
                  <button
                    onClick={() => generalFileInputRef.current?.click()}
                    className="glow-btn px-5 py-2 rounded-xl text-white text-xs font-medium uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" /> Upload Photos
                  </button>
                </div>

                {photoFiles.length === 0 ? (
                  <div
                    onClick={() => generalFileInputRef.current?.click()}
                    className="border-2 border-dashed border-[#262626] hover:border-pink-500/50 rounded-3xl p-12 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 bg-[#111111]/50"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-pink-950/40 text-pink-400 border border-pink-500/20 flex items-center justify-center">
                      <ImageIcon className="w-7 h-7" />
                    </div>
                    <p className="text-sm font-semibold text-white">Drop images or screenshots here</p>
                    <p className="text-xs text-[#646973]">Supports PNG, JPG, GIF, WebP, SVG</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {photoFiles.map((photo) => (
                      <div
                        key={photo.id}
                        className="group relative aspect-square rounded-2xl overflow-hidden bg-[#141414] border border-[#262626] hover:border-pink-500/40 transition shadow-lg cursor-pointer"
                        onClick={() => setSelectedFileForPreview(photo)}
                      >
                        <img
                          src={photo.url}
                          alt={photo.filename}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition p-3 flex flex-col justify-end">
                          <p className="text-xs text-white truncate font-medium">{photo.filename}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <a
                              href={photo.url}
                              download={photo.filename}
                              onClick={(e) => e.stopPropagation()}
                              className="p-1 rounded bg-black/60 text-white/80 hover:text-white"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteFile(photo.id);
                              }}
                              className="p-1 rounded bg-black/60 text-rose-400 hover:text-rose-300"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* VIEW 4: AUDIO */}
            {activeTab === 'audio' && (
              <div className="flex-1 p-6 md:p-8 overflow-y-auto max-w-4xl min-w-0 w-full flex flex-col gap-6 text-left">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold uppercase tracking-wider text-white">
                      Audio Recordings & Tracks
                    </h3>
                    <p className="text-xs text-[#646973]">
                      Play and manage MP3, WAV, M4A audio files for pad #{code}
                    </p>
                  </div>
                  <button
                    onClick={() => generalFileInputRef.current?.click()}
                    className="glow-btn px-5 py-2 rounded-xl text-white text-xs font-medium uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" /> Upload Audio
                  </button>
                </div>

                {audioFiles.length === 0 ? (
                  <div
                    onClick={() => generalFileInputRef.current?.click()}
                    className="border-2 border-dashed border-[#262626] hover:border-blue-500/50 rounded-3xl p-12 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 bg-[#111111]/50"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-blue-950/40 text-blue-400 border border-blue-500/20 flex items-center justify-center">
                      <Music className="w-7 h-7" />
                    </div>
                    <p className="text-sm font-semibold text-white">Drop audio or voice notes here</p>
                    <p className="text-xs text-[#646973]">Supports MP3, WAV, AAC, OGG, M4A</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {audioFiles.map((audio) => {
                      const isPlaying = activeAudioPlaying === audio.id;
                      return (
                        <div
                          key={audio.id}
                          className="p-4 rounded-2xl bg-[#141414] border border-[#262626] flex items-center justify-between gap-4 hover:border-blue-500/40 transition"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <button
                              onClick={() => {
                                const el = audioElementsRef.current[audio.id];
                                if (!el) return;
                                if (isPlaying) {
                                  el.pause();
                                  setActiveAudioPlaying(null);
                                } else {
                                  Object.values(audioElementsRef.current).forEach(a => a.pause());
                                  el.play();
                                  setActiveAudioPlaying(audio.id);
                                }
                              }}
                              className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center transition cursor-pointer flex-shrink-0 shadow-md"
                            >
                              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                            </button>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-white truncate">{audio.filename}</p>
                              <audio
                                ref={(el) => {
                                  if (el) {
                                    audioElementsRef.current[audio.id] = el;
                                    el.onended = () => setActiveAudioPlaying(null);
                                  }
                                }}
                                src={audio.url}
                                preload="metadata"
                                className="hidden"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <a
                              href={audio.url}
                              download={audio.filename}
                              className="p-2 text-[#646973] hover:text-white rounded-lg hover:bg-white/10"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                            <button
                              onClick={() => handleDeleteFile(audio.id)}
                              className="p-2 text-[#646973] hover:text-rose-400 rounded-lg hover:bg-white/10 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* VIEW 5: CONVERTER STUDIO */}
            {activeTab === 'converter' && (
              <ConverterStudio
                padCode={code}
                onSaveToPad={async (file: File) => {
                  const formData = new FormData();
                  formData.append('files', file);
                  await fetch(getApiUrl(`/api/pages/${encodeURIComponent(code)}/files`), {
                    method: 'POST',
                    body: formData,
                  });
                  await loadFiles();
                  showToast('success', 'Converted file saved to pad');
                }}
              />
            )}
          </div>

          {/* Right Side Synchronized Chat Panel */}
          <PeerChatAndCall
            code={code}
            clientId={clientIdRef.current}
            ws={wsRef.current}
            presenceCount={presenceCount}
            isOpen={showChatPanel}
            onToggleOpen={() => setShowChatPanel(!showChatPanel)}
            onOpenMeet={() => startCall('video')}
            onFileUpload={handleUploadFiles}
          />
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. PERSISTENT CALL WINDOWS (Floating Mini & FullScreen Grid) */}
      {/* ============================================================ */}
      <MiniCallWindow />
      <FullScreenCallModal />
      <IncomingCallDialog />

      {/* Floating Speed Dial Action Button (Hidden when chat is open) */}
      <SpeedDialCallButton
        isChatOpen={showChatPanel}
        onOpenChat={() => setShowChatPanel(true)}
      />

      {/* Toast Notification Container */}
      <ToastContainer />

      {/* Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        onSwitchTab={setActiveTab}
        onToggleChat={() => setShowChatPanel(prev => !prev)}
        onOpenLock={() => setShowLockModal(true)}
        onOpenHistory={() => {
          loadVersions();
          setShowVersionsModal(true);
        }}
        onOpenSettings={() => setShowSettingsModal(true)}
        onShare={() => setShowShareModal(true)}
        onTogglePreview={() => setIsMarkdownPreviewActive(prev => !prev)}
        onNavigateCode={onNavigateCode}
      />

      {/* Shortcuts Help Modal */}
      <ShortcutsHelpModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />

      {/* ============================================================ */}
      {/* 6. MODALS & POPUPS */}
      {/* ============================================================ */}
      <ShareModal
        code={code}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        onSelectCode={onNavigateCode}
      />

      <LockModal
        isOpen={showLockModal}
        onClose={() => setShowLockModal(false)}
        isEncrypted={isEncrypted}
        onApplyLock={handleApplyLock}
        onRemoveLock={handleRemoveLock}
      />

      <VersionHistoryModal
        isOpen={showVersionsModal}
        onClose={() => setShowVersionsModal(false)}
        versions={versions}
        currentContent={content}
        onRestore={async (id) => {
          const res = await fetch(getApiUrl(`/api/pages/${encodeURIComponent(code)}/restore`), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ versionId: id }),
          });
          const data = await res.json();
          if (data.page) setContent(data.page.content);
          showToast('info', 'Version restored');
        }}
        isReadOnly={isReadOnlyMode}
      />

      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        expiresAt={expiresAt}
        burnAfterReading={burnAfterReading}
        onOpenShortcuts={() => setShowShortcutsModal(true)}
        onUpdateExpiry={async (targetExpiresAt, burn) => {
          setExpiresAt(targetExpiresAt);
          setBurnAfterReading(burn);
          await fetch(getApiUrl(`/api/pages/${encodeURIComponent(code)}`), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ expires_at: targetExpiresAt, burn_after_reading: burn }),
          });
          showToast('success', 'Settings updated');
        }}
        onExport={(format) => {
          if (format === 'pdf') window.print();
          else {
            const ext = format === 'md' ? 'md' : 'txt';
            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${code.replace(/\//g, '_')}_export.${ext}`;
            link.click();
            URL.revokeObjectURL(url);
          }
        }}
        onDeletePad={async () => {
          await fetch(getApiUrl(`/api/pages/${encodeURIComponent(code)}`), { method: 'DELETE' });
          onNavigateHome();
        }}
        isReadOnly={isReadOnlyMode}
      />

      <AIAssistantModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        content={content}
        onApplyText={(newText) => handleContentChange(newText)}
      />

      {/* Lightbox / Preview Modal */}
      {selectedFileForPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#141414] border border-[#262626] rounded-3xl p-5 max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-[#262626] mb-3">
              <h4 className="text-sm font-semibold text-white truncate">
                {selectedFileForPreview.filename}
              </h4>
              <button
                onClick={() => setSelectedFileForPreview(null)}
                className="text-[#646973] hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto flex items-center justify-center p-2 bg-[#0C0C0C] rounded-2xl min-h-[260px]">
              {selectedFileForPreview.mime_type.startsWith('image/') ? (
                <img
                  src={selectedFileForPreview.url}
                  alt={selectedFileForPreview.filename}
                  className="max-h-[50vh] max-w-full object-contain rounded-xl"
                />
              ) : selectedFileForPreview.mime_type.includes('pdf') ? (
                <iframe
                  src={selectedFileForPreview.url}
                  title="PDF Preview"
                  className="w-full h-[50vh] rounded-xl border border-[#262626]"
                />
              ) : (
                <div className="text-xs text-[#646973]">
                  Preview not available. Download to view.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
