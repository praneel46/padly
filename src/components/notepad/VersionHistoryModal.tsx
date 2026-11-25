import React, { useState } from 'react';
import { History, RotateCcw, Clock, FileText, X, ArrowRight, Eye } from 'lucide-react';

export interface PadVersion {
  id: string;
  page_code: string;
  content: string;
  mode: string;
  created_at: number;
  summary: string;
}

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  versions: PadVersion[];
  currentContent: string;
  onRestore: (versionId: string) => Promise<void>;
  isReadOnly: boolean;
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  isOpen,
  onClose,
  versions,
  currentContent,
  onRestore,
  isReadOnly
}) => {
  const [selectedVersion, setSelectedVersion] = useState<PadVersion | null>(
    versions.length > 0 ? versions[0] : null
  );
  const [restoring, setRestoring] = useState(false);

  if (!isOpen) return null;

  const handleRestoreClick = async (id: string) => {
    setRestoring(true);
    try {
      await onRestore(id);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none">
      <div className="bg-[#141414] border border-[#262626] rounded-3xl p-6 sm:p-8 max-w-4xl w-full h-[80vh] flex flex-col shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#646973] hover:text-white p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5 pb-3 border-b border-[#262626]">
          <div className="p-2.5 rounded-2xl bg-purple-900/30 text-purple-400">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white uppercase tracking-wider">
              Version Timeline & History
            </h3>
            <p className="text-xs text-[#646973]">
              Review past revisions with one-click restore and content diff
            </p>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 overflow-hidden">
          {/* Left: Versions list (4 cols) */}
          <div className="md:col-span-4 border-r border-[#262626] pr-2 overflow-y-auto space-y-2">
            {versions.length === 0 ? (
              <p className="text-xs text-[#646973] p-4 text-center">No previous revisions yet.</p>
            ) : (
              versions.map((ver, idx) => (
                <div
                  key={ver.id}
                  onClick={() => setSelectedVersion(ver)}
                  className={`p-3 rounded-xl border cursor-pointer transition ${
                    selectedVersion?.id === ver.id
                      ? 'bg-purple-900/20 border-purple-500/50 text-white'
                      : 'bg-[#0C0C0C] border-[#262626] text-[#D7E2EA] hover:border-[#D7E2EA]/30'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1 font-mono">
                    <span className="font-semibold text-purple-300">
                      Rev #{versions.length - idx}
                    </span>
                    <span className="text-[10px] text-[#646973]">
                      {new Date(ver.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs truncate font-medium">{ver.summary || 'Snapshot'}</p>
                  <p className="text-[10px] text-[#646973] mt-1">
                    {ver.content.length} characters • {new Date(ver.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Right: Preview & Restore (8 cols) */}
          <div className="md:col-span-8 flex flex-col justify-between overflow-hidden">
            {selectedVersion ? (
              <>
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#262626]">
                  <div>
                    <span className="text-xs font-semibold text-white">
                      Revision Details ({new Date(selectedVersion.created_at).toLocaleString()})
                    </span>
                    <p className="text-[11px] text-[#646973]">
                      Mode: <span className="uppercase text-purple-300">{selectedVersion.mode}</span>
                    </p>
                  </div>

                  {!isReadOnly && (
                    <button
                      onClick={() => handleRestoreClick(selectedVersion.id)}
                      disabled={restoring}
                      className="glow-btn px-4 py-2 rounded-xl text-white text-xs font-medium uppercase tracking-wider flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      {restoring ? 'Restoring...' : 'Restore Revision'}
                    </button>
                  )}
                </div>

                <div className="flex-1 bg-[#0C0C0C] rounded-2xl p-4 overflow-y-auto border border-[#262626] font-mono text-xs text-[#D7E2EA] whitespace-pre-wrap leading-relaxed select-text">
                  {selectedVersion.content || <span className="text-[#646973]">[Empty document]</span>}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-[#646973]">
                Select a version from the left panel to preview.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
