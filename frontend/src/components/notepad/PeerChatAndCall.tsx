import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare, Video, Phone, PhoneOff, Mic, MicOff, VideoOff,
  Send, Users, X, Maximize2, Sparkles, Smile, Shield,
  Volume2, Radio, Check
} from 'lucide-react';
import { getApiUrl } from '../../lib/api';

export interface ChatMessage {
  id: string;
  page_code: string;
  sender_id: string;
  sender_name: string;
  color: string;
  text: string;
  timestamp: number;
}

interface PeerChatAndCallProps {
  code: string;
  clientId: string;
  ws: WebSocket | null;
  presenceCount: number;
  isOpen: boolean;
  onToggleOpen: () => void;
  onOpenMeet?: () => void;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export const PeerChatAndCall: React.FC<PeerChatAndCallProps> = ({
  code,
  clientId,
  ws,
  presenceCount,
  isOpen,
  onToggleOpen,
  onOpenMeet,
}) => {
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [userName, setUserName] = useState<string>('Me');
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Call state: 'idle' | 'calling' | 'incoming' | 'connected'
  const [callState, setCallState] = useState<'idle' | 'calling' | 'incoming' | 'connected'>('idle');
  const [callMode, setCallMode] = useState<'video' | 'audio'>('audio');
  const [callerName, setCallerName] = useState<string>('Friend');
  const [isMicMuted, setIsMicMuted] = useState<boolean>(false);
  const [isVideoMuted, setIsVideoMuted] = useState<boolean>(false);
  const [callDuration, setCallDuration] = useState<number>(0);

  // Streams in state to trigger reliable video re-attachment
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  // WebRTC refs
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const iceCandidateQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Load chat history
  useEffect(() => {
    fetch(getApiUrl(`/api/pages/${encodeURIComponent(code)}/chats`))
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setMessages(data);
      })
      .catch(console.error);
  }, [code]);

  // Handle incoming WS messages for Chat and WebRTC signals
  useEffect(() => {
    if (!ws) return;

    const handleMessage = async (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);

        // Chat messages
        if (msg.type === 'chat_message') {
          setMessages(prev => [...prev, msg.message]);
          if (!isOpen) {
            setUnreadCount(c => c + 1);
          }
          setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
        } else if (msg.type === 'chat_history') {
          if (Array.isArray(msg.messages)) {
            setMessages(msg.messages);
          }
        }
        // WebRTC Signaling
        else if (msg.type === 'call_signal') {
          handleCallSignal(msg);
        }
      } catch (e) {
        console.error('WS signal error:', e);
      }
    };

    ws.addEventListener('message', handleMessage);
    return () => {
      ws.removeEventListener('message', handleMessage);
    };
  }, [ws, isOpen]);

  // WebRTC Signaling dispatcher
  const handleCallSignal = async (msg: any) => {
    const { signalType, from, fromName, callMode: incomingMode, data } = msg;

    if (signalType === 'call_request') {
      setCallerName(fromName || 'Friend');
      setCallMode(incomingMode || 'audio');
      setCallState('incoming');
    } else if (signalType === 'call_reject') {
      endCall();
    } else if (signalType === 'call_end') {
      endCall();
    } else if (signalType === 'call_accept') {
      setCallState('connected');
      startCallTimer();
      await initiatePeerOffer();
    } else if (signalType === 'switch_video') {
      setCallMode('video');
      await setupLocalStream(true);
    } else if (signalType === 'offer') {
      await handleIncomingOffer(data);
    } else if (signalType === 'answer') {
      if (pcRef.current) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(data));
        while (iceCandidateQueueRef.current.length > 0) {
          const c = iceCandidateQueueRef.current.shift();
          if (c && pcRef.current) {
            try {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(c));
            } catch (e) {}
          }
        }
      }
    } else if (signalType === 'candidate') {
      if (pcRef.current && pcRef.current.remoteDescription && pcRef.current.remoteDescription.type) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(data));
        } catch (e) {
          console.error('Add ICE Candidate error', e);
        }
      } else {
        iceCandidateQueueRef.current.push(data);
      }
    }
  };

  // Start outgoing call
  const startCall = (mode: 'video' | 'audio') => {
    setCallMode(mode);
    setCallState('calling');

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'call_signal',
        signalType: 'call_request',
        callMode: mode,
        fromName: userName
      }));
    }
  };

  // Accept incoming call
  const acceptCall = async () => {
    setCallState('connected');
    startCallTimer();

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'call_signal',
        signalType: 'call_accept',
        callMode,
        fromName: userName
      }));
    }

    await setupLocalStream(callMode === 'video');
  };

  // Decline incoming call
  const declineCall = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'call_signal',
        signalType: 'call_reject'
      }));
    }
    setCallState('idle');
  };

  // End active call
  const endCall = () => {
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    setCallDuration(0);

    // Stop streams
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach(t => t.stop());
      remoteStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    if (ws && ws.readyState === WebSocket.OPEN && callState !== 'idle') {
      ws.send(JSON.stringify({
        type: 'call_signal',
        signalType: 'call_end'
      }));
    }

    setCallState('idle');
  };

  const startCallTimer = () => {
    setCallDuration(0);
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    callTimerRef.current = setInterval(() => {
      setCallDuration(d => d + 1);
    }, 1000);
  };

  // Initialize WebRTC PeerConnection
  const createPeerConnection = () => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'call_signal',
          signalType: 'candidate',
          data: e.candidate
        }));
      }
    };

    pc.ontrack = (e) => {
      if (e.streams && e.streams[0]) {
        remoteStreamRef.current = e.streams[0];
        setRemoteStream(e.streams[0]);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = e.streams[0];
          remoteVideoRef.current.play().catch(() => {});
        }
      }
    };

    return pc;
  };

  // Setup Local Media with HD constraints & active canvas fallback
  const setupLocalStream = async (withVideo: boolean) => {
    try {
      let stream: MediaStream;
      try {
        // High quality camera constraints (720p / 1080p, 30fps)
        stream = await navigator.mediaDevices.getUserMedia({
          video: withVideo ? {
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
            facingMode: 'user',
            frameRate: { ideal: 30 }
          } : false,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
      } catch (hdErr) {
        // Fallback to standard device constraints
        stream = await navigator.mediaDevices.getUserMedia({
          video: withVideo,
          audio: true
        });
      }

      localStreamRef.current = stream;
      setLocalStream(stream);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(() => {});
      }
      return stream;
    } catch (err) {
      console.warn('Microphone/Camera permission not available, starting animated interactive fallback:', err);
      // High-performance continuous 30fps animated canvas stream (NEVER displays black)
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

        // Pulsing circle
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
        ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(userName.charAt(0).toUpperCase() || 'U', 320, 220);

        ctx.font = '15px sans-serif';
        ctx.fillStyle = '#e9d5ff';
        ctx.fillText(`${userName} (Live Video)`, 320, 300);

        requestAnimationFrame(render);
      };
      render();

      const stream = (canvas as any).captureStream ? (canvas as any).captureStream(30) : new MediaStream();
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    }
  };

  const initiatePeerOffer = async () => {
    const pc = createPeerConnection();
    const stream = await setupLocalStream(callMode === 'video');

    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'call_signal',
        signalType: 'offer',
        data: offer
      }));
    }
  };

  const handleIncomingOffer = async (offerData: any) => {
    const pc = createPeerConnection();
    const stream = localStreamRef.current || (await setupLocalStream(callMode === 'video'));

    stream.getTracks().forEach(track => {
      const senders = pc.getSenders();
      if (!senders.some(s => s.track === track)) {
        pc.addTrack(track, stream);
      }
    });

    await pc.setRemoteDescription(new RTCSessionDescription(offerData));

    while (iceCandidateQueueRef.current.length > 0) {
      const c = iceCandidateQueueRef.current.shift();
      if (c) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(c));
        } catch (e) {}
      }
    }

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'call_signal',
        signalType: 'answer',
        data: answer
      }));
    }
  };

  // Switch voice call to video call on the fly
  const switchToVideo = async () => {
    setCallMode('video');
    const stream = await setupLocalStream(true);

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'call_signal',
        signalType: 'switch_video',
        fromName: userName
      }));
    }

    if (pcRef.current) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const senders = pcRef.current.getSenders();
        const videoSender = senders.find(s => s.track?.kind === 'video');
        if (videoSender) {
          videoSender.replaceTrack(videoTrack);
        } else {
          pcRef.current.addTrack(videoTrack, stream);
          const offer = await pcRef.current.createOffer();
          await pcRef.current.setLocalDescription(offer);
          ws?.send(JSON.stringify({
            type: 'call_signal',
            signalType: 'offer',
            data: offer
          }));
        }
      }
    }
  };

  // Send Chat message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !ws || ws.readyState !== WebSocket.OPEN) return;

    ws.send(JSON.stringify({
      type: 'chat_message',
      text: inputText.trim(),
      senderName: userName
    }));

    setInputText('');
  };

  const formatCallTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <>
      {isOpen ? (
        <aside className="w-80 sm:w-96 bg-[#121212] border-l border-[#242424] flex flex-col h-full z-20 flex-shrink-0 select-none shadow-2xl">
          {/* ============================================================ */}
          {/* 1. REDESIGNED CLEAN SIDEBAR HEADER */}
          {/* ============================================================ */}
          <div className="p-3.5 border-b border-[#242424] bg-[#141414] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/20">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                  Synchronized Chat
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </h3>
                <p className="text-[10px] text-[#646973] font-mono">
                  Room #{code} • {presenceCount} online
                </p>
              </div>
            </div>

            {/* Quick Action Buttons in Header */}
            <div className="flex items-center gap-1.5">
              {callState === 'idle' && (
                <>
                  <button
                    onClick={() => startCall('audio')}
                    className="p-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 hover:text-white transition cursor-pointer"
                    title="Start Voice Call"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (onOpenMeet) onOpenMeet();
                      else startCall('video');
                    }}
                    className="p-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 hover:text-white transition cursor-pointer"
                    title="Start Video Call (Google Meet Style)"
                  >
                    <Video className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
              <button
                onClick={onToggleOpen}
                className="p-2 text-[#646973] hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
                title="Collapse Panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ============================================================ */}
          {/* 2. INLINE CALL CARD AT TOP OF CHAT (REDESIGNED UPPER SPACE) */}
          {/* ============================================================ */}

          {/* A. When Idle -> Minimal Quick Start Bar */}
          {callState === 'idle' && (
            <div className="px-3.5 py-2.5 bg-[#161616] border-b border-[#242424] flex items-center justify-between">
              <span className="text-[11px] text-[#A3B1BC] font-medium flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-purple-400" /> Start Realtime Call:
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => startCall('audio')}
                  className="px-3 py-1 rounded-xl bg-purple-950/60 hover:bg-purple-900 border border-purple-500/30 text-purple-200 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition shadow-sm"
                >
                  <Phone className="w-3 h-3 text-purple-400" /> Voice
                </button>
                <button
                  onClick={() => {
                    if (onOpenMeet) onOpenMeet();
                    else startCall('video');
                  }}
                  className="glow-btn px-3 py-1 rounded-xl text-white text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Video className="w-3 h-3" /> Meet Grid
                </button>
              </div>
            </div>
          )}

          {/* B. Outgoing Call Ringing Card */}
          {callState === 'calling' && (
            <div className="p-4 bg-gradient-to-b from-purple-950/40 to-[#141414] border-b border-purple-500/30 flex flex-col items-center justify-center gap-3 text-center animate-fade-in">
              <div className="w-12 h-12 rounded-2xl bg-purple-600/30 text-purple-300 border border-purple-500/40 flex items-center justify-center animate-bounce">
                {callMode === 'video' ? <Video className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
              </div>
              <div>
                <p className="text-xs font-bold text-white uppercase tracking-wider">
                  Calling Friend on #{code}...
                </p>
                <p className="text-[10px] text-[#646973]">Waiting for answer</p>
              </div>
              <button
                onClick={endCall}
                className="px-4 py-1.5 rounded-full bg-rose-600/80 hover:bg-rose-600 text-white text-[11px] uppercase tracking-wider cursor-pointer transition font-medium"
              >
                Cancel Call
              </button>
            </div>
          )}

          {/* C. Incoming Call Card */}
          {callState === 'incoming' && (
            <div className="p-4 bg-gradient-to-b from-purple-950/50 to-[#141414] border-b border-purple-500/40 flex flex-col items-center justify-center gap-3 text-center animate-pulse">
              <div className="w-12 h-12 rounded-2xl bg-purple-600/40 text-purple-300 border border-purple-500 flex items-center justify-center">
                {callMode === 'video' ? <Video className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
              </div>
              <div>
                <p className="text-xs font-bold text-white uppercase tracking-wider">
                  Incoming {callMode} Call from {callerName}
                </p>
                <p className="text-[10px] text-purple-300">Room #{code}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={acceptCall}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-lg"
                >
                  <Phone className="w-3.5 h-3.5" /> Accept
                </button>
                <button
                  onClick={declineCall}
                  className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-lg"
                >
                  <PhoneOff className="w-3.5 h-3.5" /> Decline
                </button>
              </div>
            </div>
          )}

          {/* D. CONNECTED AUDIO CALL CARD (Exact UI matching user's Reference Image 2) */}
          {callState === 'connected' && callMode === 'audio' && (
            <div className="p-4 bg-gradient-to-b from-purple-950/50 via-[#181818] to-[#141414] border-b border-purple-500/30 flex flex-col items-center gap-3 select-none">
              <div className="w-full flex items-center justify-between text-xs pb-1 border-b border-white/5">
                <span className="text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Voice Call Active
                </span>
                <span className="text-white font-mono font-bold text-xs bg-black/50 px-2 py-0.5 rounded-full">
                  {formatCallTime(callDuration)}
                </span>
              </div>

              {/* Animated Audio Equalizer Soundwave Symbol */}
              <div className="flex items-center justify-center gap-1.5 h-10 py-1">
                {[40, 75, 100, 60, 95, 45, 80, 50, 70, 85].map((h, i) => (
                  <span
                    key={i}
                    className="w-1 bg-gradient-to-t from-purple-500 to-pink-400 rounded-full animate-pulse"
                    style={{
                      height: `${h}%`,
                      animationDuration: `${0.35 + (i % 4) * 0.15}s`,
                      animationDelay: `${i * 0.08}s`
                    }}
                  />
                ))}
              </div>

              {/* Connected Participant Info */}
              <p className="text-[11px] text-[#A3B1BC] font-medium">
                Connected with Friend in #{code}
              </p>

              {/* 3 Call Control Buttons (Mute, Video, End Call - matching reference Image 2) */}
              <div className="flex items-center justify-center gap-4 pt-1">
                {/* 1. Mute / Unmute Button */}
                <button
                  onClick={() => {
                    const muted = !isMicMuted;
                    setIsMicMuted(muted);
                    if (localStreamRef.current) {
                      localStreamRef.current.getAudioTracks().forEach(t => (t.enabled = !muted));
                    }
                  }}
                  className={`p-3 rounded-full cursor-pointer transition shadow-lg ${
                    isMicMuted
                      ? 'bg-rose-600 text-white shadow-[0_0_15px_rgba(225,29,72,0.5)]'
                      : 'bg-[#262626] hover:bg-[#333333] text-white'
                  }`}
                  title={isMicMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                >
                  {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                {/* 2. Switch to Video Button */}
                <button
                  onClick={switchToVideo}
                  className="p-3 rounded-full bg-purple-600 hover:bg-purple-500 text-white cursor-pointer transition shadow-lg hover:scale-105"
                  title="Switch to Video Call"
                >
                  <Video className="w-4 h-4" />
                </button>

                {/* 3. End Call Button */}
                <button
                  onClick={endCall}
                  className="p-3 rounded-full bg-rose-600 hover:bg-rose-500 text-white cursor-pointer transition shadow-lg hover:scale-105"
                  title="End Call"
                >
                  <PhoneOff className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* E. CONNECTED VIDEO CALL CARD (High Quality Video with Local & Remote Display) */}
          {callState === 'connected' && callMode === 'video' && (
            <div className="p-3 bg-[#161616] border-b border-[#242424] flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5 text-[10px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Live Video Call
                </span>
                <span className="text-white font-mono text-[11px] bg-black/60 px-2 py-0.5 rounded-full">
                  {formatCallTime(callDuration)}
                </span>
              </div>

              {/* Video Stage: Main Remote Video + Local PIP */}
              <div className="relative h-48 w-full bg-[#0C0C0C] rounded-2xl overflow-hidden border border-[#262626] shadow-xl flex items-center justify-center">
                {/* Remote Video Stream */}
                {remoteStream ? (
                  <video
                    ref={(el) => {
                      remoteVideoRef.current = el;
                      if (el && remoteStream && el.srcObject !== remoteStream) {
                        el.srcObject = remoteStream;
                        el.play().catch(() => {});
                      }
                    }}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-14 h-14 rounded-full bg-purple-600/30 text-purple-300 border border-purple-500/40 flex items-center justify-center font-bold text-xl">
                      {callerName.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-[11px] text-[#646973]">Waiting for peer video...</span>
                  </div>
                )}

                {/* Local Video Stream (PIP Corner Tile) */}
                <div className="absolute bottom-2 right-2 w-24 h-18 bg-black/80 rounded-xl overflow-hidden border-2 border-purple-500 shadow-xl flex items-center justify-center">
                  {localStream && !isVideoMuted ? (
                    <video
                      ref={(el) => {
                        localVideoRef.current = el;
                        if (el && localStream && el.srcObject !== localStream) {
                          el.srcObject = localStream;
                          el.play().catch(() => {});
                        }
                      }}
                      autoPlay
                      playsInline
                      muted // Local muted to avoid feedback loop
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-[10px] text-purple-300 font-semibold">Camera Off</div>
                  )}
                </div>
              </div>

              {/* Video Controls Bar */}
              <div className="flex items-center justify-center gap-2.5 pt-1">
                {/* Mute Mic */}
                <button
                  onClick={() => {
                    const muted = !isMicMuted;
                    setIsMicMuted(muted);
                    if (localStreamRef.current) {
                      localStreamRef.current.getAudioTracks().forEach(t => (t.enabled = !muted));
                    }
                  }}
                  className={`p-2 rounded-xl transition shadow-md ${
                    isMicMuted ? 'bg-rose-600 text-white' : 'bg-[#262626] hover:bg-[#333333] text-white'
                  }`}
                  title={isMicMuted ? 'Unmute' : 'Mute'}
                >
                  {isMicMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                </button>

                {/* Toggle Camera */}
                <button
                  onClick={() => {
                    const vOff = !isVideoMuted;
                    setIsVideoMuted(vOff);
                    if (localStreamRef.current) {
                      localStreamRef.current.getVideoTracks().forEach(t => (t.enabled = !vOff));
                    }
                  }}
                  className={`p-2 rounded-xl transition shadow-md ${
                    isVideoMuted ? 'bg-rose-600 text-white' : 'bg-[#262626] hover:bg-[#333333] text-white'
                  }`}
                  title={isVideoMuted ? 'Turn Camera On' : 'Turn Camera Off'}
                >
                  {isVideoMuted ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
                </button>

                {/* Expand to Google Meet Full Grid */}
                {onOpenMeet && (
                  <button
                    onClick={onOpenMeet}
                    className="px-3 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition shadow-md"
                    title="Expand to Full Meet Grid"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Expand</span>
                  </button>
                )}

                {/* End Call */}
                <button
                  onClick={endCall}
                  className="p-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition shadow-md"
                  title="End Call"
                >
                  <PhoneOff className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* 3. MESSAGES STREAM */}
          {/* ============================================================ */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#646973] gap-2.5">
                <div className="w-12 h-12 rounded-2xl bg-purple-950/40 text-purple-400 border border-purple-500/20 flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
                <p className="text-xs text-[#D7E2EA] font-semibold">Shared Code #{code}</p>
                <p className="text-[11px] text-[#646973] leading-relaxed">
                  Anyone on pad #{code} will see messages and can voice or video call here in real-time.
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.sender_id === clientId;
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 text-[10px] text-[#646973]">
                      <span className="font-semibold" style={{ color: msg.color || '#BBCCD7' }}>
                        {isMe ? 'You' : msg.sender_name || 'Friend'}
                      </span>
                      <span>•</span>
                      <span>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2 leading-relaxed break-words text-xs ${
                        isMe
                          ? 'bg-purple-600 text-white rounded-br-none shadow-md font-medium'
                          : 'bg-[#181818] border border-[#282828] text-[#D7E2EA] rounded-bl-none font-medium'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* ============================================================ */}
          {/* 4. CHAT INPUT BAR */}
          {/* ============================================================ */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-[#242424] bg-[#141414]">
            <div className="flex items-center gap-2 bg-[#1b1b1b] border border-[#2b2b2b] rounded-2xl px-3.5 py-2 focus-within:border-purple-500 transition">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Message friend in #..."
                className="bg-transparent border-none outline-none text-xs text-[#D7E2EA] placeholder-[#646973] w-full"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="p-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white transition cursor-pointer flex-shrink-0 shadow-md"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </aside>
      ) : (
        /* Floating Pill Button when panel is collapsed */
        <button
          onClick={onToggleOpen}
          className="fixed bottom-6 right-6 z-30 glow-btn px-4 py-2.5 rounded-full text-white font-medium uppercase tracking-wider text-xs flex items-center gap-2 shadow-2xl cursor-pointer hover:scale-105 transition-all"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Chat & Call</span>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-white text-purple-900 font-bold text-[10px]">
              {unreadCount}
            </span>
          )}
        </button>
      )}
    </>
  );
};
