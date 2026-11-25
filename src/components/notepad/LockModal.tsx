import React, { useState } from 'react';
import { Lock, Unlock, ShieldCheck, Key, X, AlertTriangle, Eye, EyeOff } from 'lucide-react';

interface LockModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEncrypted: boolean;
  onApplyLock: (password: string) => Promise<void>;
  onRemoveLock: (password: string) => Promise<boolean>;
}

export const LockModal: React.FC<LockModalProps> = ({
  isOpen,
  onClose,
  isEncrypted,
  onApplyLock,
  onRemoveLock
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSetLock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await onApplyLock(password);
      setPassword('');
      setConfirmPassword('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Encryption failed');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlockAndRemove = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const success = await onRemoveLock(password);
      if (success) {
        setPassword('');
        onClose();
      } else {
        setError('Incorrect password');
      }
    } catch (err: any) {
      setError(err.message || 'Decryption failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none animate-in fade-in duration-150">
      <div className="bg-[#141220] border border-purple-500/30 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/50 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-2xl bg-purple-900/30 text-purple-400 border border-purple-500/20">
            {isEncrypted ? <ShieldCheck className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white uppercase tracking-wider">
              {isEncrypted ? 'Pad is Encrypted' : 'Encrypt with Password'}
            </h3>
            <p className="text-xs text-[#646973]">
              AES-GCM 256-bit client-side encryption
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isEncrypted ? (
          <div>
            <p className="text-xs text-[#D7E2EA]/80 leading-relaxed mb-4">
              This pad is encrypted client-side. The server only stores random ciphertext. Enter the key below to remove encryption and return to public mode.
            </p>
            <form onSubmit={handleUnlockAndRemove} className="space-y-4">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="padly-encryption-passphrase"
                  id="padly-encryption-passphrase"
                  autoComplete="new-password"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-form-type="other"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter current password..."
                  className="w-full bg-[#0C0C0C] border border-[#262626] rounded-xl px-4 py-2.5 pr-10 text-sm text-[#D7E2EA] outline-none focus:border-purple-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium uppercase tracking-wider text-xs transition cursor-pointer"
              >
                {loading ? 'Decrypting...' : 'Remove Password Lock'}
              </button>
            </form>
          </div>
        ) : (
          <div>
            <p className="text-xs text-[#D7E2EA]/80 leading-relaxed mb-4">
              Set a password to encrypt this pad. It uses Web Crypto AES-GCM 256-bit so nobody (not even the server) can read the contents without the password.
            </p>
            <form onSubmit={handleSetLock} className="space-y-3">
              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#646973] block mb-1">
                  Encryption Key / Passphrase
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="padly-encryption-passphrase"
                    id="padly-encryption-passphrase"
                    autoComplete="new-password"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-form-type="other"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong passphrase..."
                    className="w-full bg-[#0C0C0C] border border-[#262626] rounded-xl px-4 py-2.5 pr-10 text-sm text-[#D7E2EA] outline-none focus:border-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#646973] block mb-1">
                  Confirm Key
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="padly-encryption-confirm"
                  id="padly-encryption-confirm"
                  autoComplete="new-password"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-form-type="other"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat passphrase..."
                  className="w-full bg-[#0C0C0C] border border-[#262626] rounded-xl px-4 py-2.5 text-sm text-[#D7E2EA] outline-none focus:border-purple-500"
                />
              </div>

              <p className="text-[10px] text-white/40 leading-relaxed pt-1">
                Tip: Do not reuse your primary Google or bank password. This is a local note encryption key.
              </p>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 glow-btn py-3 rounded-xl text-white font-medium uppercase tracking-wider text-xs cursor-pointer"
              >
                {loading ? 'Encrypting...' : 'Lock & Encrypt Pad'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
