import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { getIceServers } from '../lib/webrtc';

export type CallState = 'idle' | 'calling' | 'incoming' | 'connected' | 'reconnecting';
export type CallMode = 'audio' | 'video';
export type CallViewMode = 'mini' | 'docked' | 'fullscreen' | 'hidden';

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

interface CallContextType {
  code: string;
  clientId: string;
  userName: string;
  callState: CallState;
  callMode: CallMode;
  viewMode: CallViewMode;
  callerName: string;
  isMicMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  callDuration: number;
  localStream: MediaStream | null;
  screenStream: MediaStream | null;
  participants: Participant[];
  activeSpeakerId: string | null;
  captionsEnabled: boolean;
  activeCaption: { speaker: string; text: string } | null;
  errorMessage: string | null;
  isPiPActive: boolean;

  // Actions
  setViewMode: (mode: CallViewMode) => void;
  startCall: (mode: CallMode) => Promise<void>;
  acceptCall: () => Promise<void>;
  declineCall: () => void;
  endCall: () => void;
  toggleMic: () => void;
  toggleCamera: () => void;
  toggleScreenShare: () => Promise<void>;
  toggleCaptions: () => void;
  togglePictureInPicture: (videoEl?: HTMLVideoElement | null) => Promise<void>;
  clearError: () => void;
  sendChatMessage: (text: string) => void;
}

const CallContext = createContext<CallContextType | null>(null);

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};

interface CallProviderProps {
  code: string;
  clientId: string;
  userName: string;
  ws: WebSocket | null;
  children: React.ReactNode;
}

