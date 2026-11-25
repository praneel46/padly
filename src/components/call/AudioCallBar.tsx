import React from 'react';
import { PhoneOff, Mic, MicOff, Video, Shield, Loader2 } from 'lucide-react';
import { useCall } from '../../context/CallContext';

export const AudioCallBar: React.FC = () => {
  const {
    callState,
    callMode,
    callDuration,
    isMicMuted,
    toggleMic,
    startCall,
    endCall,
    participants,
    userName,
  } = useCall();

  if (callState === 'idle' || callMode !== 'audio') {
    return null;
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-[#12101b] border-b border-purple-900/40 px-4 py-2 flex items-center justify-between text-xs text-[#D7E2EA] shadow-md transition-all animate-in slide-in-from-top-1 z-30">
      {/* Left: Status & Duration */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {callState === 'reconnecting' ? (
            <span className="flex items-center gap-1.5 text-amber-400 font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Reconnecting...</span>
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="font-semibold text-emerald-400 uppercase tracking-wider text-[11px]">
                Voice Call Live
              </span>
            </div>
          )}
          <span className="text-white/60 font-mono text-[11px] bg-black/40 px-2 py-0.5 rounded-md border border-white/5">
            {formatDuration(callDuration)}
          </span>
        </div>

        {/* Participant Avatars with Speaking Indicator */}
        <div className="hidden sm:flex items-center -space-x-1.5 pl-2">
          {/* Self */}
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white uppercase border-2 transition-all ${
              !isMicMuted ? 'border-purple-400 ring-2 ring-purple-500/50' : 'border-purple-900/60'
            } bg-gradient-to-tr from-purple-700 to-indigo-600`}
            title={`You (${userName})`}
          >
            {userName.charAt(0)}
          </div>

          {/* Peers */}
          {participants.map(p => (
            <div
              key={p.id}
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white uppercase border-2 transition-all ${
                p.isSpeaking ? 'border-emerald-400 ring-2 ring-emerald-500/50' : 'border-[#262626]'
              }`}
              style={{ backgroundColor: p.color || '#6366f1' }}
              title={p.name}
            >
              {p.name.charAt(0)}
            </div>
          ))}
        </div>
      </div>

      {/* Right: Audio Call Controls */}
      <div className="flex items-center gap-2">
        {/* Mic Toggle */}
        <button
          onClick={toggleMic}
          className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium transition cursor-pointer text-xs ${
            isMicMuted
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30'
              : 'bg-white/10 text-white hover:bg-white/15'
          }`}
          title={isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          {isMicMuted ? <MicOff className="w-3.5 h-3.5 text-rose-400" /> : <Mic className="w-3.5 h-3.5 text-emerald-400" />}
          <span>{isMicMuted ? 'Muted' : 'Mute'}</span>
        </button>

        {/* Upgrade to Video */}
        <button
          onClick={() => startCall('video')}
          className="px-3 py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/30 flex items-center gap-1.5 transition cursor-pointer text-xs"
          title="Switch to Video Call"
        >
          <Video className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden sm:inline">Switch to Video</span>
        </button>

        {/* End Call */}
        <button
          onClick={endCall}
          className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium flex items-center gap-1.5 transition cursor-pointer text-xs shadow-md shadow-rose-900/30"
          title="End Call"
        >
          <PhoneOff className="w-3.5 h-3.5" />
          <span>End</span>
        </button>
      </div>

      {/* Remote Audio Playback Elements for each participant */}
      {participants.map(p => p.stream ? (
        <audio
          key={`audio-player-${p.id}`}
          ref={el => {
            if (el && p.stream && el.srcObject !== p.stream) {
              el.srcObject = p.stream;
              el.play().catch(() => {});
            }
          }}
          autoPlay
          playsInline
          className="hidden"
        />
      ) : null)}
    </div>
  );
};
