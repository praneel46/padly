import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, X, Music, Disc } from 'lucide-react';

export interface AudioTrack {
  id: string;
  name: string;
  url: string;
  size?: number;
}

interface MusicPlayerProps {
  playlist: AudioTrack[];
  currentTrackIndex: number;
  onTrackChange: (index: number) => void;
  onClose: () => void;
}

export const MusicPlayer: React.FC<MusicPlayerProps> = ({
  playlist,
  currentTrackIndex,
  onTrackChange,
  onClose
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const currentTrack = playlist[currentTrackIndex];

  useEffect(() => {
    if (audioRef.current && currentTrack) {
      audioRef.current.src = currentTrack.url;
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  }, [currentTrack]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true));
    }
  };

  const handleNext = () => {
    if (playlist.length === 0) return;
    const nextIdx = (currentTrackIndex + 1) % playlist.length;
    onTrackChange(nextIdx);
  };

  const handlePrev = () => {
    if (playlist.length === 0) return;
    const prevIdx = (currentTrackIndex - 1 + playlist.length) % playlist.length;
    onTrackChange(prevIdx);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const mins = Math.floor(secs / 60);
    const rem = Math.floor(secs % 60);
    return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
  };

  if (!currentTrack) return null;

  return (
    <div
      className={`fixed bottom-5 right-5 z-40 bg-[#161616]/95 backdrop-blur-xl border border-purple-500/30 rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.8)] transition-all duration-300 ${
        isMinimized ? 'p-2.5 max-w-[200px]' : 'p-4 max-w-sm w-full'
      }`}
    >
      <audio
        ref={audioRef}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={handleNext}
      />

      {isMinimized ? (
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => setIsMinimized(false)}
            className="flex items-center gap-2 text-xs text-purple-300 truncate"
          >
            <Disc className={`w-4 h-4 text-purple-400 ${isPlaying ? 'animate-spin' : ''}`} />
            <span className="truncate max-w-[100px]">{currentTrack.name}</span>
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={togglePlay}
              className="p-1 rounded-full bg-purple-600/30 text-white hover:bg-purple-600/50"
            >
              {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </button>
            <button onClick={onClose} className="p-1 text-[#646973] hover:text-white">
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      ) : (
        <div>
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-purple-900/40 text-purple-400">
                <Music className="w-4 h-4" />
              </span>
              <div>
                <p className="text-xs text-[#646973] uppercase tracking-wider font-semibold">Now Playing</p>
                <p className="text-xs sm:text-sm font-medium text-white truncate max-w-[180px]">
                  {currentTrack.name}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(true)}
                className="text-xs text-[#646973] hover:text-white px-1.5 py-0.5 rounded"
                title="Minimize"
              >
                _
              </button>
              <button
                onClick={onClose}
                className="text-[#646973] hover:text-white p-1 rounded"
                title="Close Player"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Progress Slider */}
          <div className="my-2">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={(e) => {
                const newTime = Number(e.target.value);
                setCurrentTime(newTime);
                if (audioRef.current) audioRef.current.currentTime = newTime;
              }}
              className="w-full h-1 bg-[#262626] rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <div className="flex justify-between text-[10px] text-[#646973] mt-1 font-mono">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrev}
                className="p-1.5 rounded-full hover:bg-white/10 text-[#D7E2EA]"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                onClick={togglePlay}
                className="p-2.5 rounded-full glow-btn text-white"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button
                onClick={handleNext}
                className="p-1.5 rounded-full hover:bg-white/10 text-[#D7E2EA]"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  const muted = !isMuted;
                  setIsMuted(muted);
                  if (audioRef.current) audioRef.current.muted = muted;
                }}
                className="p-1 text-[#646973] hover:text-[#D7E2EA]"
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setVolume(val);
                  setIsMuted(false);
                  if (audioRef.current) {
                    audioRef.current.volume = val;
                    audioRef.current.muted = false;
                  }
                }}
                className="w-16 h-1 bg-[#262626] rounded appearance-none accent-purple-500 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
