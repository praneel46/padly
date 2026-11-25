import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

type ToastListener = (toast: ToastItem) => void;
const listeners = new Set<ToastListener>();

export const showToast = (type: 'success' | 'error' | 'info', message: string, durationMs: number = 3500) => {
  const item: ToastItem = {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    type,
    message,
  };
  listeners.forEach(fn => fn(item));

  if (durationMs > 0) {
    setTimeout(() => {
      dismissToast(item.id);
    }, durationMs);
  }
};

type DismissListener = (id: string) => void;
const dismissListeners = new Set<DismissListener>();

export const dismissToast = (id: string) => {
  dismissListeners.forEach(fn => fn(id));
};

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handleAdd = (toast: ToastItem) => {
      setToasts(prev => [...prev.slice(-4), toast]);
    };
    const handleDismiss = (id: string) => {
      setToasts(prev => prev.filter(t => t.id !== id));
    };

    listeners.add(handleAdd);
    dismissListeners.add(handleDismiss);

    return () => {
      listeners.delete(handleAdd);
      dismissListeners.delete(handleDismiss);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md border transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${
              isSuccess
                ? 'bg-[#121c16]/95 border-emerald-500/40 text-emerald-200'
                : isError
                ? 'bg-[#221214]/95 border-rose-500/40 text-rose-200'
                : 'bg-[#181524]/95 border-purple-500/40 text-purple-200'
            }`}
          >
            <div className="flex items-center gap-2.5 text-xs font-medium">
              {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
              {isError && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
              {!isSuccess && !isError && <Info className="w-4 h-4 text-purple-400 shrink-0" />}
              <span>{toast.message}</span>
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="p-1 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
