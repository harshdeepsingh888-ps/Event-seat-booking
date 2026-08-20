"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();

  const isCatalogActive =
    pathname === "/" || pathname.startsWith("/events");

  const isAdminActive = pathname.startsWith("/admin");

  useEffect(() => {
    if (onClose) {
      onClose();
    }
  }, [pathname, onClose]);

  return (
    <>
      {isOpen && <div className="sidebar-backdrop" onClick={onClose} />}
      <aside className={`sidebar-dock ${isOpen ? "open" : ""}`}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Link href="/" className="sidebar-brand">
              <div className="brand-icon-box">
                <svg
                  width="20"
                  height="20"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M4 18v3h2v-3h12v3h2v-3c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v9c0 1.1.9 2 2 2z" />
                  <path d="M4 7h16v7H4z" />
                </svg>
              </div>
              <span>SeatBook</span>
            </Link>

            {onClose && (
              <button className="sidebar-close-btn" onClick={onClose} aria-label="Close menu">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          <nav className="sidebar-nav">
            <div className="nav-section-title">Workspace</div>

            <Link
              href="/"
              className={`sidebar-link ${
                isCatalogActive ? "active" : ""
              }`}
            >
              <svg
                width="18"
                height="18"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>

              <span>Events Catalog</span>
            </Link>

            <Link
              href="/admin"
              className={`sidebar-link ${
                isAdminActive ? "active" : ""
              }`}
            >
              <svg
                width="18"
                height="18"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M4 19V5" />
                <path d="M4 19h16" />
                <path d="M7 16v-4" />
                <path d="M11 16V8" />
                <path d="M15 16v-6" />
                <path d="M19 16V6" />
              </svg>

              <span>Admin Console</span>
            </Link>
          </nav>
        </div>

        <div className="sidebar-scope">
          <div className="sidebar-scope-label">
            Assignment Scope
          </div>

          <p>
            Event management, seat inventory,
            booking and concurrency-safe reservations.
          </p>
        </div>
      </aside>
    </>
  );
}