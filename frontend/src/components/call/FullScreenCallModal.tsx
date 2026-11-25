import React, { useRef, useEffect } from 'react';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, Minimize2,
  Columns, Share2, Subtitles, ExternalLink, Shield, Users
} from 'lucide-react';
import { useCall } from '../../context/CallContext';

export const FullScreenCallModal: React.FC = () => {
  const {
    code,
    callState,
    callMode,
    viewMode,
    setViewMode,
    isMicMuted,
    isVideoOff,
    isScreenSharing,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    toggleCaptions,
    captionsEnabled,
    activeCaption,
    endCall,
    togglePictureInPicture,
    localStream,
    screenStream,
    participants,
    userName,
    callDuration,
  } = useCall();

  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = isScreenSharing && screenStream ? screenStream : localStream;
    }
  }, [localStream, screenStream, isScreenSharing]);

  if (callState === 'idle' || viewMode !== 'fullscreen') {
    return null;
  }

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0B0914] flex flex-col animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-purple-900/30 bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 font-bold">
            #
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">
              Call Room #{code}
            </h2>
            <div className="flex items-center gap-2 text-xs text-white/50">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Connected • {formatDuration(callDuration)}</span>
            </div>
          </div>
        </div>

        {/* View Layout Switchers */}
        <div className="flex items-center gap-2">
          {/* PiP */}
          <button
            onClick={() => togglePictureInPicture(localVideoRef.current)}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-medium flex items-center gap-1.5 border border-white/10 transition cursor-pointer"
            title="Pop out video (Picture-in-Picture)"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Pop Out</span>
          </button>

          {/* Dock to Side */}
          <button
            onClick={() => setViewMode('docked')}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-medium flex items-center gap-1.5 border border-white/10 transition cursor-pointer"
            title="Dock to side panel"
          >
            <Columns className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dock</span>
          </button>

          {/* Minimize to Floating Window */}
          <button
            onClick={() => setViewMode('mini')}
            className="px-3 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 text-xs font-medium flex items-center gap-1.5 border border-purple-500/30 transition cursor-pointer"
            title="Minimize to floating window (keeps notepad visible)"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>Minimize</span>
          </button>
        </div>
      </div>

      {/* Main Video Grid */}
      <div className="flex-1 p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 items-center justify-center overflow-auto">
        {/* Local Participant Tile */}
        <div className="relative w-full h-full min-h-[260px] max-h-[500px] bg-[#141220] rounded-3xl overflow-hidden border border-purple-500/20 shadow-xl flex items-center justify-center">
          {localStream && !isVideoOff ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-purple-700 to-indigo-600 flex items-center justify-center text-2xl font-bold text-white shadow-xl">
                {userName.charAt(0)}
              </div>
              <span className="text-sm font-medium text-white/80">{userName} (You)</span>
            </div>
          )}

          {/* Badge */}
          <div className="absolute bottom-3 left-3 px-3 py-1 rounded-xl bg-black/60 backdrop-blur-md text-xs text-white/90 flex items-center gap-2 border border-white/10">
            <span>You</span>
            {isMicMuted && <MicOff className="w-3 h-3 text-rose-400" />}
          </div>
        </div>

        {/* Remote Participants */}
        {participants.length === 0 ? (
          <div className="relative w-full h-full min-h-[260px] max-h-[500px] bg-[#141220]/60 rounded-3xl border border-dashed border-white/10 flex flex-col items-center justify-center text-center p-6">
            <div className="w-16 h-16 rounded-full bg-purple-900/30 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-3">
              <Users className="w-8 h-8" />
            </div>
            <h3 className="text-base font-semibold text-white mb-1">Waiting for others to join...</h3>
            <p className="text-xs text-white/50 max-w-xs">
              Anyone with code #{code} can join your video room. Your call stays active while you work.
            </p>
          </div>
        ) : (
          participants.map(p => (
            <ParticipantVideoTile key={p.id} participant={p} />
          ))
        )}
      </div>

      {/* Live Captions Bar (if active) */}
      {captionsEnabled && activeCaption && (
        <div className="px-6 py-2 bg-black/70 backdrop-blur-md text-center text-xs text-purple-200 border-t border-purple-900/30">
          <span className="font-semibold text-purple-400">{activeCaption.speaker}: </span>
          <span>{activeCaption.text}</span>
        </div>
      )}

      {/* Bottom Floating Controls Bar */}
      <div className="py-4 px-6 flex items-center justify-center gap-3 bg-black/50 backdrop-blur-md border-t border-purple-900/30">
        {/* Mic */}
        <button
          onClick={toggleMic}
          className={`p-3.5 rounded-2xl transition cursor-pointer ${
            isMicMuted ? 'bg-rose-600 text-white' : 'bg-white/10 text-white hover:bg-white/20'
          }`}
          title={isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Camera */}
        <button
          onClick={toggleCamera}
          className={`p-3.5 rounded-2xl transition cursor-pointer ${
            isVideoOff ? 'bg-rose-600 text-white' : 'bg-white/10 text-white hover:bg-white/20'
          }`}
          title={isVideoOff ? 'Turn camera on' : 'Turn camera off'}
        >
          {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
        </button>

        {/* Screen Share */}
        <button
          onClick={toggleScreenShare}
          className={`p-3.5 rounded-2xl transition cursor-pointer ${
            isScreenSharing ? 'bg-purple-600 text-white' : 'bg-white/10 text-white hover:bg-white/20'
          }`}
          title={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
        >
          <Share2 className="w-5 h-5" />
        </button>

        {/* Captions */}
        <button
          onClick={toggleCaptions}
          className={`p-3.5 rounded-2xl transition cursor-pointer ${
            captionsEnabled ? 'bg-purple-600 text-white' : 'bg-white/10 text-white hover:bg-white/20'
          }`}
          title="Toggle live captions"
        >
          <Subtitles className="w-5 h-5" />
        </button>

        {/* End Call */}
        <button
          onClick={endCall}
          className="px-6 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-medium flex items-center gap-2 transition cursor-pointer shadow-lg shadow-rose-900/40"
          title="End Call"
        >
          <PhoneOff className="w-5 h-5" />
          <span>Leave</span>
        </button>
      </div>
    </div>
  );
};

const ParticipantVideoTile: React.FC<{ participant: any }> = ({ participant }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
    }
  }, [participant.stream]);

  const hasVideo = !!participant.stream && !participant.isVideoOff;

  return (
    <div className="relative w-full h-full min-h-[260px] max-h-[500px] bg-[#141220] rounded-3xl overflow-hidden border border-purple-500/20 shadow-xl flex items-center justify-center">
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-xl border-2 transition-all ${
              participant.isSpeaking ? 'border-emerald-400 ring-4 ring-emerald-500/40' : 'border-purple-500/30'
            }`}
            style={{ backgroundColor: participant.color || '#6366f1' }}
          >
            {participant.name.charAt(0)}
          </div>
          <span className="text-sm font-medium text-white/80">{participant.name}</span>
        </div>
      )}

      {/* Participant Name Badge */}
      <div className="absolute bottom-3 left-3 px-3 py-1 rounded-xl bg-black/60 backdrop-blur-md text-xs text-white/90 flex items-center gap-2 border border-white/10">
        <span>{participant.name}</span>
        {participant.isMuted && <MicOff className="w-3 h-3 text-rose-400" />}
      </div>
    </div>
  );
};
