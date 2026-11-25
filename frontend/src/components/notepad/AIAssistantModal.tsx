import React, { useState } from 'react';
import { Sparkles, Check, Copy, Wand2, Languages, ListChecks, FileText, X } from 'lucide-react';

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  onApplyText: (newText: string) => void;
}

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  isOpen,
  onClose,
  content,
  onApplyText
}) => {
  const [output, setOutput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleAction = (action: 'summarize' | 'grammar' | 'action_items' | 'translate') => {
    setLoading(true);
    setOutput('');

    setTimeout(() => {
      let result = '';
      const cleanContent = content.trim();

      if (!cleanContent) {
        result = "Pad is currently empty. Write some text or notes first to analyze!";
      } else if (action === 'summarize') {
        const sentences = cleanContent.split(/(?<=[.?!])\s+/);
        result = `### 📋 Executive Summary:\n\n• **Core Objective:** ${sentences[0] || 'Primary creative direction.'}\n• **Key Points:** ${sentences.slice(1, 3).join(' ') || 'Comprehensive 3D asset workflows and collaborative notes.'}\n• **Total Word Count:** ~${cleanContent.split(/\s+/).length} words.`;
      } else if (action === 'grammar') {
        result = cleanContent
          .replace(/\bi\b/g, 'I')
          .replace(/\s+/g, ' ')
          .replace(/([.?!])([a-z])/g, '$1 $2');
      } else if (action === 'action_items') {
        const lines = cleanContent.split('\n').filter(Boolean);
        result = `### 🎯 Generated Action Items:\n\n` + lines.slice(0, 5).map((l, idx) => `[ ] Action ${idx + 1}: Follow up on "${l.slice(0, 40)}..."`).join('\n');
      } else if (action === 'translate') {
        result = `[Multi-Lingual Translation Draft]\n\nHindi / हिंदी: यह साझा नोटपैड पैडली द्वारा सुरक्षित रूप से रीयल-टाइम में सिंक किया गया है।\n\nOriginal Text: ${cleanContent.slice(0, 150)}...`;
      }

      setOutput(result);
      setLoading(false);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none">
      <div className="bg-[#141414] border border-[#262626] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#646973] hover:text-white p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 text-white">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white uppercase tracking-wider">
              Padly AI Assistant
            </h3>
            <p className="text-xs text-[#646973]">Instant summaries, cleanup & translation</p>
          </div>
        </div>

        {/* Quick Prompts */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            onClick={() => handleAction('summarize')}
            className="p-2.5 rounded-xl bg-[#0C0C0C] border border-[#262626] hover:border-purple-500/50 text-[#D7E2EA] hover:text-white text-xs flex items-center gap-2 transition"
          >
            <FileText className="w-4 h-4 text-purple-400" />
            <span>Summarize Pad</span>
          </button>
          <button
            onClick={() => handleAction('action_items')}
            className="p-2.5 rounded-xl bg-[#0C0C0C] border border-[#262626] hover:border-purple-500/50 text-[#D7E2EA] hover:text-white text-xs flex items-center gap-2 transition"
          >
            <ListChecks className="w-4 h-4 text-pink-400" />
            <span>Extract Tasks</span>
          </button>
          <button
            onClick={() => handleAction('grammar')}
            className="p-2.5 rounded-xl bg-[#0C0C0C] border border-[#262626] hover:border-purple-500/50 text-[#D7E2EA] hover:text-white text-xs flex items-center gap-2 transition"
          >
            <Wand2 className="w-4 h-4 text-amber-400" />
            <span>Clean / Fix Prose</span>
          </button>
          <button
            onClick={() => handleAction('translate')}
            className="p-2.5 rounded-xl bg-[#0C0C0C] border border-[#262626] hover:border-purple-500/50 text-[#D7E2EA] hover:text-white text-xs flex items-center gap-2 transition"
          >
            <Languages className="w-4 h-4 text-blue-400" />
            <span>Translate (Hindi/etc)</span>
          </button>
        </div>

        {/* Output Area */}
        <div className="bg-[#0C0C0C] rounded-2xl p-4 border border-[#262626] min-h-[160px] max-h-[260px] overflow-y-auto mb-4 text-xs font-mono text-[#D7E2EA] whitespace-pre-wrap select-text">
          {loading ? (
            <div className="flex items-center justify-center h-full text-purple-400 gap-2">
              <Sparkles className="w-4 h-4 animate-spin" /> Generating AI response...
            </div>
          ) : output ? (
            output
          ) : (
            <span className="text-[#646973]">Choose an action above to process current pad text.</span>
          )}
        </div>

        {output && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onApplyText(output);
                onClose();
              }}
              className="flex-1 glow-btn py-2.5 rounded-xl text-white text-xs font-medium uppercase tracking-wider cursor-pointer"
            >
              Insert / Replace in Pad
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(output);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="px-3.5 py-2.5 rounded-xl bg-[#0C0C0C] border border-[#262626] text-[#D7E2EA] hover:text-white text-xs flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
