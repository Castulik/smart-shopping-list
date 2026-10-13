import { useState, type ReactNode, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { ToastContext, type ToastMessage, type ToastType } from './ToastContext';

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 left-4 right-4 z-50 flex flex-col items-center pointer-events-none gap-2 max-w-md mx-auto">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-2xl shadow-xl text-sm font-semibold text-white animate-in slide-in-from-top-3 fade-in duration-200 w-full ${
              toast.type === 'success'
                ? 'bg-emerald-600 shadow-emerald-500/30'
                : toast.type === 'error'
                ? 'bg-rose-600 shadow-rose-500/30'
                : 'bg-indigo-600 shadow-indigo-500/30'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {toast.type === 'success' && <CheckCircle2 size={18} className="shrink-0" />}
              {toast.type === 'error' && <AlertCircle size={18} className="shrink-0" />}
              {toast.type === 'info' && <Info size={18} className="shrink-0" />}
              <span className="truncate">{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 opacity-80 hover:opacity-100 transition-opacity"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
