"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type PageHeaderOverride = {
  title?: string;
  subtitle?: ReactNode;
  action?: ReactNode;
};

type PageHeaderContextValue = {
  override: PageHeaderOverride | null;
  setOverride: (override: PageHeaderOverride | null) => void;
};

const PageHeaderContext = createContext<PageHeaderContextValue | null>(null);

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [override, setOverride] = useState<PageHeaderOverride | null>(null);

  const value = useMemo<PageHeaderContextValue>(() => ({ override, setOverride }), [override]);

  return <PageHeaderContext.Provider value={value}>{children}</PageHeaderContext.Provider>;
}

export function useResolvedPageHeader() {
  const context = useContext(PageHeaderContext);

  if (!context) {
    throw new Error("useResolvedPageHeader must be used within PageHeaderProvider.");
  }

  return context.override;
}

export function usePageHeaderOverride(override: PageHeaderOverride | null) {
  const context = useContext(PageHeaderContext);

  if (!context) {
    throw new Error("usePageHeaderOverride must be used within PageHeaderProvider.");
  }

  const { setOverride } = context;
  const title = override?.title;
  const subtitle = override?.subtitle;
  const action = override?.action;

  useEffect(() => {
    if (!title && !subtitle && !action) {
      setOverride(null);
      return;
    }

    setOverride({
      title,
      subtitle,
      action,
    });

    return () => {
      setOverride(null);
    };
  }, [action, setOverride, subtitle, title]);
}

