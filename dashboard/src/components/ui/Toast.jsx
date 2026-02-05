/**
 * Toast - Notification system for success/error/info feedback
 * Usage: const { showToast } = useToast(); showToast('Synced!', 'success');
 */
import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';
import { iconSizes, interactive } from '../../styles/designTokens';

const ToastContext = createContext(null);

// Toast variants with icons and colors
const variants = {
  success: {
    icon: CheckCircle,
    bg: 'bg-green-50 dark:bg-green-900/30',
    border: 'border-green-200 dark:border-green-800',
    iconColor: 'text-green-600 dark:text-green-400',
    textColor: 'text-green-800 dark:text-green-200',
  },
  error: {
    icon: AlertCircle,
    bg: 'bg-red-50 dark:bg-red-900/30',
    border: 'border-red-200 dark:border-red-800',
    iconColor: 'text-red-600 dark:text-red-400',
    textColor: 'text-red-800 dark:text-red-200',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-amber-50 dark:bg-amber-900/30',
    border: 'border-amber-200 dark:border-amber-800',
    iconColor: 'text-amber-600 dark:text-amber-400',
    textColor: 'text-amber-800 dark:text-amber-200',
  },
  info: {
    icon: Info,
    bg: 'bg-blue-50 dark:bg-blue-900/30',
    border: 'border-blue-200 dark:border-blue-800',
    iconColor: 'text-blue-600 dark:text-blue-400',
    textColor: 'text-blue-800 dark:text-blue-200',
  },
};

function Toast({ id, message, variant = 'info', onDismiss }) {
  const config = variants[variant] || variants.info;
  const Icon = config.icon;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg ${config.bg} ${config.border} animate-[slideIn_0.2s_ease-out]`}
    >
      <Icon className={`${iconSizes.md} ${config.iconColor} flex-shrink-0`} aria-hidden="true" />
      <p className={`text-sm font-medium ${config.textColor} flex-1`}>{message}</p>
      <button
        onClick={() => onDismiss(id)}
        className={`p-1 rounded-full ${config.textColor} hover:bg-black/10 dark:hover:bg-white/10 ${interactive.transition} focus:outline-none focus:ring-2 focus:ring-current`}
        aria-label="Dismiss notification"
      >
        <X className={iconSizes.sm} aria-hidden="true" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, variant = 'info', duration = 5000) => {
    const id = Date.now() + Math.random();

    setToasts((prev) => [...prev, { id, message, variant }]);

    // Auto-dismiss after duration
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }

    return id;
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast, dismissAll }}>
      {children}

      {/* Toast container - fixed bottom right */}
      <div
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
        aria-label="Notifications"
      >
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast
              id={toast.id}
              message={toast.message}
              variant={toast.variant}
              onDismiss={dismissToast}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export default Toast;
