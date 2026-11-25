import React, { useState, useEffect } from 'react';
import { Keyboard, X, Edit3, RotateCcw, Check, AlertCircle } from 'lucide-react';
import { getShortcutsList, saveShortcut, resetShortcuts, ShortcutDefinition } from '../../lib/shortcuts';
import { showToast } from '../common/ToastContainer';

interface ShortcutsHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsHelpModal: React.FC<ShortcutsHelpModalProps> = ({ isOpen, onClose }) => {
  const [shortcuts, setShortcuts] = useState<ShortcutDefinition[]>([]);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [recordedCombo, setRecordedCombo] = useState<string>('');

  const refreshList = () => {
    setShortcuts(getShortcutsList());
  };

  useEffect(() => {
    if (isOpen) {
      refreshList();
      setRecordingId(null);
    }
  }, [isOpen]);

  // Key recording listener
  useEffect(() => {
    if (!recordingId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Don't record solitary modifier keys
      if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
        return;
      }

      if (e.key === 'Escape') {
        setRecordingId(null);
        return;
      }

      const parts: string[] = [];
      if (e.ctrlKey) parts.push('Ctrl');
      if (e.metaKey) parts.push('Cmd');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey) parts.push('Shift');

      let mainKey = e.key.toUpperCase();
      if (e.code.startsWith('Key')) mainKey = e.code.replace('Key', '');
      if (e.code.startsWith('Digit')) mainKey = e.code.replace('Digit', '');
      if (e.key === '/') mainKey = '/';
      if (e.key === '?') mainKey = '?';

      parts.push(mainKey);
      const combo = parts.join(' + ');

      saveShortcut(recordingId, combo);
      refreshList();
      showToast('success', `Shortcut updated to ${combo}`);
      setRecordingId(null);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [recordingId]);

  if (!isOpen) return null;

  const handleReset = () => {
    resetShortcuts();
    refreshList();
    showToast('info', 'Shortcuts reset to defaults');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-[#141220] border border-purple-500/30 rounded-3xl shadow-2xl p-6 sm:p-7 relative flex flex-col max-h-[85vh]">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-purple-600/30 border border-purple-500/30 flex items-center justify-center text-purple-300">
            <Keyboard className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white uppercase tracking-wider">
              Keyboard Shortcuts
            </h3>
            <p className="text-xs text-[#646973]">
              Click any shortcut to press and customize your own keys
            </p>
          </div>
        </div>

        {/* Shortcuts List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 divide-y divide-white/5 my-2">
          {shortcuts.map((sc) => {
            const isRecording = recordingId === sc.id;

            return (
              <div
                key={sc.id}
                className="flex items-center justify-between py-2.5 px-2 hover:bg-white/5 rounded-xl transition gap-3 text-xs"
              >
                <div className="flex flex-col">
                  <span className="text-[#D7E2EA] font-medium">{sc.label}</span>
                  <span className="text-[10px] text-white/40 font-mono uppercase">{sc.category}</span>
                </div>

                <div className="flex items-center gap-2">
                  {isRecording ? (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-600 text-white font-mono text-xs animate-pulse border border-purple-400">
                      <span>Press keys...</span>
                      <kbd className="text-[10px] bg-black/30 px-1 py-0.2 rounded">ESC to cancel</kbd>
                    </div>
                  ) : (
                    <button
                      onClick={() => setRecordingId(sc.id)}
                      className="group flex items-center gap-2 px-2.5 py-1 rounded-xl bg-[#0c0c0c] border border-purple-900/40 hover:border-purple-500 text-purple-300 hover:text-white font-mono text-xs font-semibold shadow-inner transition cursor-pointer"
                      title="Click to change shortcut"
                    >
                      <span>{sc.currentKey}</span>
                      <Edit3 className="w-3 h-3 opacity-40 group-hover:opacity-100 text-purple-400" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-white/50 hover:text-white transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Defaults</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl glow-btn text-white font-semibold uppercase tracking-wider text-xs cursor-pointer shadow-md"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
