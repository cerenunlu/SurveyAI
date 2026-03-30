"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getNavigationItems } from "@/components/layout/navigation";
import { PageHeaderProvider, useResolvedPageHeader } from "@/components/layout/PageHeaderContext";
import { BellIcon, CollapseIcon, MenuIcon, SearchIcon, SparkIcon } from "@/components/ui/Icons";
import { useAuth } from "@/lib/auth";
import { useLanguage, useTranslations } from "@/lib/i18n/LanguageContext";
import type { Language } from "@/lib/i18n";

const pageMetaKeys: Record<string, string> = {
  "/": "shell.pageMeta.dashboard",
  "/surveys": "shell.pageMeta.surveys",
  "/operations": "shell.pageMeta.operations",
  "/contacts": "shell.pageMeta.contacts",
  "/analytics": "shell.pageMeta.analytics",
  "/calling-ops": "shell.pageMeta.callingOps",
};

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <PageHeaderProvider>
      <AppShellFrame>{children}</AppShellFrame>
    </PageHeaderProvider>
  );
}

function AppShellFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const { language, setLanguage } = useLanguage();
  const { status, currentUser, logout } = useAuth();
  const { t } = useTranslations();
  const pageHeaderOverride = useResolvedPageHeader();

  const navigationItems = getNavigationItems(t);
  const isAuthRoute = pathname === "/login";

  useEffect(() => {
    if (status === "unauthenticated" && !isAuthRoute) {
      router.replace("/login");
    }
  }, [isAuthRoute, router, status]);

  if (isAuthRoute) {
    return <>{children}</>;
  }

  if (status !== "authenticated" || !currentUser) {
    return (
      <div className="auth-shell-loading">
        <div className="panel-card auth-shell-loading-card">
          <span className="eyebrow">Session</span>
          <h1>Loading your workspace</h1>
          <p>We are resolving your current user and company context before opening the app.</p>
        </div>
      </div>
    );
  }

  const currentMeta = (() => {
    let key = pageMetaKeys[pathname] ?? pageMetaKeys["/"];

    if (pathname === "/surveys/new") {
      key = "shell.pageMeta.surveyCreate";
    } else if (pathname === "/operations/new") {
      key = "shell.pageMeta.operationCreate";
    } else if (pathname.startsWith("/surveys/")) {
      key = "shell.pageMeta.surveyDetail";
    } else if (pathname.startsWith("/operations/")) {
      key = "shell.pageMeta.operationDetail";
    }

    const baseMeta = {
      title: t(`${key}.title`),
      subtitle: t(`${key}.subtitle`),
    };

    return {
      title: pageHeaderOverride?.title ?? baseMeta.title,
      subtitle: pageHeaderOverride?.subtitle ?? baseMeta.subtitle,
    };
  })();

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <div className={["app-shell", isSidebarCollapsed ? "is-sidebar-collapsed" : ""].filter(Boolean).join(" ")}>
      {isMobileNavOpen ? (
        <button className="mobile-overlay" aria-label={t("shell.sidebar.closeNavigation")} onClick={() => setIsMobileNavOpen(false)} />
      ) : null}

      <aside
        className={[
          "sidebar",
          isSidebarCollapsed ? "is-collapsed" : "",
          isMobileNavOpen ? "is-open" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="sidebar-content">
          <div className="brand">
            <div className="brand-mark" />
            {!isSidebarCollapsed ? (
              <div className="brand-copy">
                <p className="brand-title">SurveyAI</p>
                <p className="brand-subtitle">{t("shell.brandSubtitle")}</p>
              </div>
            ) : null}
          </div>

          <button className="sidebar-toggle desktop-only" onClick={() => setIsSidebarCollapsed((value) => !value)}>
            <span>{isSidebarCollapsed ? t("shell.sidebar.expand") : t("shell.sidebar.collapse")}</span>
            <CollapseIcon className="nav-icon" />
          </button>

          {!isSidebarCollapsed ? <div className="sidebar-group-label">{t("shell.sidebar.navigation")}</div> : null}
          <nav className="nav-list">
            {navigationItems.map((item) => {
              const isActive = item.href === "/" ? pathname === item.href : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  className={["nav-item", isActive ? "is-active" : ""].filter(Boolean).join(" ")}
                  href={item.href}
                  onClick={() => setIsMobileNavOpen(false)}
                >
                  {item.icon}
                  {!isSidebarCollapsed ? (
                    <span className="nav-copy">
                      <span className="nav-title">{item.label}</span>
                      <span className="nav-description">{item.description}</span>
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          {!isSidebarCollapsed ? (
            <div className="sidebar-footer">
              <div className="eyebrow">
                <SparkIcon className="nav-icon" />
                {t("shell.sidebar.dailyFocus")}
              </div>
              <strong>{t("shell.sidebar.readinessTitle")}</strong>
              <p>{t("shell.sidebar.readinessDescription")}</p>
            </div>
          ) : null}
        </div>
      </aside>

      <main className="app-main">
        <div className="main-frame">
          <header className="topbar">
            <div className="header-cluster">
              <button className="mobile-menu-button mobile-only" onClick={() => setIsMobileNavOpen(true)}>
                <MenuIcon className="nav-icon" />
                {t("shell.topbar.menu")}
              </button>
              <div className="topbar-copy">
                <h1>{currentMeta.title}</h1>
                <p>{currentMeta.subtitle}</p>
              </div>
            </div>

            <div className="topbar-actions">
              <div className="language-switcher" role="group" aria-label={t("shell.topbar.languageLabel")}>
                <LanguageButton current={language} code="tr" label={t("shell.topbar.tr")} onSelect={setLanguage} />
                <LanguageButton current={language} code="en" label={t("shell.topbar.en")} onSelect={setLanguage} />
              </div>
              <label className="search-field topbar-search">
                <SearchIcon className="nav-icon" />
                <input placeholder={t("shell.topbar.searchPlaceholder")} />
              </label>
              <div className="topbar-account">
                <div className="topbar-account-copy">
                  <strong>{currentUser.user.fullName}</strong>
                  <span>{currentUser.company.name}</span>
                </div>
                <button type="button" className="button-secondary compact-button" onClick={() => void handleLogout()}>
                  Log Out
                </button>
              </div>
              <button className="icon-button notification-button" style={{ padding: "12px" }} aria-label={t("shell.topbar.notifications")}>
                <BellIcon className="nav-icon" />
              </button>
            </div>
          </header>

          {children}
        </div>
      </main>
    </div>
  );
}

function LanguageButton({
  current,
  code,
  label,
  onSelect,
}: {
  current: Language;
  code: Language;
  label: string;
  onSelect: (language: Language) => void;
}) {
  return (
    <button
      type="button"
      className={["language-button", current === code ? "is-active" : ""].filter(Boolean).join(" ")}
      aria-pressed={current === code}
      onClick={() => onSelect(code)}
    >
      {label}
    </button>
  );
}
