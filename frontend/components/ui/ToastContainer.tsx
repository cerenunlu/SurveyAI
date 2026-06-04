"use client";

import { useNotifications } from "@/lib/notifications";

const ICON: Record<string, string> = {
  success: "✓",
  warning: "⚠",
  error: "✕",
  info: "i",
};

export function ToastContainer() {
  const { toasts, dismissToast } = useNotifications();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" role="region" aria-label="Bildirimler" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          <span className="toast-icon">{ICON[toast.type]}</span>
          <div className="toast-body">
            <strong className="toast-message">{toast.message}</strong>
            {toast.detail ? <span className="toast-detail">{toast.detail}</span> : null}
          </div>
          <button
            type="button"
            className="toast-close"
            aria-label="Kapat"
            onClick={() => dismissToast(toast.id)}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
