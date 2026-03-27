"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { navigationItems } from "@/components/layout/navigation";
import { BellIcon, CollapseIcon, MenuIcon, SearchIcon, SparkIcon } from "@/components/ui/Icons";

const pageMeta: Record<string, { title: string; subtitle: string }> = {
  "/": {
    title: "SurveyAI Control Center",
    subtitle: "Monitor surveys, outreach, and response quality from one premium workspace.",
  },
  "/surveys": {
    title: "Survey Programs",
    subtitle: "Shape question flows, watch health metrics, and manage live survey inventory.",
  },
  "/campaigns": {
    title: "Campaign Performance",
    subtitle: "Track delivery, response lift, and operator efficiency across active campaigns.",
  },
  "/contacts": {
    title: "Audience Intelligence",
    subtitle: "Keep your contact universe clean, segmented, and ready for activation.",
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
                <p className="brand-subtitle">Control Platform</p>
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
                AI Ops
              </div>
              <strong>Operator readiness</strong>
              <p>Mock environment is seeded with premium UI states for surveys, campaigns, and contact intelligence.</p>
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
              <label className="search-field">
                <SearchIcon className="nav-icon" />
                <input placeholder="Search surveys, campaigns, contacts..." />
              </label>
              <button className="icon-button" style={{ padding: "12px" }} aria-label="Notifications">
                <BellIcon className="nav-icon" />
              </button>
              <button className="button-primary desktop-only">
                <SparkIcon className="nav-icon" />
                New Workflow
              </button>
            </div>
          </header>

          {children}
        </div>
      </main>
    </div>
  );
}