export const CallProvider: React.FC<CallProviderProps> = ({
  code,
  clientId,
  userName,
  ws,
  children,
}) => {
  // Call state
  const [callState, setCallState] = useState<CallState>('idle');
  const [callMode, setCallMode] = useState<CallMode>('video');
  const [viewMode, setViewMode] = useState<CallViewMode>('mini');
  const [callerName, setCallerName] = useState<string>('Friend');
  const [isMicMuted, setIsMicMuted] = useState<boolean>(false);
  const [isVideoOff, setIsVideoOff] = useState<boolean>(false);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPiPActive, setIsPiPActive] = useState<boolean>(false);

  // Streams
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);

  // Captions
  const [captionsEnabled, setCaptionsEnabled] = useState<boolean>(false);
  const [activeCaption, setActiveCaption] = useState<{ speaker: string; text: string } | null>(null);
  const recognitionRef = useRef<any>(null);

  // WebRTC refs
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const iceCandidateQueueRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // 1. Send Chat message via WS
  const sendChatMessage = useCallback((text: string) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'chat_message',
        text,
        senderName: userName
      }));
    }
  }, [ws, userName]);

  // 2. Call Timer
  useEffect(() => {
    if (callState === 'connected') {
      timerRef.current = setInterval(() => {
        setCallDuration(d => d + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (callState === 'idle') setCallDuration(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState]);

  // 3. Audio Activity Detection (Speaking Indicator)
  const setupAudioMonitoring = (stream: MediaStream) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const audioCtx = new AudioContextClass();
      audioContextRef.current = audioCtx;

      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack) return;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkAudioLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        const isSpeaking = avg > 20 && !isMicMuted;

        setParticipants(prev =>
          prev.map(p => (p.id === clientId ? { ...p, isSpeaking } : p))
        );

        if (isSpeaking) {
          setActiveSpeakerId(clientId);
        }

        animFrameRef.current = requestAnimationFrame(checkAudioLevel);
      };

      checkAudioLevel();
    } catch (e) {
      console.warn('Audio monitor not available:', e);
    }
  };

  // 4. Setup Media Stream with High-Quality Constraints & Fallback
  const setupLocalMedia = async (withVideo: boolean): Promise<MediaStream> => {
    try {
      let stream: MediaStream;
      try {
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
        stream = await navigator.mediaDevices.getUserMedia({
          video: withVideo,
          audio: true
        });
      }

      localStreamRef.current = stream;
      setLocalStream(stream);
      setupAudioMonitoring(stream);

      // Add self to participants list
      setParticipants(prev => {
        const others = prev.filter(p => p.id !== clientId);
        return [
          {
            id: clientId,
            name: `${userName} (You)`,
            color: '#B600A8',
            isMuted: isMicMuted,
            isVideoOff: isVideoOff,
            isSpeaking: false,
            stream
          },
          ...others
        ];
      });

      return stream;
    } catch (err: any) {
      console.warn('Media devices not accessible, starting animated interactive fallback:', err);
      setErrorMessage(
        err.name === 'NotAllowedError'
          ? 'Camera/microphone access was denied. Please allow permissions in your browser bar.'
          : 'Unable to access camera or microphone. Using interactive virtual stream.'
      );

      // High-performance continuous 30fps canvas fallback stream
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      let frame = 0;

      const drawLoop = () => {
        if (!ctx) return;
        frame++;
        const grad = ctx.createLinearGradient(0, 0, 640, 480);
        grad.addColorStop(0, '#130c24');
        grad.addColorStop(1, '#2e1065');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 640, 480);

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

        requestAnimationFrame(drawLoop);
      };
      drawLoop();

      const stream = (canvas as any).captureStream ? (canvas as any).captureStream(30) : new MediaStream();
      localStreamRef.current = stream;
      setLocalStream(stream);

      setParticipants(prev => {
        const others = prev.filter(p => p.id !== clientId);
        return [
          {
            id: clientId,
            name: `${userName} (You)`,
            color: '#B600A8',
            isMuted: isMicMuted,
            isVideoOff: isVideoOff,
            isSpeaking: false,
            stream
          },
          ...others
        ];
      });

      return stream;
    }
  };

  // 5. Create or Get Peer Connection
  const getOrCreatePeerConnection = (peerId: string, peerName = 'Friend', peerColor = '#7621B0') => {
    let pc = peerConnectionsRef.current.get(peerId);
    if (pc && pc.signalingState !== 'closed') {
      return pc;
    }

    pc = new RTCPeerConnection(getIceServers());
    peerConnectionsRef.current.set(peerId, pc);

    // Attach local stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc?.addTrack(track, localStreamRef.current!);
      });
    }

    // ICE Candidate handler
    pc.onicecandidate = (event) => {
      if (event.candidate && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'call_signal',
          signalType: 'candidate',
          targetId: peerId,
          from: clientId,
          data: event.candidate
        }));
      }
    };

    // Track arrival handler
    pc.ontrack = (event) => {
      const incomingStream = event.streams[0];
      setParticipants(prev => {
        const existing = prev.find(p => p.id === peerId);
        if (existing) {
          return prev.map(p => (p.id === peerId ? { ...p, stream: incomingStream } : p));
        } else {
          return [
            ...prev,
            {
              id: peerId,
              name: peerName,
              color: peerColor,
              isMuted: false,
              isVideoOff: false,
              isSpeaking: false,
              stream: incomingStream
            }
          ];
        }
      });
    };

    // Connection state changes
    pc.onconnectionstatechange = () => {
      if (pc?.connectionState === 'disconnected' || pc?.connectionState === 'failed') {
        setCallState('reconnecting');
      } else if (pc?.connectionState === 'connected') {
        setCallState('connected');
      }
    };

    return pc;
  };

  // 6. Handle Incoming WebRTC Signaling
  useEffect(() => {
    if (!ws) return;

    const handleMessage = async (e: MessageEvent) => {
      try {
        const msg = JSON.parse(e.data);

        // A. Speech Captions
        if (msg.type === 'caption_message') {
          setActiveCaption({
            speaker: msg.fromName || 'Friend',
            text: msg.text
          });
          setTimeout(() => setActiveCaption(null), 4500);
        }

        // B. Call Signaling
        else if (msg.type === 'call_signal') {
          const { signalType, from, fromName, fromColor, targetId, callMode: incomingMode, data } = msg;

          // Ignore own signals
          if (from === clientId) return;

          // Target check
          if (targetId && targetId !== clientId) return;

          // 1. Incoming Call Request
          if (signalType === 'call_request') {
            setCallerName(fromName || 'Friend');
            setCallMode(incomingMode || 'video');
            setCallState('incoming');
          }

          // 2. Call Accept (We were caller, peer accepted)
          else if (signalType === 'call_accept') {
            setCallState('connected');
            const pc = getOrCreatePeerConnection(from, fromName, fromColor);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            ws.send(JSON.stringify({
              type: 'call_signal',
              signalType: 'offer',
              targetId: from,
              from: clientId,
              fromName: userName,
              data: offer
            }));
          }

          // 3. Incoming Offer
          else if (signalType === 'offer') {
            setCallState('connected');
            const pc = getOrCreatePeerConnection(from, fromName, fromColor);

            // Add local tracks if not already added
            if (localStreamRef.current) {
              const senders = pc.getSenders();
              localStreamRef.current.getTracks().forEach(track => {
                if (!senders.some(s => s.track === track)) {
                  pc.addTrack(track, localStreamRef.current!);
                }
              });
            }

            await pc.setRemoteDescription(new RTCSessionDescription(data));

            // Drain queued ICE candidates
            const queue = iceCandidateQueueRef.current.get(from) || [];
            while (queue.length > 0) {
              const cand = queue.shift();
              if (cand) {
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(cand));
                } catch (ce) {}
              }
            }

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            ws.send(JSON.stringify({
              type: 'call_signal',
              signalType: 'answer',
              targetId: from,
              from: clientId,
              data: answer
            }));
          }

          // 4. Incoming Answer
          else if (signalType === 'answer') {
            const pc = peerConnectionsRef.current.get(from);
            if (pc) {
              await pc.setRemoteDescription(new RTCSessionDescription(data));

              const queue = iceCandidateQueueRef.current.get(from) || [];
              while (queue.length > 0) {
                const cand = queue.shift();
                if (cand) {
                  try {
                    await pc.addIceCandidate(new RTCIceCandidate(cand));
                  } catch (ce) {}
                }
              }
            }
          }

          // 5. Incoming ICE Candidate
          else if (signalType === 'candidate') {
            const pc = peerConnectionsRef.current.get(from);
            if (pc && pc.remoteDescription && pc.remoteDescription.type) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(data));
              } catch (iceErr) {
                console.warn('ICE candidate buffering fallback:', iceErr);
              }
            } else {
              const queue = iceCandidateQueueRef.current.get(from) || [];
              queue.push(data);
              iceCandidateQueueRef.current.set(from, queue);
            }
          }

          // 6. Switch to Video Call
          else if (signalType === 'switch_video') {
            setCallMode('video');
            if (localStreamRef.current) {
              localStreamRef.current.getVideoTracks().forEach(t => (t.enabled = true));
            }
          }

          // 7. End / Reject / Leave Call
          else if (signalType === 'call_end' || signalType === 'call_reject' || signalType === 'meet_leave') {
            const pc = peerConnectionsRef.current.get(from);
            if (pc) {
              pc.close();
              peerConnectionsRef.current.delete(from);
            }
            setParticipants(prev => prev.filter(p => p.id !== from));
            if (participants.length <= 2) {
              endCall();
            }
          }
        }
      } catch (err) {
        console.error('Call signaling error:', err);
      }
    };

    ws.addEventListener('message', handleMessage);
    return () => {
      ws.removeEventListener('message', handleMessage);
    };
  }, [ws, clientId, userName, participants.length]);

  // 7. Start Call Action
  const startCall = async (mode: CallMode) => {
    setCallMode(mode);
    setCallState('calling');
    setViewMode(mode === 'audio' ? 'mini' : 'mini');

    await setupLocalMedia(mode === 'video');

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'call_signal',
        signalType: 'call_request',
        callMode: mode,
        fromName: userName,
        fromColor: '#B600A8'
      }));
    }
  };

  // 8. Accept Call Action
  const acceptCall = async () => {
    setCallState('connected');
    setViewMode('mini');

    await setupLocalMedia(callMode === 'video');

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'call_signal',
        signalType: 'call_accept',
        callMode,
        fromName: userName
      }));
    }
  };

  // 9. Decline Call Action
  const declineCall = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'call_signal',
        signalType: 'call_reject'
      }));
    }
    setCallState('idle');
  };

  // 10. End Call Action (releases all cameras & mics cleanly)
  const endCall = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {}
    }

    // Stop all local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (screenStream) {
      screenStream.getTracks().forEach(t => t.stop());
      setScreenStream(null);
      setIsScreenSharing(false);
    }

    setLocalStream(null);
    setParticipants([]);

    // Close all peer connections
    peerConnectionsRef.current.forEach(pc => {
      try {
        pc.close();
      } catch (e) {}
    });
    peerConnectionsRef.current.clear();
    iceCandidateQueueRef.current.clear();

    // Notify peers
    if (ws && ws.readyState === WebSocket.OPEN && callState !== 'idle') {
      ws.send(JSON.stringify({
        type: 'call_signal',
        signalType: 'call_end'
      }));
    }

    setCallState('idle');
    setViewMode('mini');
    setCallDuration(0);
    setIsMicMuted(false);
    setIsVideoOff(false);
    setIsPiPActive(false);
  };

  // 11. Toggle Microphone Mute
  const toggleMic = () => {
    const next = !isMicMuted;
    setIsMicMuted(next);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => (t.enabled = !next));
    }
    setParticipants(prev =>
      prev.map(p => (p.id === clientId ? { ...p, isMuted: next } : p))
    );
  };

  // 12. Toggle Camera On/Off
  const toggleCamera = () => {
    const next = !isVideoOff;
    setIsVideoOff(next);
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(t => (t.enabled = !next));
    }
    setParticipants(prev =>
      prev.map(p => (p.id === clientId ? { ...p, isVideoOff: next } : p))
    );
  };

  // 13. Toggle Screen Share
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStream) {
        screenStream.getTracks().forEach(t => t.stop());
        setScreenStream(null);
      }
      setIsScreenSharing(false);

      // Revert to camera video track
      if (localStreamRef.current) {
        const vTrack = localStreamRef.current.getVideoTracks()[0];
        if (vTrack) {
          peerConnectionsRef.current.forEach(pc => {
            const sender = pc.getSenders().find(s => s.track?.kind === 'video');
            if (sender) sender.replaceTrack(vTrack);
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

        const screenTrack = sStream.getVideoTracks()[0];
        peerConnectionsRef.current.forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender && screenTrack) {
            sender.replaceTrack(screenTrack);
          }
        });

        screenTrack.onended = () => {
          setIsScreenSharing(false);
          setScreenStream(null);
          if (localStreamRef.current) {
            const vTrack = localStreamRef.current.getVideoTracks()[0];
            if (vTrack) {
              peerConnectionsRef.current.forEach(pc => {
                const sender = pc.getSenders().find(s => s.track?.kind === 'video');
                if (sender) sender.replaceTrack(vTrack);
              });
            }
          }
        };
      } catch (e) {
        console.warn('Screen share canceled:', e);
      }
    }
  };

  // 14. Toggle Live Captions
  const toggleCaptions = () => {
    const next = !captionsEnabled;
    setCaptionsEnabled(next);

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (next && SpeechRecognition) {
      try {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'en-US';

        rec.onresult = (event: any) => {
          const current = event.resultIndex;
          const transcript = event.results[current][0].transcript;
          setActiveCaption({
            speaker: `${userName} (You)`,
            text: transcript
          });

          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'caption_message',
              fromName: userName,
              text: transcript
            }));
          }
        };

        rec.start();
        recognitionRef.current = rec;
      } catch (err) {
        console.warn('Speech recognition error:', err);
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

  // 15. Picture-in-Picture API
  const togglePictureInPicture = async (videoEl?: HTMLVideoElement | null) => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPiPActive(false);
      } else if (videoEl && document.pictureInPictureEnabled) {
        await videoEl.requestPictureInPicture();
        setIsPiPActive(true);
        videoEl.addEventListener('leavepictureinpicture', () => {
          setIsPiPActive(false);
        }, { once: true });
      }
    } catch (e) {
      console.warn('Picture-in-picture failed:', e);
    }
  };

  // Clean teardown on window unload
  useEffect(() => {
    const handleUnload = () => {
      endCall();
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  return (
    <CallContext.Provider
      value={{
        code,
        clientId,
        userName,
        callState,
        callMode,
        viewMode,
        callerName,
        isMicMuted,
        isVideoOff,
        isScreenSharing,
        callDuration,
        localStream,
        screenStream,
        participants,
        activeSpeakerId,
        captionsEnabled,
        activeCaption,
        errorMessage,
        isPiPActive,
        setViewMode,
        startCall,
        acceptCall,
        declineCall,
        endCall,
        toggleMic,
        toggleCamera,
        toggleScreenShare,
        toggleCaptions,
        togglePictureInPicture,
        clearError: () => setErrorMessage(null),
        sendChatMessage
      }}
    >
      {children}
    </CallContext.Provider>
  );
};
