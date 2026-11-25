import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FileText, File, Image as ImageIcon, Music, Lock, ShieldCheck,
  Share2, History, Settings, ArrowLeft, Sparkles, Check, Loader2,
  Users, Upload, Download, Trash2, Eye, EyeOff, Search, Play,
  Pause, SkipBack, SkipForward, Volume2, VolumeX, X, Archive, Plus,
  Bold, Italic, Strikethrough, Heading1, Heading2, Heading3,
  List, ListOrdered, CheckSquare, Quote, Code, Minus, RefreshCw, MessageSquare,
  Video, ScreenShare, Subtitles
} from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';
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
import { AudioTrack } from './MusicPlayer';
import { getApiUrl, getWsUrl } from '../../lib/api';

export type WorkspaceTab = 'notepad' | 'files' | 'photos' | 'audio' | 'converter';

interface NotepadWorkspaceProps {
  code: string;
  isReadOnlyMode?: boolean;
  onNavigateHome: () => void;
  onNavigateCode: (code: string) => void;
}

export const NotepadWorkspace: React.FC<NotepadWorkspaceProps> = ({
  code,
  isReadOnlyMode = false,
  onNavigateHome,
  onNavigateCode
}) => {
  // Active primary tab: 'notepad' | 'files' | 'photos' | 'audio' | 'converter'
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('notepad');

  // Notepad State
  const [content, setContent] = useState<string>('');
  const [title, setTitle] = useState<string>(code);
  const [isMarkdownPreviewActive, setIsMarkdownPreviewActive] = useState<boolean>(false);
  const [isEncrypted, setIsEncrypted] = useState<boolean>(false);
  const [encryptionSalt, setEncryptionSalt] = useState<string | null>(null);
  const [activePassword, setActivePassword] = useState<string>('');
  const [needsUnlock, setNeedsUnlock] = useState<boolean>(false);
  const [unlockPassword, setUnlockPassword] = useState<string>('');
  const [unlockError, setUnlockError] = useState<string | null>(null);

  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [presenceCount, setPresenceCount] = useState<number>(1);
  const [files, setFiles] = useState<PadFile[]>([]);
  const [versions, setVersions] = useState<PadVersion[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [burnAfterReading, setBurnAfterReading] = useState<boolean>(false);

  // Modals
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [showLockModal, setShowLockModal] = useState<boolean>(false);
  const [showVersionsModal, setShowVersionsModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showAIModal, setShowAIModal] = useState<boolean>(false);
  const [showChatPanel, setShowChatPanel] = useState<boolean>(true);
  const [showMeetModal, setShowMeetModal] = useState<boolean>(false);
  const [copyToast, setCopyToast] = useState<string | null>(null);

  // File Preview Lightbox / OCR Modal
  const [selectedFileForPreview, setSelectedFileForPreview] = useState<PadFile | null>(null);

  // Audio / Music Player State
  const [currentAudioTrack, setCurrentAudioTrack] = useState<AudioTrack | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState<number>(0);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Upload Input Refs
  const generalFileInputRef = useRef<HTMLInputElement>(null);
  const photoFileInputRef = useRef<HTMLInputElement>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);

  // Editor Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clientIdRef = useRef<string>(Math.random().toString(36).substring(2, 9));
  const isIncomingSyncRef = useRef<boolean>(false);
  const rawEncryptedContentRef = useRef<string>('');

  // 1. Fetch Page Data
  const loadPage = useCallback(async () => {
    try {
      const res = await fetch(getApiUrl(`/api/pages/${encodeURIComponent(code)}`));
      if (res.status === 410) {
        alert('This pad had "Burn After Reading" enabled and has been erased.');
        onNavigateHome();
        return;
      }
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
    }
  }, [code, onNavigateHome]);

  // 2. Fetch Files & Versions
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

  // 3. WebSocket Realtime Sync
  useEffect(() => {
    const wsUrl = getWsUrl();
    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      socket.send(JSON.stringify({
        type: 'join',
        code,
        clientId: clientIdRef.current
      }));
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'presence') {
          setPresenceCount(msg.count || 1);
        } else if (msg.type === 'content_change') {
          if (msg.senderId !== clientIdRef.current) {
            isIncomingSyncRef.current = true;
            if (msg.content !== undefined) setContent(msg.content);
            if (msg.title) setTitle(msg.title);
            setTimeout(() => {
              isIncomingSyncRef.current = false;
            }, 100);
          }
        } else if (msg.type === 'file_uploaded') {
          loadFiles();
        }
      } catch (err) {
        console.error('WS parse error', err);
      }
    };

    return () => {
      socket.close();
    };
  }, [code, loadFiles]);

  // 4. Autosave (Debounced ~500ms)
  const saveContent = useCallback(
    async (textToSave: string, currentTitle: string) => {
      if (isReadOnlyMode || needsUnlock) return;
      setSaveStatus('saving');

      try {
        let payloadContent = textToSave;
        if (isEncrypted && activePassword && encryptionSalt) {
          payloadContent = await encryptText(textToSave, activePassword, encryptionSalt);
        }

        await fetch(getApiUrl(`/api/pages/${encodeURIComponent(code)}`), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: payloadContent,
            title: currentTitle,
            mode: 'rich',
            is_encrypted: isEncrypted,
            encryption_salt: encryptionSalt,
            expires_at: expiresAt,
            burn_after_reading: burnAfterReading
          })
        });

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'content_change',
            content: textToSave,
            title: currentTitle,
            clientId: clientIdRef.current
          }));
        }

        setSaveStatus('saved');
      } catch (e) {
        console.error('Save failed:', e);
        setSaveStatus('unsaved');
      }
    },
    [code, isReadOnlyMode, needsUnlock, isEncrypted, activePassword, encryptionSalt, expiresAt, burnAfterReading]
  );

  const handleContentChange = (newText: string) => {
    setContent(newText);
    setSaveStatus('unsaved');

    if (isIncomingSyncRef.current) return;

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveContent(newText, title);
    }, 500);
  };

  // Global Keyboard Shortcuts (Disable F12, Global Ctrl+X full text clipboard copy)
  useEffect(() => {
    const handleGlobalKeyDown = async (e: KeyboardEvent) => {
      // 1. Disable F12 (Console) and DevTools Shortcuts
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) ||
        (e.ctrlKey && (e.key === 'u' || e.key === 'U'))
      ) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // 2. Global Ctrl+X: Copy entire notepad content to clipboard
      if ((e.ctrlKey || e.metaKey) && (e.key === 'x' || e.key === 'X')) {
        const activeEl = document.activeElement;
        const textarea = textareaRef.current;
        const isSelectingSpecificSlice =
          activeEl === textarea &&
          textarea &&
          textarea.selectionStart !== textarea.selectionEnd;

        // If cursor is outside the notepad OR no specific sub-text is highlighted, copy entire notepad
        if (!isSelectingSpecificSlice) {
          e.preventDefault();
          if (content) {
            try {
              await navigator.clipboard.writeText(content);
              setCopyToast('Entire notepad text copied to clipboard! (Ctrl+V / Win+V ready)');
              setTimeout(() => setCopyToast(null), 3000);
            } catch (err) {
              console.error('Clipboard copy failed:', err);
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
  }, [content]);

  // 5. Upload File Helper
  const handleUploadFiles = async (fileList: FileList) => {
    if (isReadOnlyMode) return;
    const formData = new FormData();
    for (let i = 0; i < fileList.length; i++) {
      formData.append('files', fileList[i]);
    }

    setUploadProgress(15);
    try {
      const interval = setInterval(() => {
        setUploadProgress((prev) => (prev && prev < 85 ? prev + 20 : prev));
      }, 200);

      const res = await fetch(getApiUrl(`/api/pages/${encodeURIComponent(code)}/files`), {
        method: 'POST',
        body: formData
      });
      clearInterval(interval);
      setUploadProgress(100);

      const data = await res.json();
      if (data.files) {
        await loadFiles();
      }
      setTimeout(() => setUploadProgress(null), 800);
    } catch (e) {
      console.error('File upload failed:', e);
      setUploadProgress(null);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (isReadOnlyMode) return;
    try {
      await fetch(getApiUrl(`/api/files/${fileId}`), { method: 'DELETE' });
      await loadFiles();
    } catch (e) {
      console.error('Delete failed:', e);
    }
  };

  // Categorize files
  const photoFiles = files.filter(f => f.mime_type.startsWith('image/'));
  const audioFiles = files.filter(f => f.mime_type.startsWith('audio/'));
  const docFiles = files.filter(f => !f.mime_type.startsWith('image/') && !f.mime_type.startsWith('audio/'));

  // Format Text Actions
  const handleFormat = (action: string) => {
    if (isReadOnlyMode || !textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end);

    let replacement = selected;
    let cursorOffset = 0;

    switch (action) {
      case 'bold':
        replacement = `**${selected || 'bold text'}**`;
        cursorOffset = selected ? replacement.length : 2;
        break;
      case 'italic':
        replacement = `*${selected || 'italic text'}*`;
        cursorOffset = selected ? replacement.length : 1;
        break;
      case 'strike':
        replacement = `~~${selected || 'strikethrough'}~~`;
        cursorOffset = selected ? replacement.length : 2;
        break;
      case 'h1':
        replacement = `\n# ${selected || 'Heading 1'}\n`;
        break;
      case 'h2':
        replacement = `\n## ${selected || 'Heading 2'}\n`;
        break;
      case 'h3':
        replacement = `\n### ${selected || 'Heading 3'}\n`;
        break;
      case 'ul':
        replacement = `\n- ${selected || 'List item'}\n`;
        break;
      case 'ol':
        replacement = `\n1. ${selected || 'List item'}\n`;
        break;
      case 'todo':
        replacement = `\n- [ ] ${selected || 'Task to do'}\n`;
        break;
      case 'quote':
        replacement = `\n> ${selected || 'Quote'}\n`;
        break;
      case 'code':
        replacement = `\n\`\`\`\n${selected || '// code snippet'}\n\`\`\`\n`;
        break;
      case 'hr':
        replacement = `\n---\n`;
        break;
      default:
        break;
    }

    const updated = content.substring(0, start) + replacement + content.substring(end);
    handleContentChange(updated);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + cursorOffset, start + cursorOffset);
    }, 10);
  };

  // Unlock password
  const handleUnlockPad = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnlockError(null);
    try {
      if (!encryptionSalt) throw new Error('Missing salt');
      const decrypted = await decryptText(
        rawEncryptedContentRef.current,
        unlockPassword,
        encryptionSalt
      );
      setContent(decrypted);
      setActivePassword(unlockPassword);
      setNeedsUnlock(false);
      setUnlockPassword('');
    } catch (err: any) {
      setUnlockError('Incorrect password or corrupt encryption payload.');
    }
  };

  // Lock pad
  const handleApplyLock = async (password: string) => {
    const salt = await generateSalt();
    setEncryptionSalt(salt);
    setIsEncrypted(true);
    setActivePassword(password);
    const encrypted = await encryptText(content, password, salt);
    rawEncryptedContentRef.current = encrypted;
    saveContent(content, title);
  };

  const handleRemoveLock = async (password: string): Promise<boolean> => {
    if (password !== activePassword) return false;
    setIsEncrypted(false);
    setEncryptionSalt(null);
    setActivePassword('');
    saveContent(content, title);
    return true;
  };

  // Audio Playback
  const playTrack = (track: AudioTrack) => {
    setCurrentAudioTrack(track);
    if (audioRef.current) {
      audioRef.current.src = track.url;
      audioRef.current.play().then(() => setIsPlayingAudio(true)).catch(console.error);
    }
  };

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play().then(() => setIsPlayingAudio(true)).catch(console.error);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  // Render markdown helper for on-demand preview
  const renderMarkdownText = (text: string) => {
    const lines = text.split('\n');
    return (
      <div className="space-y-2 text-[#D7E2EA] font-sans leading-relaxed text-sm text-left">
        {lines.map((line, idx) => {
          if (line.startsWith('# ')) return <h1 key={idx} className="text-2xl font-bold text-white border-b border-[#262626] pb-1 mt-4">{line.replace('# ', '')}</h1>;
          if (line.startsWith('## ')) return <h2 key={idx} className="text-xl font-bold text-white mt-3">{line.replace('## ', '')}</h2>;
          if (line.startsWith('### ')) return <h3 key={idx} className="text-lg font-semibold text-purple-300 mt-2">{line.replace('### ', '')}</h3>;
          if (line.startsWith('> ')) return <blockquote key={idx} className="border-l-4 border-purple-500 pl-3 italic text-[#BBCCD7] my-2 bg-purple-900/10 py-1 rounded-r">{line.replace('> ', '')}</blockquote>;
          if (line.startsWith('- [ ] ') || line.startsWith('- [x] ')) {
            const isChecked = line.startsWith('- [x] ');
            return (
              <div key={idx} className="flex items-center gap-2">
                <input type="checkbox" readOnly checked={isChecked} className="w-3.5 h-3.5 accent-purple-600 rounded" />
                <span className={isChecked ? 'line-through opacity-60' : ''}>{line.slice(6)}</span>
              </div>
            );
          }
          if (line.startsWith('- ')) return <li key={idx} className="list-disc ml-4">{line.replace('- ', '')}</li>;
          if (line.startsWith('---')) return <hr key={idx} className="border-[#262626] my-4" />;
          if (!line.trim()) return <div key={idx} className="h-2" />;
          return <p key={idx}>{line}</p>;
        })}
      </div>
    );
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  return (
    <div className="h-screen w-screen bg-[#0C0C0C] text-[#D7E2EA] flex flex-col font-kanit overflow-hidden select-none relative">
      {/* Toast for Global Ctrl+X Copy Notification */}
      {copyToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[#161616]/95 border-2 border-purple-500 rounded-full px-6 py-2.5 shadow-[0_8px_30px_rgba(118,33,176,0.6)] text-white text-xs font-medium uppercase tracking-wider flex items-center gap-2.5 animate-bounce">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span>{copyToast}</span>
        </div>
      )}

      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        onTimeUpdate={() => setAudioCurrentTime(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setAudioDuration(audioRef.current?.duration || 0)}
        onEnded={() => setIsPlayingAudio(false)}
      />

      {/* ============================================================ */}
      {/* 1. TOP HEADER BAR */}
      {/* ============================================================ */}
      <header className="bg-[#141414] border-b border-[#262626] px-4 sm:px-6 py-2.5 flex items-center justify-between z-20 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onNavigateHome}
            className="p-1.5 rounded-xl hover:bg-white/10 text-[#646973] hover:text-white transition cursor-pointer"
            title="Back to Home"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <BrandLogo size="sm" onClick={onNavigateHome} />

          {/* Current Code */}
          <div className="flex items-center gap-2 bg-[#0C0C0C] border border-[#262626] px-3 py-1 rounded-full">
            <span className="text-[11px] uppercase tracking-wider text-[#646973] font-semibold">Code:</span>
            <span className="text-xs sm:text-sm font-mono font-bold text-white">#{code}</span>
          </div>

          {/* Save Status Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs">
            {saveStatus === 'saved' ? (
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <Check className="w-3.5 h-3.5" /> Saved
              </span>
            ) : saveStatus === 'saving' ? (
              <span className="flex items-center gap-1 text-purple-400 animate-pulse font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
              </span>
            ) : (
              <span className="text-amber-400 font-medium">Unsaved</span>
            )}
          </div>
        </div>

        {/* Header Right Actions: AI Assist, Lock, Share, Settings */}
        <div className="flex items-center gap-2">
          {/* Chat & Call Button */}
          <button
            onClick={() => setShowChatPanel(!showChatPanel)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium uppercase tracking-wider transition cursor-pointer ${
              showChatPanel
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-white/5 border border-[#262626] text-[#D7E2EA] hover:bg-white/10'
            }`}
            title="Toggle Synchronized Chat Panel"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Chat</span>
          </button>

          {/* Multi-Person Video Meet Button (Google Meet Style) */}
          <button
            onClick={() => setShowMeetModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold uppercase tracking-wider transition shadow-[0_0_15px_rgba(118,33,176,0.4)] cursor-pointer"
            title="Start Multi-Person Video Meet (Google Meet Style with Screen Share & Captions)"
          >
            <Video className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Meet (Video/Voice)</span>
          </button>

          {/* AI Assistant Button */}
          <button
            onClick={() => setShowAIModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-900/30 border border-purple-500/40 text-purple-300 hover:text-white text-xs font-medium uppercase tracking-wider transition hover:bg-purple-800/40 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">AI Assist</span>
          </button>

          {/* Client-Side Lock Button */}
          <button
            onClick={() => setShowLockModal(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium uppercase tracking-wider transition cursor-pointer ${
              isEncrypted
                ? 'bg-emerald-950/40 border border-emerald-500/50 text-emerald-300'
                : 'bg-white/5 border border-[#262626] text-[#D7E2EA] hover:bg-white/10'
            }`}
          >
            {isEncrypted ? <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Lock className="w-3.5 h-3.5 text-[#646973]" />}
            <span className="hidden sm:inline">{isEncrypted ? 'Encrypted' : 'Lock Pad'}</span>
          </button>

          {/* Share Modal Trigger */}
          <button
            onClick={() => setShowShareModal(true)}
            className="p-2 rounded-full hover:bg-white/10 text-[#646973] hover:text-[#D7E2EA] transition cursor-pointer"
            title="Share & QR Code"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* Version History */}
          <button
            onClick={() => {
              loadVersions();
              setShowVersionsModal(true);
            }}
            className="p-2 rounded-full hover:bg-white/10 text-[#646973] hover:text-[#D7E2EA] transition cursor-pointer"
            title="Version History"
          >
            <History className="w-4 h-4" />
          </button>

          {/* Settings & Export */}
          <button
            onClick={() => setShowSettingsModal(true)}
            className="p-2 rounded-full hover:bg-white/10 text-[#646973] hover:text-[#D7E2EA] transition cursor-pointer"
            title="Settings & Export"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Realtime Active Viewers */}
          <div
            className="flex items-center gap-1.5 bg-[#0C0C0C] border border-[#262626] px-2.5 py-1 rounded-full text-xs text-[#D7E2EA] ml-1"
            title={`${presenceCount} device(s) live`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <Users className="w-3.5 h-3.5 text-[#646973]" />
            <span className="font-mono text-xs">{presenceCount}</span>
          </div>
        </div>
      </header>

      {/* ============================================================ */}
      {/* 2. THE 5 MAIN PRIMARY TABS (PROMINENT BIG TEXT) */}
      {/* ============================================================ */}
      <div className="w-full bg-[#111111] border-b border-[#262626] px-4 sm:px-8 py-3 flex items-center justify-between z-10 flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 mx-auto sm:mx-0 overflow-x-auto">
          {/* Tab 1: Normal Notepad */}
          <button
            onClick={() => setActiveTab('notepad')}
            className={`flex items-center gap-2 px-3.5 sm:px-5 py-2.5 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'notepad'
                ? 'bg-purple-600/25 border-2 border-purple-500 text-white shadow-[0_0_20px_rgba(118,33,176,0.3)]'
                : 'bg-[#181818] border border-[#262626] text-[#646973] hover:text-[#D7E2EA]'
            }`}
          >
            <FileText className={`w-5 h-5 ${activeTab === 'notepad' ? 'text-purple-400' : ''}`} />
            <span className="text-sm sm:text-base font-bold uppercase tracking-wider">
              Notepad
            </span>
          </button>

          {/* Tab 2: PDFs & Files */}
          <button
            onClick={() => setActiveTab('files')}
            className={`flex items-center gap-2 px-3.5 sm:px-5 py-2.5 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'files'
                ? 'bg-purple-600/25 border-2 border-purple-500 text-white shadow-[0_0_20px_rgba(118,33,176,0.3)]'
                : 'bg-[#181818] border border-[#262626] text-[#646973] hover:text-[#D7E2EA]'
            }`}
          >
            <File className={`w-5 h-5 ${activeTab === 'files' ? 'text-purple-400' : ''}`} />
            <span className="text-sm sm:text-base font-bold uppercase tracking-wider">
              PDFs & Files
            </span>
            {docFiles.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-900/60 text-purple-200 font-mono">
                {docFiles.length}
              </span>
            )}
          </button>

          {/* Tab 3: Photos */}
          <button
            onClick={() => setActiveTab('photos')}
            className={`flex items-center gap-2 px-3.5 sm:px-5 py-2.5 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'photos'
                ? 'bg-purple-600/25 border-2 border-purple-500 text-white shadow-[0_0_20px_rgba(118,33,176,0.3)]'
                : 'bg-[#181818] border border-[#262626] text-[#646973] hover:text-[#D7E2EA]'
            }`}
          >
            <ImageIcon className={`w-5 h-5 ${activeTab === 'photos' ? 'text-pink-400' : ''}`} />
            <span className="text-sm sm:text-base font-bold uppercase tracking-wider">
              Photos
            </span>
            {photoFiles.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-pink-900/60 text-pink-200 font-mono">
                {photoFiles.length}
              </span>
            )}
          </button>

          {/* Tab 4: Audio */}
          <button
            onClick={() => setActiveTab('audio')}
            className={`flex items-center gap-2 px-3.5 sm:px-5 py-2.5 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'audio'
                ? 'bg-purple-600/25 border-2 border-purple-500 text-white shadow-[0_0_20px_rgba(118,33,176,0.3)]'
                : 'bg-[#181818] border border-[#262626] text-[#646973] hover:text-[#D7E2EA]'
            }`}
          >
            <Music className={`w-5 h-5 ${activeTab === 'audio' ? 'text-blue-400' : ''}`} />
            <span className="text-sm sm:text-base font-bold uppercase tracking-wider">
              Audio
            </span>
            {audioFiles.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-200 font-mono">
                {audioFiles.length}
              </span>
            )}
          </button>

          {/* Tab 5: Converter & Tools (Beside Audio) */}
          <button
            onClick={() => setActiveTab('converter')}
            className={`flex items-center gap-2 px-3.5 sm:px-5 py-2.5 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'converter'
                ? 'bg-purple-600/25 border-2 border-purple-500 text-white shadow-[0_0_20px_rgba(118,33,176,0.3)]'
                : 'bg-[#181818] border border-[#262626] text-[#646973] hover:text-[#D7E2EA]'
            }`}
          >
            <RefreshCw className={`w-5 h-5 ${activeTab === 'converter' ? 'text-cyan-400' : ''}`} />
            <span className="text-sm sm:text-base font-bold uppercase tracking-wider">
              Converter
            </span>
          </button>
        </div>

        {/* Audio mini playing status if playing */}
        {currentAudioTrack && (
          <div className="hidden lg:flex items-center gap-3 bg-[#0C0C0C] px-3 py-1.5 rounded-full border border-purple-500/30">
            <button onClick={toggleAudio} className="p-1 text-purple-400 hover:text-white cursor-pointer">
              {isPlayingAudio ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <span className="text-xs text-[#D7E2EA] truncate max-w-[140px] font-medium">
              {currentAudioTrack.name}
            </span>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 3. WORKSPACE TAB VIEWS */}
      {/* ============================================================ */}
      {needsUnlock ? (
        /* Password Wall if Locked */
        <div className="flex-1 flex items-center justify-center p-6 bg-[#0C0C0C]">
          <div className="bg-[#141414] border border-[#262626] rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
            <div className="w-16 h-16 mx-auto mb-4 rounded-3xl bg-purple-900/30 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Lock className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold uppercase tracking-wider text-white mb-2">
              Pad is Encrypted
            </h3>
            <p className="text-xs text-[#646973] mb-6 leading-relaxed">
              This code is protected by client-side AES-GCM encryption. Enter the passphrase to decrypt.
            </p>

            {unlockError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs">
                {unlockError}
              </div>
            )}

            <form onSubmit={handleUnlockPad} className="space-y-4">
              <input
                type="password"
                autoFocus
                value={unlockPassword}
                onChange={(e) => setUnlockPassword(e.target.value)}
                placeholder="Enter decryption password..."
                className="w-full bg-[#0C0C0C] border border-[#262626] rounded-xl px-4 py-3 text-sm text-[#D7E2EA] outline-none focus:border-purple-500"
              />
              <button
                type="submit"
                className="w-full glow-btn py-3 rounded-xl text-white font-medium uppercase tracking-wider text-xs cursor-pointer"
              >
                Decrypt & Open
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden bg-[#0C0C0C]">
          {/* Main Tabs Workspace Area */}
          <div className="flex-1 flex flex-col overflow-hidden h-full">
            {/* ============================================================ */}
            {/* VIEW 1: NORMAL NOTEPAD (LEFT ALIGNED TEXT & CURSOR) */}
            {/* ============================================================ */}
          {activeTab === 'notepad' && (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Minimal Clean Formatting Bar */}
              <div className="bg-[#141414] border-b border-[#262626] px-4 py-2 flex items-center justify-between text-xs select-none">
                <div className="flex items-center gap-1 sm:gap-2">
                  <button
                    title="Bold"
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

                {/* Right: Word count & SMALL ON-DEMAND PREVIEW ICON */}
                <div className="flex items-center gap-3">
                  <span className="hidden sm:inline text-[#646973]">
                    {wordCount} words • {charCount} chars
                  </span>

                  {/* Toggle Preview On Demand */}
                  <button
                    onClick={() => setIsMarkdownPreviewActive(!isMarkdownPreviewActive)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium uppercase tracking-wider transition cursor-pointer ${
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

              {/* Editor Workspace: Left Aligned strictly from top-left */}
              <div className="flex-1 p-6 md:p-8 overflow-y-auto max-w-5xl mx-auto w-full text-left">
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
                    {renderMarkdownText(content || '*No content written yet.*')}
                  </div>
                ) : (
                  <textarea
                    ref={textareaRef}
                    autoFocus
                    value={content}
                    onChange={(e) => handleContentChange(e.target.value)}
                    placeholder="Type anything here... Autosaves instantly. Switch to PDFs, Photos, Audio, or Converter above anytime."
                    style={{ textAlign: 'left', direction: 'ltr' }}
                    className="w-full h-full min-h-[500px] bg-transparent border-none outline-none resize-none text-[#D7E2EA] placeholder-[#4a4f58] text-base sm:text-lg leading-relaxed selection:bg-purple-600/40 text-left placeholder:text-left block"
                  />
                )}
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* VIEW 2: PDFS & FILES */}
          {/* ============================================================ */}
          {activeTab === 'files' && (
            <div className="flex-1 p-6 overflow-y-auto max-w-4xl mx-auto w-full flex flex-col gap-6 text-left">
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

              {/* Upload Dropzone */}
              <div
                onClick={() => generalFileInputRef.current?.click()}
                className="border-2 border-dashed border-[#262626] hover:border-purple-500/50 rounded-3xl p-8 text-center cursor-pointer bg-[#141414]/50 transition flex flex-col items-center justify-center gap-3"
              >
                <div className="p-3.5 rounded-2xl bg-purple-900/30 text-purple-400 border border-purple-500/20">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    Click or drag PDF & document files here
                  </p>
                  <p className="text-xs text-[#646973]">
                    PDF, DOC, ZIP, TXT up to 50MB
                  </p>
                </div>
              </div>

              {/* Files Table / List */}
              <div className="space-y-2">
                {docFiles.length === 0 ? (
                  <div className="text-center py-12 text-[#646973] text-sm">
                    No PDF or document files uploaded yet.
                  </div>
                ) : (
                  docFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-[#141414] border border-[#262626] hover:border-[#D7E2EA]/30 transition"
                    >
                      <div
                        onClick={() => setSelectedFileForPreview(file)}
                        className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                      >
                        <div className="p-2.5 rounded-xl bg-purple-900/30 text-purple-400">
                          <File className="w-5 h-5" />
                        </div>
                        <div className="truncate">
                          <p className="text-sm font-semibold text-white truncate">
                            {file.filename}
                          </p>
                          <p className="text-xs text-[#646973]">
                            {formatFileSize(file.size)} • {new Date(file.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedFileForPreview(file)}
                          className="p-2 rounded-xl text-[#646973] hover:text-white hover:bg-white/10 cursor-pointer"
                          title="Preview"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <a
                          href={file.url}
                          download={file.filename}
                          className="p-2 rounded-xl text-[#646973] hover:text-white hover:bg-white/10 cursor-pointer"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        {!isReadOnlyMode && (
                          <button
                            onClick={() => handleDeleteFile(file.id)}
                            className="p-2 rounded-xl text-[#646973] hover:text-rose-400 hover:bg-rose-950/20 cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* VIEW 3: PHOTOS */}
          {/* ============================================================ */}
          {activeTab === 'photos' && (
            <div className="flex-1 p-6 overflow-y-auto max-w-5xl mx-auto w-full flex flex-col gap-6 text-left">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold uppercase tracking-wider text-white">
                    Photos & Image Gallery
                  </h3>
                  <p className="text-xs text-[#646973]">
                    Upload and organize 3D renders, screenshots, and visual assets
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => photoFileInputRef.current?.click()}
                    className="glow-btn px-5 py-2 rounded-xl text-white text-xs font-medium uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" /> Upload Photos
                  </button>
                  <input
                    ref={photoFileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => e.target.files && handleUploadFiles(e.target.files)}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Photos Grid */}
              {photoFiles.length === 0 ? (
                <div
                  onClick={() => photoFileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#262626] hover:border-pink-500/50 rounded-3xl p-16 text-center cursor-pointer bg-[#141414]/50 transition flex flex-col items-center justify-center gap-3"
                >
                  <div className="p-4 rounded-2xl bg-pink-900/30 text-pink-400 border border-pink-500/20">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                  <p className="text-base font-semibold text-white">
                    No photos uploaded yet
                  </p>
                  <p className="text-xs text-[#646973]">
                    Click here to upload PNG, JPG, GIF, WebP renders
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {photoFiles.map((photo) => (
                    <div
                      key={photo.id}
                      className="group relative bg-[#141414] border border-[#262626] hover:border-pink-500/50 rounded-2xl overflow-hidden shadow-lg transition flex flex-col"
                    >
                      <div
                        onClick={() => setSelectedFileForPreview(photo)}
                        className="h-44 w-full overflow-hidden cursor-pointer bg-[#0C0C0C]"
                      >
                        <img
                          src={photo.url}
                          alt={photo.filename}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="p-3 flex items-center justify-between text-xs">
                        <span className="truncate text-white font-medium max-w-[120px]">
                          {photo.filename}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setSelectedFileForPreview(photo)}
                            className="p-1 text-[#646973] hover:text-white cursor-pointer"
                            title="Preview / OCR"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <a
                            href={photo.url}
                            download={photo.filename}
                            className="p-1 text-[#646973] hover:text-white cursor-pointer"
                            title="Download"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                          {!isReadOnlyMode && (
                            <button
                              onClick={() => handleDeleteFile(photo.id)}
                              className="p-1 text-[#646973] hover:text-rose-400 cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* VIEW 4: AUDIO */}
          {/* ============================================================ */}
          {activeTab === 'audio' && (
            <div className="flex-1 p-6 overflow-y-auto max-w-4xl mx-auto w-full flex flex-col gap-6 text-left">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold uppercase tracking-wider text-white">
                    Audio & Music Tracks
                  </h3>
                  <p className="text-xs text-[#646973]">
                    Upload songs, soundtracks, and voice memos that play while you work
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => audioFileInputRef.current?.click()}
                    className="glow-btn px-5 py-2 rounded-xl text-white text-xs font-medium uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" /> Upload Audio
                  </button>
                  <input
                    ref={audioFileInputRef}
                    type="file"
                    accept="audio/*"
                    multiple
                    onChange={(e) => e.target.files && handleUploadFiles(e.target.files)}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Audio Player Showcase Card */}
              {currentAudioTrack && (
                <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-950/40 to-blue-950/30 border border-purple-500/40 shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-2xl bg-purple-600/30 text-purple-300">
                        <Music className="w-6 h-6 animate-pulse" />
                      </div>
                      <div>
                        <span className="text-[10px] text-purple-300 font-bold uppercase tracking-widest">
                          Active Audio Track
                        </span>
                        <h4 className="text-lg font-bold text-white truncate max-w-md">
                          {currentAudioTrack.name}
                        </h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={toggleAudio}
                        className="glow-btn p-3 rounded-full text-white cursor-pointer"
                      >
                        {isPlayingAudio ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Seek Bar */}
                  <div>
                    <input
                      type="range"
                      min={0}
                      max={audioDuration || 100}
                      value={audioCurrentTime}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setAudioCurrentTime(val);
                        if (audioRef.current) audioRef.current.currentTime = val;
                      }}
                      className="w-full h-1.5 bg-[#262626] rounded-full appearance-none cursor-pointer accent-purple-500"
                    />
                    <div className="flex justify-between text-xs text-[#646973] font-mono mt-1">
                      <span>{formatTime(audioCurrentTime)}</span>
                      <span>{formatTime(audioDuration)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Audio Track List */}
              <div className="space-y-2">
                {audioFiles.length === 0 ? (
                  <div
                    onClick={() => audioFileInputRef.current?.click()}
                    className="border-2 border-dashed border-[#262626] hover:border-blue-500/50 rounded-3xl p-16 text-center cursor-pointer bg-[#141414]/50 transition flex flex-col items-center justify-center gap-3"
                  >
                    <div className="p-4 rounded-2xl bg-blue-900/30 text-blue-400 border border-blue-500/20">
                      <Music className="w-8 h-8" />
                    </div>
                    <p className="text-base font-semibold text-white">
                      No audio tracks uploaded yet
                    </p>
                    <p className="text-xs text-[#646973]">
                      Upload MP3, WAV, FLAC, AAC tracks to listen while writing
                    </p>
                  </div>
                ) : (
                  audioFiles.map((track) => (
                    <div
                      key={track.id}
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-[#141414] border border-[#262626] hover:border-blue-500/30 transition"
                    >
                      <div
                        onClick={() => playTrack({ id: track.id, name: track.filename, url: track.url, size: track.size })}
                        className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                      >
                        <div className="p-2.5 rounded-xl bg-blue-900/30 text-blue-400">
                          <Play className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <p className="text-sm font-semibold text-white truncate">
                            {track.filename}
                          </p>
                          <p className="text-xs text-[#646973]">
                            {formatFileSize(track.size)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => playTrack({ id: track.id, name: track.filename, url: track.url, size: track.size })}
                          className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 text-xs font-medium uppercase tracking-wider cursor-pointer"
                        >
                          Play Track
                        </button>
                        <a
                          href={track.url}
                          download={track.filename}
                          className="p-2 rounded-xl text-[#646973] hover:text-white cursor-pointer"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        {!isReadOnlyMode && (
                          <button
                            onClick={() => handleDeleteFile(track.id)}
                            className="p-2 rounded-xl text-[#646973] hover:text-rose-400 cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* VIEW 5: CONVERTER & DOCUMENT TOOLS (BESIDE AUDIO) */}
          {/* ============================================================ */}
          {activeTab === 'converter' && (
            <ConverterStudio
              padCode={code}
              onSaveToPad={async (file: File) => {
                const formData = new FormData();
                formData.append('files', file);
                await fetch(getApiUrl(`/api/pages/${encodeURIComponent(code)}/files`), {
                  method: 'POST',
                  body: formData
                });
                await loadFiles();
              }}
            />
          )}
          </div>

          {/* Right Side Synchronized Chat & Audio/Video Call */}
          <PeerChatAndCall
            code={code}
            clientId={clientIdRef.current}
            ws={wsRef.current}
            presenceCount={presenceCount}
            isOpen={showChatPanel}
            onToggleOpen={() => setShowChatPanel(!showChatPanel)}
            onOpenMeet={() => setShowMeetModal(true)}
          />
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. MODALS & POPUPS */}
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
            body: JSON.stringify({ versionId: id })
          });
          const data = await res.json();
          if (data.page) setContent(data.page.content);
        }}
        isReadOnly={isReadOnlyMode}
      />

      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        expiresAt={expiresAt}
        burnAfterReading={burnAfterReading}
        onUpdateExpiry={async (targetExpiresAt, burn) => {
          setExpiresAt(targetExpiresAt);
          setBurnAfterReading(burn);
          await fetch(getApiUrl(`/api/pages/${encodeURIComponent(code)}`), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ expires_at: targetExpiresAt, burn_after_reading: burn })
          });
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

      {/* Google Meet / Zoom Style Multi-Person Meet Room with Screen Sharing & Live Captions */}
      <MeetRoomModal
        code={code}
        clientId={clientIdRef.current}
        userName="You"
        isOpen={showMeetModal}
        onClose={() => setShowMeetModal(false)}
        ws={wsRef.current}
        onSendChatMessage={(text) => {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              type: 'chat_message',
              text,
              senderName: 'You'
            }));
          }
        }}
      />

      {/* Lightbox / Preview Modal for Photos & PDFs */}
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
