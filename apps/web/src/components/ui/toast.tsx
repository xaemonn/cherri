'use client';

import { AnimatePresence, motion } from 'motion/react';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

interface Toast {
  id: number;
  message: string;
  emoji: string;
}

const ToastContext = createContext<((message: string, emoji?: string) => void) | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, emoji = '🍒') => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current.slice(-2), { id, message, emoji }]);
    setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), 3800);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4 lg:bottom-8" aria-live="polite">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              className="flex max-w-md items-center gap-3 rounded-full border border-ink/10 bg-ink px-5 py-3 text-sm font-semibold text-cream shadow-lift"
            >
              <span aria-hidden="true">{toast.emoji}</span>
              {toast.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const show = useContext(ToastContext);
  if (!show) throw new Error('useToast must be used inside <ToastProvider>');
  return show;
}
