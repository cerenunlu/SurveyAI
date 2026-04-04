"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getNavigationItems } from "@/components/layout/navigation";
import { PageHeaderProvider, useResolvedPageHeader } from "@/components/layout/PageHeaderContext";
import { BellIcon, CollapseIcon, MenuIcon, SearchIcon } from "@/components/ui/Icons";
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
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { language, setLanguage } = useLanguage();
  const { status, currentUser, logout } = useAuth();
  const { t } = useTranslations();
  const pageHeaderOverride = useResolvedPageHeader();

  const navigationItems = getNavigationItems(t);
  const isAuthRoute = pathname === "/login";
  const isDashboardHome = pathname === "/";
  const isSurveysRoute = pathname === "/surveys" || pathname.startsWith("/surveys/");

  useEffect(() => {
    setIsUserMenuOpen(false);
    setIsMobileNavOpen(false);
  }, [pathname]);

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
          <span className="eyebrow">Oturum</span>
          <h1>Calisma alani hazirlaniyor</h1>
          <p>Kullanici ve sirket baglami dogrulaniyor. Ardindan panel acilacak.</p>
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
  const breadcrumbs = buildBreadcrumbs(pathname, currentMeta.title, navigationItems, t);

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
                <p className="brand-subtitle">Arastirma Operasyonlari</p>
              </div>
            ) : null}
            <button
              className="sidebar-toggle desktop-only"
              aria-label={isSidebarCollapsed ? t("shell.sidebar.expand") : t("shell.sidebar.collapse")}
              onClick={() => setIsSidebarCollapsed((value) => !value)}
            >
              <CollapseIcon className="nav-icon" />
            </button>
          </div>

          <label
            className={["search-field", "sidebar-search", isSidebarCollapsed ? "is-collapsed" : ""].filter(Boolean).join(" ")}
            aria-label="Genel arama"
          >
            <SearchIcon className="nav-icon" />
            {!isSidebarCollapsed ? (
              <>
                <input
                  type="search"
                  placeholder="Ara"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
                <span className="topbar-search-shortcut">35K</span>
              </>
            ) : null}
          </label>

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

          <div className="sidebar-bottom">
            <div className="topbar-account-menu sidebar-account-menu">
              <button
                type="button"
                className="topbar-account sidebar-account"
                aria-expanded={isUserMenuOpen}
                onClick={() => setIsUserMenuOpen((value) => !value)}
              >
                <span className="topbar-account-avatar">{currentUser.user.fullName.slice(0, 1).toUpperCase()}</span>
                {!isSidebarCollapsed ? (
                  <div className="topbar-account-copy">
                    <span className="topbar-account-label">Sirket</span>
                    <strong>{currentUser.company.name}</strong>
                    <span>{currentUser.user.fullName}</span>
                  </div>
                ) : null}
              </button>

              <div
                className={[
                  "topbar-account-panel",
                  "sidebar-account-panel",
                  isUserMenuOpen ? "is-open" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <div className="topbar-account-panel-copy">
                  <strong>{currentUser.user.fullName}</strong>
                  <span>{currentUser.user.email}</span>
                </div>
                <div className="topbar-account-panel-copy">
                  <strong>{currentUser.company.name}</strong>
                  <span>Mevcut calisma alani</span>
                </div>
                <button type="button" className="button-secondary compact-button topbar-account-notification">
                  <span className="topbar-account-notification-copy">
                    <BellIcon className="nav-icon" />
                    <span>Bildirimler</span>
                  </span>
                  <span className="notification-indicator" />
                </button>
                <button
                  type="button"
                  className="button-secondary compact-button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    void handleLogout();
                  }}
                >
                  Cikis Yap
                </button>
              </div>
            </div>

            <div
              className={[
                "language-switcher",
                "sidebar-language-switcher",
                isSidebarCollapsed ? "is-collapsed" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              role="group"
              aria-label={t("shell.topbar.languageLabel")}
            >
              <LanguageButton current={language} code="tr" label={t("shell.topbar.tr")} onSelect={setLanguage} />
              <LanguageButton current={language} code="en" label={t("shell.topbar.en")} onSelect={setLanguage} />
            </div>
          </div>
        </div>
      </aside>

      <main className="app-main">
        <div className="main-frame">
          <header
            className={[
              "topbar",
              isDashboardHome ? "is-dashboard-topbar" : "",
              isSurveysRoute ? "is-surveys-topbar" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <div className="header-cluster topbar-context">
              <button className="mobile-menu-button mobile-only" onClick={() => setIsMobileNavOpen(true)}>
                <MenuIcon className="nav-icon" />
                Gezinme
              </button>
              <div className="brand-mark header-brand-mark" aria-hidden="true" />
              <div
                className={[
                  "topbar-copy",
                  "topbar-copy-compact",
                  isDashboardHome ? "is-dashboard-copy" : "",
                  isSurveysRoute ? "is-surveys-copy" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {breadcrumbs.length > 0 ? (
                  <div className="topbar-breadcrumbs" aria-label="Sayfa yolu">
                    {breadcrumbs.map((crumb, index) => (
                      <span key={`${crumb}-${index}`} className="topbar-breadcrumb-item">
                        {index > 0 ? <span className="topbar-breadcrumb-separator">/</span> : null}
                        <span>{crumb}</span>
                      </span>
                    ))}
                  </div>
                ) : !isSurveysRoute ? (
                  <span className="topbar-kicker">{currentUser.company.name}</span>
                ) : null}
                <h1>{currentMeta.title}</h1>
                {currentMeta.subtitle ? <p>{currentMeta.subtitle}</p> : null}
              </div>
            </div>

            {pageHeaderOverride?.action ? (
              <div className="topbar-actions page-header-actions">
                {pageHeaderOverride.action}
              </div>
            ) : null}

          </header>

          {children}
        </div>
      </main>
    </div>
  );
}

function buildBreadcrumbs(
  pathname: string,
  currentTitle: string,
  navigationItems: ReturnType<typeof getNavigationItems>,
  t: (path: string) => string,
) {
  if (pathname === "/") {
    return [currentTitle];
  }

  const findNavLabel = (href: string) => navigationItems.find((item) => item.href === href)?.label;

  if (pathname === "/surveys") {
    return [findNavLabel("/surveys") ?? currentTitle];
  }

  if (pathname === "/surveys/new") {
    return [findNavLabel("/surveys") ?? t("shell.pageMeta.surveys.title"), currentTitle];
  }

  if (pathname.startsWith("/surveys/")) {
    return [findNavLabel("/surveys") ?? t("shell.pageMeta.surveys.title"), currentTitle];
  }

  if (pathname === "/operations") {
    return [findNavLabel("/operations") ?? currentTitle];
  }

  if (pathname === "/operations/new") {
    return [findNavLabel("/operations") ?? t("shell.pageMeta.operations.title"), currentTitle];
  }

  if (pathname.startsWith("/operations/")) {
    return [findNavLabel("/operations") ?? t("shell.pageMeta.operations.title"), currentTitle];
  }

  return [currentTitle];
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

