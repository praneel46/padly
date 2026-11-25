import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare, Video, Phone, PhoneOff, Mic, MicOff, VideoOff,
  Send, Users, X, Maximize2, Minimize2, ExternalLink, Columns,
  Smile, Paperclip, Share2, Copy, Check, Radio
} from 'lucide-react';
import { getApiUrl } from '../../lib/api';
import { useCall } from '../../context/CallContext';
import { showToast } from '../common/ToastContainer';

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
  onShareInvite?: () => void;
  onFileUpload?: (files: FileList) => void;
}

export const PeerChatAndCall: React.FC<PeerChatAndCallProps> = ({
  code,
  clientId,
  ws,
  presenceCount,
  isOpen,
  onToggleOpen,
  onOpenMeet,
  onShareInvite,
  onFileUpload,
}) => {
  // Call context
  const {
    callState,
    callMode,
    viewMode,
    setViewMode,
    callerName,
    isMicMuted,
    isVideoOff,
    callDuration,
    startCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMic,
    toggleCamera,
    togglePictureInPicture,
    localStream,
    participants,
    userName,
  } = useCall();

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Typing indicator
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dockedVideoRef = useRef<HTMLVideoElement | null>(null);

  // Load chat history
  useEffect(() => {
    fetch(getApiUrl(`/api/pages/${encodeURIComponent(code)}/chats`))
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setMessages(data);
      })
      .catch(console.error);
  }, [code]);

  // Handle incoming WS messages for Chat and typing
  useEffect(() => {
    if (!ws) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);

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
        } else if (msg.type === 'user_typing') {
          if (msg.senderName && msg.senderName !== userName) {
            setTypingUsers(prev => Array.from(new Set([...prev, msg.senderName])));
            setTimeout(() => {
              setTypingUsers(prev => prev.filter(n => n !== msg.senderName));
            }, 3000);
          }
        }
      } catch (e) {
        console.error('WS message parse error:', e);
      }
    };

    ws.addEventListener('message', handleMessage);
    return () => {
      ws.removeEventListener('message', handleMessage);
    };
  }, [ws, isOpen, userName]);

  // Reset unread count when chat opens
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [isOpen]);

  // Send message
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !ws || ws.readyState !== WebSocket.OPEN) return;

    ws.send(JSON.stringify({
      type: 'chat_message',
      text: inputText.trim(),
      senderName: userName,
    }));

    setInputText('');
    setShowEmojiPicker(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (ws && ws.readyState === WebSocket.OPEN) {
      if (!typingTimeoutRef.current) {
        ws.send(JSON.stringify({
          type: 'user_typing',
          senderName: userName,
        }));
        typingTimeoutRef.current = setTimeout(() => {
          typingTimeoutRef.current = null;
        }, 2000);
      }
    }
  };

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    showToast('success', 'Invite link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleInsertEmoji = (emoji: string) => {
    setInputText(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Primary participant for docked view
  const primaryParticipant = participants.find(p => p.stream) || participants[0] || null;

  return (
    <>
      {isOpen && (
        <aside className="w-80 sm:w-96 bg-[#110f1a] border-l border-purple-900/30 flex flex-col h-full z-20 flex-shrink-0 select-none shadow-2xl transition-all animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="p-3.5 border-b border-purple-900/30 bg-[#141220] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/20">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                  Synchronized Chat
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </h3>
                <p className="text-[10px] text-white/50 font-mono">
                  Room #{code} • {presenceCount} online
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {callState === 'idle' && (
                <>
                  <button
                    onClick={() => startCall('audio')}
                    className="p-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 transition cursor-pointer"
                    title="Start Voice Call"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => startCall('video')}
                    className="p-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 transition cursor-pointer"
                    title="Start Video Call"
                  >
                    <Video className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
              <button
                onClick={onToggleOpen}
                className="p-1.5 text-white/50 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
                title="Collapse Panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ============================================================ */}
          {/* CALL STATE CARDS */}
          {/* ============================================================ */}

          {/* 1. Outgoing Calling Card (Problem 2 Redesign) */}
          {callState === 'calling' && (
            <div className="p-4 bg-gradient-to-b from-purple-950/60 to-[#141220] border-b border-purple-500/30 flex flex-col items-center justify-center text-center gap-3 animate-in fade-in duration-200">
              {/* Pulsing Avatar Ring */}
              <div className="relative flex items-center justify-center">
                <span className="animate-ping absolute inline-flex h-16 w-16 rounded-full bg-purple-500 opacity-40"></span>
                <span className="animate-pulse absolute inline-flex h-14 w-14 rounded-full bg-purple-600 opacity-60"></span>
                <div className="relative w-12 h-12 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-xl border-2 border-purple-400">
                  {callMode === 'video' ? <Video className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-white uppercase tracking-wider">
                  Calling #{code}...
                </p>
                <p className="text-[11px] text-purple-300/70 mt-0.5">
                  Waiting for someone to join
                </p>
              </div>

              <button
                onClick={endCall}
                className="px-4 py-1.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold uppercase tracking-wider transition cursor-pointer shadow-md shadow-rose-900/30"
              >
                Cancel
              </button>
            </div>
          )}

          {/* 2. Incoming Call Card */}
          {callState === 'incoming' && (
            <div className="p-4 bg-gradient-to-b from-purple-950/70 to-[#141220] border-b border-purple-500/40 flex flex-col items-center justify-center text-center gap-3 animate-in fade-in duration-200">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-xl border-2 border-emerald-400 animate-bounce">
                {callMode === 'video' ? <Video className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
              </div>

              <div>
                <p className="text-xs font-bold text-white uppercase tracking-wider">
                  Incoming {callMode} Call from {callerName}
                </p>
                <p className="text-[11px] text-emerald-300 mt-0.5">Room #{code}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={acceptCall}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-lg transition cursor-pointer"
                >
                  <Phone className="w-3.5 h-3.5" /> Accept
                </button>
                <button
                  onClick={declineCall}
                  className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-lg transition cursor-pointer"
                >
                  <PhoneOff className="w-3.5 h-3.5" /> Decline
                </button>
              </div>
            </div>
          )}

          {/* 3. Docked Video Stage (When Connected in Video and viewMode === 'docked') */}
          {callState === 'connected' && callMode === 'video' && viewMode === 'docked' && (
            <div className="p-3 bg-[#151224] border-b border-purple-900/40 flex flex-col gap-2">
              <div className="flex items-center justify-between text-[11px] text-white/60">
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Docked Video • {formatDuration(callDuration)}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => togglePictureInPicture(dockedVideoRef.current)}
                    className="p-1 rounded hover:bg-white/10 text-white/70 hover:text-white"
                    title="Pop out Picture-in-Picture"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setViewMode('mini')}
                    className="p-1 rounded hover:bg-white/10 text-white/70 hover:text-white"
                    title="Float as Mini Window"
                  >
                    <Minimize2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setViewMode('fullscreen')}
                    className="p-1 rounded hover:bg-white/10 text-white/70 hover:text-white"
                    title="Expand to Fullscreen"
                  >
                    <Maximize2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Video Player */}
              <div className="relative h-44 w-full bg-black rounded-xl overflow-hidden border border-purple-500/20 shadow-inner flex items-center justify-center">
                {primaryParticipant?.stream ? (
                  <video
                    ref={dockedVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : localStream ? (
                  <video
                    ref={dockedVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-white/60 text-xs">
                    <div className="w-12 h-12 rounded-full bg-purple-900/40 flex items-center justify-center font-bold text-white">
                      {(primaryParticipant?.name || userName).charAt(0)}
                    </div>
                    <span>Camera is off</span>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  onClick={toggleMic}
                  className={`p-1.5 rounded-lg text-white transition ${
                    isMicMuted ? 'bg-rose-600' : 'bg-white/10 hover:bg-white/20'
                  }`}
                  title={isMicMuted ? 'Unmute' : 'Mute'}
                >
                  {isMicMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={toggleCamera}
                  className={`p-1.5 rounded-lg text-white transition ${
                    isVideoOff ? 'bg-rose-600' : 'bg-white/10 hover:bg-white/20'
                  }`}
                  title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
                >
                  {isVideoOff ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={endCall}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1 shadow-md"
                  title="Leave Call"
                >
                  <PhoneOff className="w-3.5 h-3.5" />
                  <span>Leave</span>
                </button>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* MESSAGES LIST */}
          {/* ============================================================ */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
            {messages.length === 0 ? (
              presenceCount <= 1 ? (
                // Friendly Empty State when user is alone (Problem 2)
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-white/60 gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-950/40 text-purple-400 border border-purple-500/20 flex items-center justify-center">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">No one else is here yet</p>
                    <p className="text-[11px] text-white/50 mt-1 leading-relaxed max-w-xs">
                      Share the pad link or code #{code} so your friends can collaborate and call.
                    </p>
                  </div>
                  <button
                    onClick={handleCopyInvite}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/30 text-purple-200 text-xs font-medium transition cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copied Link!' : 'Copy Invite Link'}</span>
                  </button>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-white/60 gap-2">
                  <div className="w-10 h-10 rounded-xl bg-purple-950/40 text-purple-400 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-white">Room #{code}</p>
                  <p className="text-[11px] text-white/50">Send a message to say hello to everyone in the room!</p>
                </div>
              )
            ) : (
              messages.map(msg => {
                const isMe = msg.sender_id === clientId;
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 text-[10px] text-white/40">
                      <span className="font-semibold" style={{ color: msg.color || '#a78bfa' }}>
                        {isMe ? 'You' : msg.sender_name || 'Friend'}
                      </span>
                      <span>•</span>
                      <span>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2 leading-relaxed break-words text-xs shadow-md transition-all ${
                        isMe
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-br-none font-medium'
                          : 'bg-[#1a1728] border border-purple-900/30 text-[#D7E2EA] rounded-bl-none font-medium'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })
            )}

            {/* Typing Indicator */}
            {typingUsers.length > 0 && (
              <div className="flex items-center gap-2 text-[11px] text-purple-300/80 italic py-1 animate-pulse">
                <span>{typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...</span>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Emoji Picker Popover */}
          {showEmojiPicker && (
            <div className="px-3 py-2 bg-[#171424] border-t border-purple-900/30 flex items-center gap-2 overflow-x-auto">
              {['😊', '👍', '🔥', '🚀', '❤️', '💡', '🎉', '👏', '👀'].map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => handleInsertEmoji(e)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-base transition cursor-pointer"
                >
                  {e}
                </button>
              ))}
            </div>
          )}

          {/* Chat Input Bar */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-purple-900/30 bg-[#141220]">
            <div className="flex items-center gap-1.5 bg-[#1b182b] border border-purple-900/40 rounded-2xl px-3 py-1.5 focus-within:border-purple-500/70 transition">
              {/* Emoji Button */}
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-1.5 text-white/50 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
                title="Insert Emoji"
              >
                <Smile className="w-4 h-4" />
              </button>

              {/* Attach File Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 text-white/50 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
                title="Attach and share file"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={e => e.target.files && onFileUpload && onFileUpload(e.target.files)}
              />

              {/* Message Input */}
              <input
                type="text"
                value={inputText}
                onChange={handleInputChange}
                placeholder="Message room..."
                className="bg-transparent border-none outline-none text-xs text-[#D7E2EA] placeholder-white/40 w-full px-1"
              />

              {/* Send Button */}
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
      )}
    </>
  );
};
