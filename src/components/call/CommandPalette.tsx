import React, { useState, useEffect } from 'react';
import {
  Search, Video, Phone, MessageSquare, FileText, Image,
  Music, Repeat, Lock, History, Settings, Share2, Eye, X
} from 'lucide-react';
import { useCall } from '../../context/CallContext';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchTab: (tab: 'notepad' | 'files' | 'photos' | 'audio' | 'converter') => void;
  onToggleChat: () => void;
  onOpenLock: () => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
  onShare: () => void;
  onTogglePreview: () => void;
  onNavigateCode: (code: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSwitchTab,
  onToggleChat,
  onOpenLock,
  onOpenHistory,
  onOpenSettings,
  onShare,
  onTogglePreview,
  onNavigateCode,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { startCall } = useCall();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          setQuery('');
          setSelectedIndex(0);
          // Handled by parent or trigger
        }
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const commands = [
    { id: 'video-call', title: 'Start Video Meet', category: 'Calls', icon: Video, action: () => startCall('video') },
    { id: 'voice-call', title: 'Start Voice Call', category: 'Calls', icon: Phone, action: () => startCall('audio') },
    { id: 'chat', title: 'Toggle Synchronized Chat', category: 'Chat', icon: MessageSquare, action: onToggleChat },
    { id: 'tab-notepad', title: 'Switch to Notepad', category: 'Tabs', icon: FileText, action: () => onSwitchTab('notepad') },
    { id: 'tab-files', title: 'Switch to PDFs & Files', category: 'Tabs', icon: FileText, action: () => onSwitchTab('files') },
    { id: 'tab-photos', title: 'Switch to Photos Gallery', category: 'Tabs', icon: Image, action: () => onSwitchTab('photos') },
    { id: 'tab-audio', title: 'Switch to Audio Player', category: 'Tabs', icon: Music, action: () => onSwitchTab('audio') },
    { id: 'tab-converter', title: 'Switch to Converter Studio', category: 'Tabs', icon: Repeat, action: () => onSwitchTab('converter') },
    { id: 'preview', title: 'Toggle Markdown Preview', category: 'Editor', icon: Eye, action: onTogglePreview },
    { id: 'lock', title: 'Lock & Encrypt Pad (AES-256)', category: 'Security', icon: Lock, action: onOpenLock },
    { id: 'history', title: 'Version History', category: 'History', icon: History, action: onOpenHistory },
    { id: 'settings', title: 'Pad Settings & Expiration', category: 'Settings', icon: Settings, action: onOpenSettings },
    { id: 'share', title: 'Copy Share Link / QR Code', category: 'Share', icon: Share2, action: onShare },
  ];

  const filteredCommands = commands.filter(c =>
    c.title.toLowerCase().includes(query.toLowerCase()) ||
    c.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (action: () => void) => {
    onClose();
    action();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center pt-20 px-4 animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-[#141220] border border-purple-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#262626]">
          <Search className="w-4 h-4 text-purple-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command or search action..."
            className="w-full bg-transparent text-sm text-[#D7E2EA] placeholder-white/30 outline-none"
          />
          <kbd className="text-[10px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-white/50">
            ESC
          </kbd>
        </div>

        {/* Command List */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-white/5">
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-xs text-white/40">
              No matching commands found.
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const Icon = cmd.icon;
              const isSelected = idx === selectedIndex;

              return (
                <button
                  key={cmd.id}
                  onClick={() => handleSelect(cmd.action)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition cursor-pointer text-xs ${
                    isSelected ? 'bg-purple-600/30 text-white' : 'text-[#D7E2EA]/80 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-purple-400">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-medium">{cmd.title}</span>
                  </div>
                  <span className="text-[10px] text-white/40 font-mono uppercase">
                    {cmd.category}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
