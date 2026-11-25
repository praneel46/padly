import React, { useState } from 'react';
import { MessageSquare, Phone, Video, Plus, X } from 'lucide-react';
import { useCall } from '../../context/CallContext';

interface SpeedDialCallButtonProps {
  isChatOpen: boolean;
  onOpenChat: () => void;
}

export const SpeedDialCallButton: React.FC<SpeedDialCallButtonProps> = ({
  isChatOpen,
  onOpenChat,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { startCall, callState } = useCall();

  // If chat panel is already open, hide the floating button completely
  if (isChatOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2.5">
      {/* Expanded Actions */}
      {isOpen && (
        <div className="flex flex-col items-end gap-2 animate-in fade-in slide-in-from-bottom-3 duration-150">
          {/* Start Video Meet */}
          <button
            onClick={() => {
              setIsOpen(false);
              startCall('video');
            }}
            className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-[#141220] hover:bg-[#1f1b30] border border-purple-500/30 text-white text-xs font-medium shadow-xl hover:scale-105 transition cursor-pointer"
          >
            <span>Start Video Meet</span>
            <div className="w-7 h-7 rounded-xl bg-purple-600/30 text-purple-300 flex items-center justify-center">
              <Video className="w-3.5 h-3.5" />
            </div>
          </button>

          {/* Start Voice Call */}
          <button
            onClick={() => {
              setIsOpen(false);
              startCall('audio');
            }}
            className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-[#141220] hover:bg-[#1f1b30] border border-purple-500/30 text-white text-xs font-medium shadow-xl hover:scale-105 transition cursor-pointer"
          >
            <span>Start Voice Call</span>
            <div className="w-7 h-7 rounded-xl bg-emerald-600/30 text-emerald-300 flex items-center justify-center">
              <Phone className="w-3.5 h-3.5" />
            </div>
          </button>

          {/* Open Chat */}
          <button
            onClick={() => {
              setIsOpen(false);
              onOpenChat();
            }}
            className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-[#141220] hover:bg-[#1f1b30] border border-purple-500/30 text-white text-xs font-medium shadow-xl hover:scale-105 transition cursor-pointer"
          >
            <span>Open Room Chat</span>
            <div className="w-7 h-7 rounded-xl bg-indigo-600/30 text-indigo-300 flex items-center justify-center">
              <MessageSquare className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>
      )}

      {/* Main Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-xl shadow-purple-900/30 flex items-center justify-center transition-all duration-200 hover:scale-105 cursor-pointer border border-purple-400/30"
        title={isOpen ? 'Close' : 'Chat & Call Actions'}
      >
        {isOpen ? (
          <X className="w-5 h-5 transition-transform" />
        ) : (
          <div className="relative">
            <MessageSquare className="w-5 h-5" />
            {callState !== 'idle' && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0c0c0c] animate-pulse" />
            )}
          </div>
        )}
      </button>
    </div>
  );
};
