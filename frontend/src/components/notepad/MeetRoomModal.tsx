import React, { useState, useEffect, useRef } from 'react';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, ScreenShare,
  Subtitles, Users, Maximize2, Minimize2, Sparkles,
  Copy, Check, Volume2, MonitorUp
} from 'lucide-react';

export interface Participant {
  id: string;
  name: string;
  color: string;
  isMuted: boolean;
  isVideoOff: boolean;
  isSpeaking: boolean;
  stream?: MediaStream | null;
  isScreenSharing?: boolean;
}

interface MeetRoomModalProps {
  code: string;
  clientId: string;
  userName: string;
  isOpen: boolean;
  onClose: () => void;
  ws: WebSocket | null;
  onSendChatMessage: (text: string) => void;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

// Component for Individual Video Tile with Automatic Stream Attachment
const VideoTile: React.FC<{
  participant: Participant;
  isLocal: boolean;
  isDominant?: boolean;
}> = ({ participant, isLocal, isDominant = false }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      if (videoRef.current.srcObject !== participant.stream) {
        videoRef.current.srcObject = participant.stream;
      }
      videoRef.current.play().catch(() => {});
    }
  }, [participant.stream, participant.isVideoOff]);

  return (
    <div
      className={`relative w-full h-full min-h-[220px] bg-[#141414] rounded-3xl overflow-hidden flex items-center justify-center shadow-xl transition-all duration-300 ${
        participant.isSpeaking
          ? 'border-2 border-emerald-400 shadow-[0_0_25px_rgba(52,211,153,0.4)]'
          : 'border-2 border-[#262626] hover:border-purple-500/50'
      } ${isDominant ? 'max-h-[80vh]' : 'max-h-[460px]'}`}
    >
      {/* Video Element - kept permanently mounted so streams remain connected */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal} // Mute local preview to prevent audio echo
        className={`w-full h-full object-cover ${participant.isVideoOff || !participant.stream ? 'hidden' : 'block'}`}
      />

      {/* Avatar when Camera is Turned Off */}
      {(participant.isVideoOff || !participant.stream) && (
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-2xl transition-transform"
            style={{ backgroundColor: participant.color || '#7621B0' }}
          >
            {participant.name.charAt(0).toUpperCase()}
          </div>
          <span className="text-xs text-[#646973] font-medium">
            {participant.isVideoOff ? 'Camera is off' : 'Audio Only'}
          </span>
        </div>
      )}

      {/* Participant Name Badge & Status */}
      <div className="absolute bottom-3 left-3 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 text-xs text-white font-medium border border-white/10 z-10">
        <span
          className={`w-2 h-2 rounded-full ${
            participant.isSpeaking ? 'bg-emerald-400 animate-ping' : 'bg-emerald-400'
          }`}
        />
        <span className="truncate max-w-[140px]">{participant.name}</span>
        {participant.isMuted && (
          <span className="p-0.5 rounded bg-rose-950/80 text-rose-400" title="Microphone Muted">
            <MicOff className="w-3 h-3" />
          </span>
        )}
      </div>

      {/* Speaking Indicator Badge */}
      {participant.isSpeaking && (
        <div className="absolute top-3 right-3 bg-emerald-500/90 text-black px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-lg animate-pulse z-10">
          <Volume2 className="w-3 h-3" /> Speaking
        </div>
      )}
    </div>
  );
};

