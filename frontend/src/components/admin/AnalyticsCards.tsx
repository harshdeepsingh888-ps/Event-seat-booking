import { EventSummary } from "@/types";

interface AnalyticsCardsProps {
  summary: EventSummary;
}

export default function AnalyticsCards({ summary }: AnalyticsCardsProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "1.25rem",
      }}
    >
      <div className="stat-card">
        <div className="stat-icon-box stat-icon-total">
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.04em" }}>
            Total Capacity
          </div>
          <div className="stat-val">{summary.total_seats}</div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "0.15rem" }}>
            Generated seats
          </div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon-box stat-icon-available">
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <div style={{ fontSize: "0.75rem", color: "var(--accent-teal)", textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.04em" }}>
            Available Seats
          </div>
          <div className="stat-val" style={{ color: "var(--accent-teal)" }}>{summary.available_seats}</div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "0.15rem" }}>
            Open for booking
          </div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon-box stat-icon-booked">
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <div>
          <div style={{ fontSize: "0.75rem", color: "#e11d48", textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.04em" }}>
            Booked Seats
          </div>
          <div className="stat-val" style={{ color: "#e11d48" }}>{summary.booked_seats}</div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "0.15rem" }}>
            User reservations
          </div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon-box stat-icon-blocked">
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>
        <div>
          <div style={{ fontSize: "0.75rem", color: "#d97706", textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.04em" }}>
            Blocked Seats
          </div>
          <div className="stat-val" style={{ color: "#d97706" }}>{summary.blocked_seats}</div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "0.15rem" }}>
            Admin hold / VIP
          </div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon-box stat-icon-revenue">
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
        <div>
          <div style={{ fontSize: "0.75rem", color: "#166534", textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.04em" }}>
            Occupancy Rate
          </div>
          <div className="stat-val" style={{ color: "#166534" }}>{summary.occupancy_percentage}%</div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "0.15rem" }}>
            {summary.booked_seats} / {summary.total_seats} filled
          </div>
        </div>
      </div>
    </div>
  );
}
