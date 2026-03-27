"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { navigationItems } from "@/components/layout/navigation";
import { BellIcon, CollapseIcon, MenuIcon, SearchIcon, SparkIcon } from "@/components/ui/Icons";

const pageMeta: Record<string, { title: string; subtitle: string }> = {
  "/": {
    title: "Operations Overview",
    subtitle: "Track campaign health, survey readiness, contact flow, and operational issues from one control layer.",
  },
  "/surveys": {
    title: "Surveys",
    subtitle: "Manage survey drafts, publishing status, and live program inventory.",
  },
  "/campaigns": {
    title: "Campaigns",
    subtitle: "Monitor launch readiness, active pacing, and cross-channel execution.",
  },
  "/contacts": {
    title: "Contacts",
    subtitle: "Keep contact files validated, segmented, and ready for campaign assignment.",
  },
  "/analytics": {
    title: "Analytics",
    subtitle: "Review completions, response lift, and delivery performance across the portfolio.",
  },
  "/calling-ops": {
    title: "Calling Ops",
    subtitle: "Watch queue volume, call job readiness, and coordinator attention points.",
  },
};

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const currentMeta = useMemo(() => {
    if (pathname.startsWith("/surveys/")) {
      return {
        title: "Survey Detail",
        subtitle: "Inspect survey health, response posture, and operational notes.",
      };
    }

    if (pathname.startsWith("/campaigns/")) {
      return {
        title: "Campaign Detail",
        subtitle: "Review pacing, channel mix, and lifecycle movement in one view.",
      };
    }

    return pageMeta[pathname] ?? pageMeta["/"];
  }, [pathname]);

  return (
    <div className="app-shell">
      {isMobileNavOpen ? <button className="mobile-overlay" aria-label="Close navigation" onClick={() => setIsMobileNavOpen(false)} /> : null}

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
                <p className="brand-subtitle">Research Operations</p>
              </div>
            ) : null}
          </div>

          <button className="sidebar-toggle desktop-only" onClick={() => setIsSidebarCollapsed((value) => !value)}>
            <span>{isSidebarCollapsed ? "Expand" : "Collapse"}</span>
            <CollapseIcon className="nav-icon" />
          </button>

          {!isSidebarCollapsed ? <div className="sidebar-group-label">Navigation</div> : null}
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
                Daily Focus
              </div>
              <strong>Operational readiness</strong>
              <p>Use the dashboard to triage issues, then move into surveys, campaigns, contacts, and calling workflows to execute.</p>
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
                Menu
              </button>
              <div className="topbar-copy">
                <h1>{currentMeta.title}</h1>
                <p>{currentMeta.subtitle}</p>
              </div>
            </div>

            <div className="topbar-actions">
              <label className="search-field topbar-search">
                <SearchIcon className="nav-icon" />
                <input placeholder="Search surveys, campaigns, contacts..." />
              </label>
              <button className="icon-button notification-button" style={{ padding: "12px" }} aria-label="Notifications">
                <BellIcon className="nav-icon" />
              </button>
              <Link href="/surveys" className="button-primary topbar-cta desktop-only">
                <SparkIcon className="nav-icon" />
                Create Survey
              </Link>
            </div>
          </header>

          {children}
        </div>
      </main>
    </div>
  );
}
