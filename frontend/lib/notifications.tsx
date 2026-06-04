"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

export type ToastType = "success" | "warning" | "error" | "info";

export type Toast = {
  id: string;
  type: ToastType;
  message: string;
  detail?: string;
};

export type Notification = Toast & {
  seenAt: number | null;
  createdAt: number;
};

type NotificationContextValue = {
  toasts: Toast[];
  notifications: Notification[];
  unreadCount: number;
  notify: (type: ToastType, message: string, detail?: string) => void;
  dismissToast: (id: string) => void;
  markAllSeen: () => void;
  clearNotifications: () => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

const TOAST_DURATION_MS = 5000;
const MAX_NOTIFICATIONS = 50;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const notify = useCallback((type: ToastType, message: string, detail?: string) => {
    const id = crypto.randomUUID();
    const now = Date.now();

    const toast: Toast = { id, type, message, detail };
    const notification: Notification = { id, type, message, detail, seenAt: null, createdAt: now };

    setToasts((prev) => [...prev, toast]);
    setNotifications((prev) => [notification, ...prev].slice(0, MAX_NOTIFICATIONS));

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, TOAST_DURATION_MS);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const markAllSeen = useCallback(() => {
    setNotifications((prev) =>
      prev.map((n) => (n.seenAt === null ? { ...n, seenAt: Date.now() } : n)),
    );
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter((n) => n.seenAt === null).length;

  return (
    <NotificationContext.Provider
      value={{ toasts, notifications, unreadCount, notify, dismissToast, markAllSeen, clearNotifications }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
