// ─── Toast Context ────────────────────────────────────────────────────
// Lightweight toast system. Supports success / error / info variants.
// Auto-dismisses after 3.5 s, stacks max 3 at a time.
// ──────────────────────────────────────────────────────────────────────

import { createContext, useContext, useState, useCallback, useRef } from 'react';
import './Toast.css';

const ToastContext = createContext(null);

let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    clearTimeout(timersRef.current[id]);
    delete timersRef.current[id];
  }, []);

  const addToast = useCallback((message, variant = 'success', durationMs = 3500) => {
    const id = ++idCounter;
    setToasts((prev) => [...prev.slice(-2), { id, message, variant }]);
    timersRef.current[id] = setTimeout(() => removeToast(id), durationMs);
    return id;
  }, [removeToast]);

  const toast = {
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error'),
    info: (msg) => addToast(msg, 'info'),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast container */}
      <div className="toast-container" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast toast-${t.variant}`}
            onClick={() => removeToast(t.id)}
          >
            <span className="toast-icon">
              {t.variant === 'success' && '✓'}
              {t.variant === 'error' && '✕'}
              {t.variant === 'info' && 'ℹ'}
            </span>
            <span className="toast-message">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
