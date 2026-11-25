import React, { useState } from 'react';
import { Settings, Flame, Clock, Download, Trash2, X, AlertTriangle, FileDown, Keyboard } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  expiresAt: number | null;
  burnAfterReading: boolean;
  onUpdateExpiry: (expiresAt: number | null, burn: boolean) => Promise<void>;
  onExport: (format: 'pdf' | 'md' | 'txt') => void;
  onDeletePad: () => Promise<void>;
  isReadOnly: boolean;
  onOpenShortcuts?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  expiresAt,
  burnAfterReading,
  onUpdateExpiry,
  onExport,
  onDeletePad,
  isReadOnly,
  onOpenShortcuts,
}) => {
  const [selectedDuration, setSelectedDuration] = useState<string>(
    expiresAt ? 'custom' : 'never'
  );
  const [burn, setBurn] = useState(burnAfterReading);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSaveExpiry = async () => {
    setSaving(true);
    let targetTime: number | null = null;
    const now = Date.now();

    if (selectedDuration === '1h') targetTime = now + 60 * 60 * 1000;
    else if (selectedDuration === '1d') targetTime = now + 24 * 60 * 60 * 1000;
    else if (selectedDuration === '7d') targetTime = now + 7 * 24 * 60 * 60 * 1000;
    else targetTime = null;

    try {
      await onUpdateExpiry(targetTime, burn);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none">
      <div className="bg-[#141414] border border-[#262626] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#646973] hover:text-white p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-2xl bg-purple-900/30 text-purple-400">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white uppercase tracking-wider">
              Pad Settings & Export
            </h3>
            <p className="text-xs text-[#646973]">Configure self-destruction and backups</p>
          </div>
        </div>

        {/* Export Formats */}
        <div className="mb-6">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-[#646973] block mb-2">
            Export Workspace Content
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => onExport('pdf')}
              className="p-2.5 rounded-xl bg-[#0C0C0C] border border-[#262626] hover:border-purple-500/50 text-[#D7E2EA] hover:text-white text-xs flex flex-col items-center gap-1.5 transition"
            >
              <FileDown className="w-4 h-4 text-rose-400" />
              <span>PDF Doc</span>
            </button>
            <button
              onClick={() => onExport('md')}
              className="p-2.5 rounded-xl bg-[#0C0C0C] border border-[#262626] hover:border-purple-500/50 text-[#D7E2EA] hover:text-white text-xs flex flex-col items-center gap-1.5 transition"
            >
              <Download className="w-4 h-4 text-blue-400" />
              <span>Markdown</span>
            </button>
            <button
              onClick={() => onExport('txt')}
              className="p-2.5 rounded-xl bg-[#0C0C0C] border border-[#262626] hover:border-purple-500/50 text-[#D7E2EA] hover:text-white text-xs flex flex-col items-center gap-1.5 transition"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Plain Text</span>
            </button>
          </div>
        </div>

        {/* Custom Keyboard Shortcuts Section */}
        {onOpenShortcuts && (
          <div className="mb-5 p-3 rounded-2xl bg-[#0C0C0C] border border-[#262626] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-950/50 text-purple-400 border border-purple-500/20">
                <Keyboard className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Keyboard Shortcuts</p>
                <p className="text-[10px] text-[#646973]">Re-bind and record your own keys</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenShortcuts();
              }}
              className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 hover:text-white border border-purple-500/30 text-xs font-medium transition cursor-pointer"
            >
              Customize...
            </button>
          </div>
        )}

        {/* Auto Expiry & Self Destruction */}
        {!isReadOnly && (
          <div className="border-t border-[#262626] pt-5 space-y-4">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[#646973] block mb-2 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-purple-400" /> Auto-Expiry Lifetime
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'never', label: 'Never' },
                  { id: '1h', label: '1 Hour' },
                  { id: '1d', label: '1 Day' },
                  { id: '7d', label: '7 Days' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedDuration(item.id)}
                    className={`py-2 rounded-lg text-xs font-medium transition ${
                      selectedDuration === item.id
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-[#0C0C0C] text-[#646973] hover:text-[#D7E2EA] border border-[#262626]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Burn after reading */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#0C0C0C] border border-[#262626]">
              <div className="flex items-center gap-2">
                <Flame className={`w-4 h-4 ${burn ? 'text-orange-500' : 'text-[#646973]'}`} />
                <div>
                  <p className="text-xs font-medium text-white">Burn After Reading</p>
                  <p className="text-[10px] text-[#646973]">Erase immediately after first recipient views</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={burn}
                onChange={(e) => setBurn(e.target.checked)}
                className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
              />
            </div>

            <button
              onClick={handleSaveExpiry}
              disabled={saving}
              className="w-full glow-btn py-2.5 rounded-xl text-white text-xs font-medium uppercase tracking-wider cursor-pointer"
            >
              {saving ? 'Saving...' : 'Apply Expiry Settings'}
            </button>

            {/* Erase Pad */}
            <div className="pt-2 border-t border-[#262626]/50">
              <button
                onClick={async () => {
                  if (confirm('Are you sure you want to completely erase this pad and all attached files?')) {
                    await onDeletePad();
                    onClose();
                  }
                }}
                className="w-full py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-950/30 border border-rose-900/30 flex items-center justify-center gap-1.5 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Erase This Pad Now
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
