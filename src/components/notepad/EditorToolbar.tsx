import React from 'react';
import {
  Bold, Italic, Strikethrough, Heading1, Heading2, Heading3,
  List, ListOrdered, CheckSquare, Quote, Code, Minus, FileText,
  AlignLeft, Sparkles, Lock, Eye
} from 'lucide-react';

export type EditorMode = 'rich' | 'markdown' | 'plain' | 'code';

interface EditorToolbarProps {
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  onFormat: (action: string, value?: string) => void;
  isReadOnly: boolean;
  wordCount: number;
  charCount: number;
  onOpenAI: () => void;
  onOpenLock: () => void;
  isEncrypted: boolean;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  mode,
  onModeChange,
  onFormat,
  isReadOnly,
  wordCount,
  charCount,
  onOpenAI,
  onOpenLock,
  isEncrypted
}) => {
  return (
    <div className="w-full bg-[#141414] border-b border-[#262626] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm select-none">
      {/* Left: Mode selector & formatting buttons */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        {/* Mode Selector */}
        <div className="flex bg-[#0C0C0C] rounded-lg p-0.5 border border-[#262626]">
          {(['rich', 'markdown', 'plain', 'code'] as EditorMode[]).map((m) => (
            <button
              key={m}
              onClick={() => onModeChange(m)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium uppercase tracking-wider capitalize transition-colors ${
                mode === m
                  ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'text-[#646973] hover:text-[#D7E2EA]'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="h-5 w-px bg-[#262626] mx-1" />

        {/* Formatting Actions */}
        {!isReadOnly && (
          <div className="flex items-center gap-0.5">
            <button
              title="Bold (Ctrl+B)"
              onClick={() => onFormat('bold')}
              className="p-1.5 rounded hover:bg-white/10 text-[#D7E2EA] transition"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              title="Italic (Ctrl+I)"
              onClick={() => onFormat('italic')}
              className="p-1.5 rounded hover:bg-white/10 text-[#D7E2EA] transition"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              title="Strikethrough"
              onClick={() => onFormat('strike')}
              className="p-1.5 rounded hover:bg-white/10 text-[#D7E2EA] transition"
            >
              <Strikethrough className="w-4 h-4" />
            </button>

            <div className="h-4 w-px bg-[#262626] mx-1" />

            <button
              title="Heading 1"
              onClick={() => onFormat('h1')}
              className="p-1.5 rounded hover:bg-white/10 text-[#D7E2EA] transition"
            >
              <Heading1 className="w-4 h-4" />
            </button>
            <button
              title="Heading 2"
              onClick={() => onFormat('h2')}
              className="p-1.5 rounded hover:bg-white/10 text-[#D7E2EA] transition"
            >
              <Heading2 className="w-4 h-4" />
            </button>
            <button
              title="Heading 3"
              onClick={() => onFormat('h3')}
              className="p-1.5 rounded hover:bg-white/10 text-[#D7E2EA] transition"
            >
              <Heading3 className="w-4 h-4" />
            </button>

            <div className="h-4 w-px bg-[#262626] mx-1" />

            <button
              title="Bullet list"
              onClick={() => onFormat('ul')}
              className="p-1.5 rounded hover:bg-white/10 text-[#D7E2EA] transition"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              title="Numbered list"
              onClick={() => onFormat('ol')}
              className="p-1.5 rounded hover:bg-white/10 text-[#D7E2EA] transition"
            >
              <ListOrdered className="w-4 h-4" />
            </button>
            <button
              title="Checklist / To-do"
              onClick={() => onFormat('todo')}
              className="p-1.5 rounded hover:bg-white/10 text-[#D7E2EA] transition"
            >
              <CheckSquare className="w-4 h-4" />
            </button>

            <div className="h-4 w-px bg-[#262626] mx-1" />

            <button
              title="Quote"
              onClick={() => onFormat('quote')}
              className="p-1.5 rounded hover:bg-white/10 text-[#D7E2EA] transition"
            >
              <Quote className="w-4 h-4" />
            </button>
            <button
              title="Code Block"
              onClick={() => onFormat('code')}
              className="p-1.5 rounded hover:bg-white/10 text-[#D7E2EA] transition"
            >
              <Code className="w-4 h-4" />
            </button>
            <button
              title="Horizontal Divider"
              onClick={() => onFormat('hr')}
              className="p-1.5 rounded hover:bg-white/10 text-[#D7E2EA] transition"
            >
              <Minus className="w-4 h-4" />
            </button>
          </div>
        )}

        {isReadOnly && (
          <span className="flex items-center gap-1.5 text-amber-400/90 text-xs px-2 py-0.5 bg-amber-500/10 rounded-full border border-amber-500/20 font-medium">
            <Eye className="w-3.5 h-3.5" /> Read-Only Mode
          </span>
        )}
      </div>

      {/* Right: AI assistant, Lock status, and Counters */}
      <div className="flex items-center gap-3 text-xs text-[#646973]">
        <button
          onClick={onOpenAI}
          className="flex items-center gap-1.5 text-xs text-purple-300 hover:text-white px-2.5 py-1 rounded-full bg-purple-900/30 border border-purple-500/30 hover:border-purple-400 transition"
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          AI Assist
        </button>

        <button
          onClick={onOpenLock}
          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition ${
            isEncrypted
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'hover:text-[#D7E2EA]'
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          {isEncrypted ? 'Encrypted' : 'Lock'}
        </button>

        <div className="hidden sm:flex items-center gap-2 border-l border-[#262626] pl-3">
          <span>{wordCount} words</span>
          <span>•</span>
          <span>{charCount} chars</span>
        </div>
      </div>
    </div>
  );
};
