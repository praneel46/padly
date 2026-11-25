import React, { useState, useEffect, useRef } from 'react';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, Maximize2,
  Minimize2, ExternalLink, Columns, GripHorizontal, Shield
} from 'lucide-react';
import { useCall } from '../../context/CallContext';

export const MiniCallWindow: React.FC = () => {
  const {
    callState,
    callMode,
    viewMode,
    setViewMode,
    isMicMuted,
    isVideoOff,
    toggleMic,
    toggleCamera,
    endCall,
    togglePictureInPicture,
    localStream,
    participants,
    userName,
    callDuration,
  } = useCall();

  // Position & Drag state
  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: window.innerWidth - 300,
    y: window.innerHeight - 200,
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Active display participant or self
  const primaryParticipant = participants.find(p => p.stream) || participants[0] || null;
  const isPeerVideo = !!primaryParticipant?.stream && !primaryParticipant.isVideoOff;
  const isLocalVideo = !!localStream && !isVideoOff;

  // Corner snap on mount or resize
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => ({
        x: Math.min(Math.max(16, prev.x), window.innerWidth - 300),
        y: Math.min(Math.max(16, prev.y), window.innerHeight - 200),
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Attach stream to video element
  useEffect(() => {
    if (!videoRef.current) return;
    if (primaryParticipant?.stream) {
      videoRef.current.srcObject = primaryParticipant.stream;
    } else if (localStream) {
      videoRef.current.srcObject = localStream;
    }
  }, [primaryParticipant?.stream, localStream]);

  // Pointer drag events with corner snapping
  const handlePointerDown = (e: React.PointerEvent) => {
    // Ignore button clicks
    if ((e.target as HTMLElement).closest('button')) return;

    setIsDragging(true);
    dragOffsetRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;

    const newX = e.clientX - dragOffsetRef.current.x;
    const newY = e.clientY - dragOffsetRef.current.y;

    // Clamped inside viewport
    const clampedX = Math.max(12, Math.min(window.innerWidth - 296, newX));
    const clampedY = Math.max(12, Math.min(window.innerHeight - 176, newY));

    setPosition({ x: clampedX, y: clampedY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    // Corner snapping
    const midX = window.innerWidth / 2;
    const midY = window.innerHeight / 2;
    const snapX = position.x < midX ? 24 : window.innerWidth - 304;
    const snapY = position.y < midY ? 80 : window.innerHeight - 196;

    setPosition({ x: snapX, y: snapY });
  };

  // Only render when call is active, mode is video, and viewMode is 'mini'
  if (callState === 'idle' || callMode !== 'video' || viewMode !== 'mini') {
    return null;
  }

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      ref={windowRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        touchAction: 'none',
      }}
      className={`fixed top-0 left-0 w-[280px] h-[160px] z-50 rounded-2xl overflow-hidden shadow-2xl border border-purple-500/30 bg-[#12101b] group select-none transition-shadow ${
        isDragging ? 'cursor-grabbing scale-102 shadow-purple-500/20' : 'cursor-grab'
      }`}
    >
      {/* Video stream or Avatar fallback */}
      {isPeerVideo || isLocalVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={!isPeerVideo} // Mute self video to avoid feedback
          className="w-full h-full object-cover bg-black"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#1a1528] to-[#0c0a14] p-4 text-center">
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white uppercase shadow-lg border-2 transition-all ${
              primaryParticipant?.isSpeaking
                ? 'border-emerald-400 ring-4 ring-emerald-500/40 animate-pulse'
                : 'border-purple-500/40'
            }`}
            style={{ backgroundColor: primaryParticipant?.color || '#7c3aed' }}
          >
            {(primaryParticipant?.name || userName).charAt(0)}
          </div>
          <span className="text-xs font-medium text-white/90 mt-2 truncate max-w-[200px]">
            {primaryParticipant?.name || userName}
          </span>
          <span className="text-[10px] text-white/40 font-mono mt-0.5">
            {formatDuration(callDuration)}
          </span>
        </div>
      )}

      {/* Top Drag Handle & Quick Actions */}
      <div className="absolute top-0 inset-x-0 p-2 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-1.5 text-white/70 text-[10px] font-mono px-2 py-0.5 rounded bg-black/50 backdrop-blur-sm">
          <GripHorizontal className="w-3 h-3" />
          <span>{formatDuration(callDuration)}</span>
        </div>

        <div className="flex items-center gap-1">
          {/* PiP Button */}
          <button
            onClick={() => togglePictureInPicture(videoRef.current)}
            className="p-1 rounded bg-black/60 hover:bg-white/20 text-white/80 hover:text-white transition"
            title="Picture-in-Picture (Pop out window)"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          {/* Dock to Side Panel */}
          <button
            onClick={() => setViewMode('docked')}
            className="p-1 rounded bg-black/60 hover:bg-white/20 text-white/80 hover:text-white transition"
            title="Dock call into side panel"
          >
            <Columns className="w-3.5 h-3.5" />
          </button>

          {/* Expand to Fullscreen Grid */}
          <button
            onClick={() => setViewMode('fullscreen')}
            className="p-1 rounded bg-black/60 hover:bg-white/20 text-white/80 hover:text-white transition"
            title="Expand to Fullscreen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Bottom Floating Hover Controls */}
      <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={toggleMic}
          className={`p-2 rounded-xl text-white transition ${
            isMicMuted ? 'bg-rose-600 hover:bg-rose-500' : 'bg-white/20 hover:bg-white/30'
          }`}
          title={isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          {isMicMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
        </button>

        <button
          onClick={toggleCamera}
          className={`p-2 rounded-xl text-white transition ${
            isVideoOff ? 'bg-rose-600 hover:bg-rose-500' : 'bg-white/20 hover:bg-white/30'
          }`}
          title={isVideoOff ? 'Turn camera on' : 'Turn camera off'}
        >
          {isVideoOff ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
        </button>

        <button
          onClick={endCall}
          className="p-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition shadow-lg shadow-rose-900/40"
          title="Leave Call"
        >
          <PhoneOff className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