export const MeetRoomModal: React.FC<MeetRoomModalProps> = ({
  code,
  clientId,
  userName,
  isOpen,
  onClose,
  ws,
  onSendChatMessage,
}) => {
  // Local Media State
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isMicMuted, setIsMicMuted] = useState<boolean>(false);
  const [isVideoOff, setIsVideoOff] = useState<boolean>(false);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);

  // Live Captions
  const [captionsEnabled, setCaptionsEnabled] = useState<boolean>(false);
  const [activeCaption, setActiveCaption] = useState<{ speaker: string; text: string } | null>(null);
  const recognitionRef = useRef<any>(null);

  // Participants in Meet
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // WebRTC Mesh Peer Connections: Map<peerClientId, RTCPeerConnection>
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const localAudioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // 1. Initialize Local Stream & Join Meet Room
  useEffect(() => {
    if (!isOpen) {
      cleanupMeetSession();
      return;
    }

    startMeetSession();
    timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);

    return () => {
      cleanupMeetSession();
    };
  }, [isOpen]);

  const cleanupMeetSession = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (localAudioContextRef.current) {
      try {
        localAudioContextRef.current.close();
      } catch (e) {}
    }

    setCallDuration(0);

    // Close and cleanup all peer connections
    peerConnectionsRef.current.forEach((pc) => {
      try {
        pc.close();
      } catch (e) {}
    });
    peerConnectionsRef.current.clear();

    // Notify peers that this client left the meet
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'call_signal',
        signalType: 'meet_leave',
        from: clientId
      }));
    }

    // Stop all local tracks
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
      setLocalStream(null);
    }
    if (screenStream) {
      screenStream.getTracks().forEach(t => t.stop());
      setScreenStream(null);
      setIsScreenSharing(false);
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    setParticipants([]);
  };

  const startMeetSession = async () => {
    let stream: MediaStream;

    try {
      try {
        // High quality camera constraints (720p / 1080p, 30fps)
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
            facingMode: 'user'
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
      } catch (hdErr) {
        // Fallback to standard constraints
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
      }
    } catch (err) {
      console.warn('Camera/Microphone permission unavailable, using continuous animated stream fallback:', err);
      // High-performance continuous 30fps animated canvas stream
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');

      let frame = 0;
      const render = () => {
        if (!ctx) return;
        frame++;
        const grad = ctx.createLinearGradient(0, 0, 640, 480);
        grad.addColorStop(0, '#130c24');
        grad.addColorStop(1, '#2e1065');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 640, 480);

        // Animated pulse
        const pulse = Math.sin(frame * 0.08) * 12;
        ctx.beginPath();
        ctx.arc(320, 210, 55 + pulse, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(168, 85, 247, 0.25)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(320, 210, 44, 0, Math.PI * 2);
        ctx.fillStyle = '#9333ea';
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 28px Kanit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(userName.charAt(0).toUpperCase() || 'U', 320, 220);

        ctx.font = '15px Kanit, sans-serif';
        ctx.fillStyle = '#e9d5ff';
        ctx.fillText(`${userName} (Live Video)`, 320, 300);

        requestAnimationFrame(render);
      };
      render();

      stream = (canvas as any).captureStream ? (canvas as any).captureStream(30) : new MediaStream();
    }

    setLocalStream(stream);

    // Initialize local participant
    const selfParticipant: Participant = {
      id: clientId,
      name: `${userName} (You)`,
      color: '#B600A8',
      isMuted: false,
      isVideoOff: false,
      isSpeaking: false,
      stream: stream,
    };

    setParticipants([selfParticipant]);

    // Setup audio activity monitor
    setupAudioActivityMonitor(stream, clientId);

    // Announce to all room peers that we joined the meet
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'call_signal',
        signalType: 'meet_join',
        from: clientId,
        fromName: userName,
        fromColor: '#B600A8'
      }));
    }
  };

  // Audio Activity Detector for Live Speaking Indicator
  const setupAudioActivityMonitor = (audioStream: MediaStream, targetParticipantId: string) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      localAudioContextRef.current = audioCtx;

      const audioTrack = audioStream.getAudioTracks()[0];
      if (!audioTrack) return;

      const source = audioCtx.createMediaStreamSource(audioStream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        const speaking = avg > 20;

        setParticipants(prev =>
          prev.map(p => (p.id === targetParticipantId ? { ...p, isSpeaking: speaking } : p))
        );

        animationFrameRef.current = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (e) {
      console.warn('Audio monitor not supported:', e);
    }
  };

  // Create WebRTC PeerConnection for a specific remote peer
  const createPeerConnection = (peerId: string, peerName: string, peerColor: string): RTCPeerConnection => {
    // If connection exists, reuse or close
    if (peerConnectionsRef.current.has(peerId)) {
      try {
        peerConnectionsRef.current.get(peerId)?.close();
      } catch (e) {}
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionsRef.current.set(peerId, pc);

    // Add local media tracks
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }

    // Handle remote media track arrival
    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      setParticipants(prev => {
        const exists = prev.some(p => p.id === peerId);
        if (exists) {
          return prev.map(p => (p.id === peerId ? { ...p, stream: remoteStream } : p));
        } else {
          return [
            ...prev,
            {
              id: peerId,
              name: peerName || 'Friend',
              color: peerColor || '#7621B0',
              isMuted: false,
              isVideoOff: false,
              isSpeaking: false,
              stream: remoteStream,
            }
          ];
        }
      });
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'call_signal',
          signalType: 'meet_ice',
          targetId: peerId,
          from: clientId,
          data: event.candidate
        }));
      }
    };

    return pc;
  };

  // 2. Handle Incoming WebRTC Signaling Messages
  useEffect(() => {
    if (!ws) return;

    const handleWsMsg = async (e: MessageEvent) => {
      try {
        const msg = JSON.parse(e.data);

        // A. Live Speech Caption
        if (msg.type === 'caption_message') {
          setActiveCaption({
            speaker: msg.fromName || 'Peer',
            text: msg.text
          });
          setTimeout(() => setActiveCaption(null), 4500);
        }

        // B. WebRTC Signals
        else if (msg.type === 'call_signal') {
          const { signalType, from, fromName, fromColor, targetId, data } = msg;

          // Ignore our own broadcasted signals
          if (from === clientId) return;

          // If signal is targeted and not meant for us, ignore
          if (targetId && targetId !== clientId) return;

          // 1. Peer joined meet room -> Existing peer initiates offer
          if (signalType === 'meet_join') {
            const pc = createPeerConnection(from, fromName, fromColor);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            ws.send(JSON.stringify({
              type: 'call_signal',
              signalType: 'meet_offer',
              targetId: from,
              from: clientId,
              fromName: userName,
              fromColor: '#B600A8',
              data: offer
            }));
          }

          // 2. Incoming Offer -> New peer sets remote description and sends answer
          else if (signalType === 'meet_offer') {
            const pc = createPeerConnection(from, fromName, fromColor);
            await pc.setRemoteDescription(new RTCSessionDescription(data));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            ws.send(JSON.stringify({
              type: 'call_signal',
              signalType: 'meet_answer',
              targetId: from,
              from: clientId,
              data: answer
            }));
          }

          // 3. Incoming Answer -> Complete peer connection handshake
          else if (signalType === 'meet_answer') {
            const pc = peerConnectionsRef.current.get(from);
            if (pc) {
              await pc.setRemoteDescription(new RTCSessionDescription(data));
            }
          }

          // 4. Incoming ICE Candidate
          else if (signalType === 'meet_ice') {
            const pc = peerConnectionsRef.current.get(from);
            if (pc && data) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(data));
              } catch (iceErr) {
                console.error('Add ICE candidate failed:', iceErr);
              }
            }
          }

          // 5. Peer Left Meet
          else if (signalType === 'meet_leave') {
            const pc = peerConnectionsRef.current.get(from);
            if (pc) {
              pc.close();
              peerConnectionsRef.current.delete(from);
            }
            setParticipants(prev => prev.filter(p => p.id !== from));
          }
        }
      } catch (err) {
        console.error('Meet signaling parse error:', err);
      }
    };

    ws.addEventListener('message', handleWsMsg);
    return () => ws.removeEventListener('message', handleWsMsg);
  }, [ws, clientId, userName, localStream]);

  // 3. Screen Sharing (Laptop & Mobile with Live Track Replacement)
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Stop screen sharing and revert back to camera video track
      if (screenStream) {
        screenStream.getTracks().forEach(t => t.stop());
        setScreenStream(null);
      }
      setIsScreenSharing(false);

      if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
          peerConnectionsRef.current.forEach(pc => {
            const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
            if (sender) sender.replaceTrack(videoTrack);
          });
        }
      }
    } else {
      try {
        const sStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });

        setScreenStream(sStream);
        setIsScreenSharing(true);

        if (screenVideoRef.current) {
          screenVideoRef.current.srcObject = sStream;
        }

        const screenVideoTrack = sStream.getVideoTracks()[0];

        // Replace outgoing video track on all peer connections
        peerConnectionsRef.current.forEach(pc => {
          const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
          if (sender && screenVideoTrack) {
            sender.replaceTrack(screenVideoTrack);
          }
        });

        // When user stops sharing via browser UI
        screenVideoTrack.onended = () => {
          setIsScreenSharing(false);
          setScreenStream(null);
          if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
              peerConnectionsRef.current.forEach(pc => {
                const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
                if (sender) sender.replaceTrack(videoTrack);
              });
            }
          }
        };
      } catch (err) {
        console.warn('Screen share cancelled or not allowed:', err);
      }
    }
  };

  // 4. Live Speech Recognition (Captions / CC)
  const toggleCaptions = () => {
    const nextState = !captionsEnabled;
    setCaptionsEnabled(nextState);

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (nextState && SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          const current = event.resultIndex;
          const transcript = event.results[current][0].transcript;
          setActiveCaption({
            speaker: `${userName} (You)`,
            text: transcript
          });

          // Broadcast live caption to all peers in room
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'caption_message',
              fromName: userName,
              text: transcript
            }));
          }
        };

        recognition.onerror = (e: any) => {
          console.warn('Speech recognition status:', e);
        };

        recognition.start();
        recognitionRef.current = recognition;
      } catch (e) {
        console.warn('Speech recognition error:', e);
      }
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      setActiveCaption(null);
    }
  };

  const copyMeetLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed z-50 transition-all duration-300 select-none font-kanit ${
        isMinimized
          ? 'bottom-6 left-6 w-96 h-64 bg-[#141414] border-2 border-purple-500 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] p-3 flex flex-col justify-between overflow-hidden'
          : 'inset-0 bg-black/92 backdrop-blur-2xl flex flex-col justify-between p-4 sm:p-6 md:p-8'
      }`}
    >
      {/* ============================================================ */}
      {/* 1. MEET TOP BAR */}
      {/* ============================================================ */}
      <div className="flex items-center justify-between pb-3 border-b border-[#262626] z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#0C0C0C] px-3.5 py-1.5 rounded-full border border-purple-500/30">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-white">
              Padly Meet #{code}
            </span>
          </div>

          <span className="text-xs text-[#646973] font-mono font-medium hidden sm:inline">
            {formatTimer(callDuration)}
          </span>

          <button
            onClick={copyMeetLink}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 text-xs text-[#D7E2EA] transition cursor-pointer"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'Link Copied' : 'Invite Link'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Maximize / Minimize button */}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#646973] hover:text-white transition cursor-pointer"
            title={isMinimized ? 'Expand to Full Meet' : 'Minimize to Floating Window'}
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white transition cursor-pointer"
            title="Leave Meet"
          >
            <PhoneOff className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. MAIN VIDEO STAGE / GRID (GOOGLE MEET & ZOOM STYLE) */}
      {/* ============================================================ */}
      <div className="flex-1 my-4 flex flex-col justify-center overflow-hidden relative">
        {/* If Screen Sharing is Active -> Show Dominant Screen Stage */}
        {isScreenSharing && screenStream ? (
          <div className="flex-1 flex flex-col lg:flex-row gap-4 h-full overflow-hidden">
            {/* Main Screen Presentation */}
            <div className="flex-1 bg-[#0C0C0C] border border-[#262626] rounded-3xl overflow-hidden relative flex items-center justify-center">
              <video
                ref={screenVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-contain"
              />
              <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs text-white flex items-center gap-2 border border-purple-500/40">
                <MonitorUp className="w-4 h-4 text-purple-400" />
                <span>You are presenting your screen</span>
              </div>
            </div>

            {/* Participant Side Strip */}
            <div className="w-full lg:w-72 flex lg:flex-col gap-3 overflow-auto">
              {participants.map((p) => (
                <div key={p.id} className="h-32 w-48 lg:w-full flex-shrink-0">
                  <VideoTile participant={p} isLocal={p.id === clientId} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Standard Multi-Person Video Grid (Every Face Visible) */
          <div
            className={`w-full h-full grid gap-4 items-center justify-center ${
              participants.length <= 1
                ? 'grid-cols-1 max-w-3xl mx-auto'
                : participants.length === 2
                ? 'grid-cols-1 sm:grid-cols-2 max-w-5xl mx-auto'
                : participants.length <= 4
                ? 'grid-cols-2 max-w-5xl mx-auto'
                : 'grid-cols-2 sm:grid-cols-3 max-w-6xl mx-auto'
            }`}
          >
            {participants.map((p) => (
              <VideoTile
                key={p.id}
                participant={p}
                isLocal={p.id === clientId}
              />
            ))}
          </div>
        )}

        {/* Live Captions Display Bar (Like Google Meet CC) */}
        {captionsEnabled && activeCaption && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 max-w-xl w-full bg-black/85 backdrop-blur-md border border-purple-500/40 rounded-2xl px-5 py-3 text-center text-sm text-white shadow-2xl animate-fade-in z-30">
            <span className="font-bold text-purple-400 mr-2">{activeCaption.speaker}:</span>
            <span className="font-medium text-[#D7E2EA]">{activeCaption.text}</span>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 3. MEET BOTTOM CONTROLS BAR (GOOGLE MEET / ZOOM STYLE) */}
      {/* ============================================================ */}
      <div className="flex items-center justify-center gap-3 sm:gap-4 pt-3 border-t border-[#262626] z-10 flex-wrap">
        {/* 1. Mic Mute / Unmute */}
        <button
          onClick={() => {
            const muted = !isMicMuted;
            setIsMicMuted(muted);
            if (localStream) {
              localStream.getAudioTracks().forEach(t => (t.enabled = !muted));
            }
            setParticipants(prev =>
              prev.map(p => (p.id === clientId ? { ...p, isMuted: muted } : p))
            );
          }}
          className={`p-3.5 rounded-full cursor-pointer transition shadow-lg flex items-center justify-center ${
            isMicMuted ? 'bg-rose-600 text-white' : 'bg-[#222222] hover:bg-[#2e2e2e] text-white'
          }`}
          title={isMicMuted ? 'Unmute Microphone' : 'Mute Microphone'}
        >
          {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* 2. Video Camera On / Off */}
        <button
          onClick={() => {
            const videoOff = !isVideoOff;
            setIsVideoOff(videoOff);
            if (localStream) {
              localStream.getVideoTracks().forEach(t => (t.enabled = !videoOff));
            }
            setParticipants(prev =>
              prev.map(p => (p.id === clientId ? { ...p, isVideoOff: videoOff } : p))
            );
          }}
          className={`p-3.5 rounded-full cursor-pointer transition shadow-lg flex items-center justify-center ${
            isVideoOff ? 'bg-rose-600 text-white' : 'bg-[#222222] hover:bg-[#2e2e2e] text-white'
          }`}
          title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
        >
          {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
        </button>

        {/* 3. Screen Share (Laptop & Mobile) */}
        <button
          onClick={toggleScreenShare}
          className={`px-4 py-3 rounded-full cursor-pointer transition shadow-lg flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${
            isScreenSharing
              ? 'bg-purple-600 text-white shadow-[0_0_20px_rgba(118,33,176,0.6)]'
              : 'bg-[#222222] hover:bg-[#2e2e2e] text-[#D7E2EA] hover:text-white'
          }`}
          title="Share Laptop or Mobile Screen"
        >
          <ScreenShare className="w-4 h-4" />
          <span className="hidden sm:inline">{isScreenSharing ? 'Stop Presenting' : 'Share Screen'}</span>
        </button>

        {/* 4. Live Captions (CC) */}
        <button
          onClick={toggleCaptions}
          className={`px-4 py-3 rounded-full cursor-pointer transition shadow-lg flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${
            captionsEnabled
              ? 'bg-purple-600 text-white shadow-[0_0_20px_rgba(118,33,176,0.6)]'
              : 'bg-[#222222] hover:bg-[#2e2e2e] text-[#D7E2EA] hover:text-white'
          }`}
          title="Toggle Live Speech-to-Text Captions"
        >
          <Subtitles className="w-4 h-4" />
          <span className="hidden sm:inline">Captions (CC)</span>
        </button>

        {/* 5. End Call / Leave Meet */}
        <button
          onClick={onClose}
          className="p-3.5 px-6 rounded-full bg-rose-600 hover:bg-rose-500 text-white cursor-pointer shadow-xl flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition"
          title="Leave Meet"
        >
          <PhoneOff className="w-5 h-5" />
          <span className="hidden sm:inline">Leave Meet</span>
        </button>
      </div>
    </div>
  );
};
