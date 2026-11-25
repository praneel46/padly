import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, Check, QrCode, Smartphone, Share2, X, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { getApiUrl } from '../../lib/api';

interface ShareModalProps {
  code: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectCode: (code: string) => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  code,
  isOpen,
  onClose,
  onSelectCode
}) => {
  const [copiedEdit, setCopiedEdit] = useState(false);
  const [copiedReadOnly, setCopiedReadOnly] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [nearbyCode, setNearbyCode] = useState<string>('');

  const baseUrl = window.location.origin;
  const editUrl = `${baseUrl}/${encodeURIComponent(code)}`;
  const readOnlyUrl = `${baseUrl}/${encodeURIComponent(code)}?mode=readonly`;

  useEffect(() => {
    if (isOpen) {
      QRCode.toDataURL(editUrl, {
        width: 240,
        margin: 2,
        color: {
          dark: '#0C0C0C',
          light: '#FFFFFF'
        }
      }).then(setQrDataUrl).catch(console.error);

      // Fetch nearby code
      fetch(getApiUrl('/api/nearby-code'))
        .then(res => res.json())
        .then(data => {
          if (data.code) setNearbyCode(data.code);
        })
        .catch(() => {
          setNearbyCode(Math.floor(1000 + Math.random() * 9000).toString());
        });
    }
  }, [isOpen, editUrl]);

  const copyToClipboard = (text: string, type: 'edit' | 'readonly') => {
    navigator.clipboard.writeText(text);
    if (type === 'edit') {
      setCopiedEdit(true);
      setTimeout(() => setCopiedEdit(false), 2000);
    } else {
      setCopiedReadOnly(true);
      setTimeout(() => setCopiedReadOnly(false), 2000);
    }
    confetti({
      particleCount: 30,
      spread: 60,
      origin: { y: 0.6 }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none">
      <div className="bg-[#141414] border border-[#262626] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#646973] hover:text-white p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-5">
          <div className="p-2 rounded-xl bg-purple-900/30 text-purple-400">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white uppercase tracking-wider">
              Share Pad: <span className="text-purple-300 font-mono">{code}</span>
            </h3>
            <p className="text-xs text-[#646973]">Instant access without login or signup</p>
          </div>
        </div>

        {/* QR Code section for Phone */}
        <div className="bg-[#0C0C0C] rounded-2xl p-4 border border-[#262626] flex flex-col sm:flex-row items-center gap-4 mb-5">
          {qrDataUrl && (
            <img
              src={qrDataUrl}
              alt="QR Code"
              className="w-32 h-32 rounded-xl bg-white p-1 shadow-md"
            />
          )}
          <div className="flex-1 text-center sm:text-left">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-300 bg-purple-900/40 px-2 py-0.5 rounded-full uppercase tracking-wider mb-1.5">
              <Smartphone className="w-3 h-3" /> Mobile Scanner
            </span>
            <p className="text-xs text-[#D7E2EA] font-medium mb-1">
              Scan with your phone camera
            </p>
            <p className="text-[11px] text-[#646973] leading-relaxed">
              Opens this exact pad in your mobile browser with live real-time sync.
            </p>
          </div>
        </div>

        {/* Links */}
        <div className="space-y-3 mb-5">
          {/* Edit link */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[#646973] block mb-1">
              Collaborative Edit Link
            </label>
            <div className="flex items-center gap-2 bg-[#0C0C0C] border border-[#262626] rounded-xl px-3 py-2">
              <input
                readOnly
                value={editUrl}
                className="bg-transparent text-xs text-[#D7E2EA] w-full outline-none font-mono"
              />
              <button
                onClick={() => copyToClipboard(editUrl, 'edit')}
                className="flex items-center gap-1 text-xs text-purple-300 hover:text-white px-2 py-1 rounded bg-purple-600/20 hover:bg-purple-600/40 transition flex-shrink-0"
              >
                {copiedEdit ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedEdit ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Read-only link */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[#646973] block mb-1">
              Read-Only Safe Link
            </label>
            <div className="flex items-center gap-2 bg-[#0C0C0C] border border-[#262626] rounded-xl px-3 py-2">
              <input
                readOnly
                value={readOnlyUrl}
                className="bg-transparent text-xs text-[#D7E2EA] w-full outline-none font-mono"
              />
              <button
                onClick={() => copyToClipboard(readOnlyUrl, 'readonly')}
                className="flex items-center gap-1 text-xs text-amber-300 hover:text-white px-2 py-1 rounded bg-amber-600/20 hover:bg-amber-600/40 transition flex-shrink-0"
              >
                {copiedReadOnly ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedReadOnly ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>

        {/* Nearby Share temporary code */}
        {nearbyCode && (
          <div className="border-t border-[#262626] pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-white flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                Nearby 4-Digit Quick Code:
              </p>
              <p className="text-[11px] text-[#646973]">
                Share this 4-digit code to switch or jump to a clean transfer pad.
              </p>
            </div>
            <button
              onClick={() => {
                onSelectCode(nearbyCode);
                onClose();
              }}
              className="px-3.5 py-1.5 rounded-lg border border-purple-500/30 text-purple-300 text-xs font-mono font-bold hover:bg-purple-600/20"
            >
              #{nearbyCode}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
