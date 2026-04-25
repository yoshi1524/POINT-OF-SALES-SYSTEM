'use client';
import { useState, useCallback, useEffect, useRef } from 'react';

type ToastType = 'success' | 'error' | 'info';
interface ToastItem { id: number; msg: string; type: ToastType; }

let _addToast: ((msg: string, type: ToastType) => void) | null = null;
export function toast(msg: string, type: ToastType = 'info') { _addToast?.(msg, type); }

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counterRef = useRef(0);
  const add = useCallback((msg: string, type: ToastType) => {
    const id = ++counterRef.current;
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000);
  }, []);
  useEffect(() => { _addToast = add; return () => { _addToast = null; }; }, [add]);
  return (
    <div className="toast-container">
      {toasts.map(t => <div key={t.id} className={`toast ${t.type}`}><span>{t.msg}</span></div>)}
    </div>
  );
}
