import React from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { useCall } from '../../context/CallContext';

export const IncomingCallDialog: React.FC = () => {
  const { callState, callMode, callerName, code, acceptCall, declineCall } = useCall();

  if (callState !== 'incoming') {
    return null;
  }

  const isVideo = callMode === 'video';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#141220] border-2 border-purple-500/50 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-[0_0_50px_rgba(168,85,247,0.4)] text-center flex flex-col items-center">
        {/* Pulsing Ring Avatar */}
        <div className="relative flex items-center justify-center mb-5">
          <span className="animate-ping absolute inline-flex h-20 w-20 rounded-full bg-purple-500 opacity-40"></span>
          <span className="animate-pulse absolute inline-flex h-16 w-16 rounded-full bg-purple-600 opacity-60"></span>
          <div className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-xl border-2 border-purple-300">
            {isVideo ? <Video className="w-7 h-7" /> : <Phone className="w-7 h-7" />}
          </div>
        </div>

        <h3 className="text-lg font-bold text-white uppercase tracking-wider mb-1">
          Incoming {isVideo ? 'Video Meet' : 'Voice Call'}
        </h3>
        <p className="text-xs text-purple-300 font-semibold mb-1">
          {callerName || 'Friend'} is calling you
        </p>
        <p className="text-[11px] text-white/50 mb-6 font-mono">
          Pad Room #{code}
        </p>

        {/* Buttons */}
        <div className="flex items-center gap-3 w-full">
          <button
            onClick={declineCall}
            className="flex-1 py-3 rounded-2xl bg-rose-600/30 hover:bg-rose-600 border border-rose-500/40 text-rose-200 hover:text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer shadow-lg"
          >
            <PhoneOff className="w-4 h-4" />
            <span>Decline</span>
          </button>

          <button
            onClick={acceptCall}
            className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer shadow-[0_0_20px_rgba(16,185,129,0.4)] animate-pulse"
          >
            {isVideo ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
            <span>Accept</span>
          </button>
        </div>
      </div>
    </div>
  );
};
