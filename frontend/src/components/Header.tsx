"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export default function Header({ onToggleSidebar }: HeaderProps) {
  const pathname = usePathname();

  const isAdmin = pathname.startsWith("/admin");

  return (
    <header className="viewport-header">
      <div className="header-context">
        {onToggleSidebar && (
          <button className="mobile-menu-toggle" onClick={onToggleSidebar} aria-label="Toggle navigation menu">
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}

        <Link href="/" className="header-mobile-brand">
          <div className="header-brand-mark">
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 18v3h2v-3h12v3h2v-3c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v9c0 1.1.9 2 2 2z" />
              <path d="M4 7h16v7H4z" />
            </svg>
          </div>
          <span>SeatBook</span>
        </Link>

        <div className="header-page-context">
          <span className="header-page-label">
            {isAdmin ? "Administration" : "Events"}
          </span>
        </div>
      </div>

      <div className="header-actions">
        {isAdmin ? (
          <span className="header-mode-badge">
            <span className="header-mode-dot" />
            Admin Mode
          </span>
        ) : (
          <span className="header-mode-badge">
            <span className="header-mode-dot" />
            Event Booking
          </span>
        )}
      </div>
    </header>
  );
}