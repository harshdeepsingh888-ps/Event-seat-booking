import { EventSummary } from "@/types";

interface AnalyticsCardsProps {
  summary: EventSummary;
}

export default function AnalyticsCards({ summary }: AnalyticsCardsProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: "1.25rem",
      }}
    >
      <div className="glass-panel" style={{ padding: "1.25rem" }}>
        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
          Total Capacity
        </div>
        <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "0.25rem" }}>
          {summary.total_seats}
        </div>
        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
          Generated seat grid
        </div>
      </div>

      <div className="glass-panel" style={{ padding: "1.25rem" }}>
        <div style={{ fontSize: "0.8rem", color: "var(--seat-available-text)", textTransform: "uppercase", fontWeight: 600 }}>
          Available Seats
        </div>
        <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--seat-available-text)", marginTop: "0.25rem" }}>
          {summary.available_seats}
        </div>
        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
          Open for user booking
        </div>
      </div>

      <div className="glass-panel" style={{ padding: "1.25rem" }}>
        <div style={{ fontSize: "0.8rem", color: "var(--seat-selected-border)", textTransform: "uppercase", fontWeight: 600 }}>
          Booked Seats
        </div>
        <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--seat-selected-border)", marginTop: "0.25rem" }}>
          {summary.booked_seats}
        </div>
        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
          Confirmed user reservations
        </div>
      </div>

      <div className="glass-panel" style={{ padding: "1.25rem" }}>
        <div style={{ fontSize: "0.8rem", color: "var(--seat-blocked-text)", textTransform: "uppercase", fontWeight: 600 }}>
          Blocked Seats
        </div>
        <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--seat-blocked-text)", marginTop: "0.25rem" }}>
          {summary.blocked_seats}
        </div>
        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
          Admin out-of-service / VIP
        </div>
      </div>

      <div className="glass-panel" style={{ padding: "1.25rem" }}>
        <div style={{ fontSize: "0.8rem", color: "var(--accent-primary)", textTransform: "uppercase", fontWeight: 600 }}>
          Occupancy Rate
        </div>
        <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#fff", marginTop: "0.25rem" }}>
          {summary.occupancy_percentage}%
        </div>
        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
          {summary.booked_seats} / {summary.total_seats} filled
        </div>
      </div>
    </div>
  );
}
