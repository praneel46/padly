import React from 'react';
import { Keyboard, X } from 'lucide-react';

interface ShortcutsHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsHelpModal: React.FC<ShortcutsHelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Ctrl + S', desc: 'Save Pad content immediately' },
    { key: 'Ctrl + B', desc: 'Format selected text with Bold' },
    { key: 'Ctrl + /', desc: 'Toggle Synchronized Chat panel' },
    { key: 'Ctrl + K', desc: 'Open Command Palette' },
    { key: 'Esc', desc: 'Close dialogs, menus, or modals' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[#141220] border border-purple-500/30 rounded-2xl shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-purple-600/30 border border-purple-500/30 flex items-center justify-center text-purple-300">
            <Keyboard className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Keyboard Shortcuts</h3>
            <p className="text-xs text-[#646973]">Quick controls for fast editing and navigation</p>
          </div>
        </div>

        <div className="space-y-2.5">
          {shortcuts.map((sc, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 text-xs">
              <span className="text-[#D7E2EA]/80">{sc.desc}</span>
              <kbd className="px-2 py-1 rounded bg-[#0c0c0c] border border-[#262626] font-mono text-purple-300 font-semibold shadow-inner">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
