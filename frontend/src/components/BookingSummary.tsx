import React from "react";
import { Seat } from "@/types";

interface BookingSummaryProps {
  selectedSeats: Seat[];
  onProceed: () => void;
  onClearSelection: () => void;
}

export default function BookingSummary({
  selectedSeats,
  onProceed,
  onClearSelection,
}: BookingSummaryProps) {
  const count = selectedSeats.length;
  const labels = selectedSeats.map((s) => s.seat_label).join(", ");

  if (count === 0) {
    return (
      <div className="glass-panel booking-bar" style={{ opacity: 0.8 }}>
        <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          Select available seats on the map above to start booking.
        </div>
        <button className="btn btn-primary" disabled>
          Proceed to Booking
        </button>
      </div>
    );
  }

  return (
    <div className="glass-panel booking-bar">
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span
            style={{
              fontSize: "1.1rem",
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            {count} {count === 1 ? "Seat" : "Seats"} Selected
          </span>
          <button
            onClick={onClearSelection}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: "0.8rem",
              textDecoration: "underline",
            }}
          >
            Clear Selection
          </button>
        </div>
        <div
          style={{
            fontSize: "0.875rem",
            color: "var(--seat-available-text)",
            marginTop: "0.2rem",
            maxWidth: "400px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          Seats: <strong style={{ color: "#fff" }}>{labels}</strong>
        </div>
      </div>

      <button className="btn btn-primary" onClick={onProceed}>
        <span>Proceed to Booking</span>
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      </button>
    </div>
  );
}
