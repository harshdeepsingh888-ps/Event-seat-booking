import Link from "next/link";
import { Event } from "@/types";

interface AdminEventCardProps {
  event: Event;
}

export default function AdminEventCard({ event }: AdminEventCardProps) {
  const formattedDate = new Date(event.event_date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const totalSeats = Number(event.total_rows) * Number(event.total_cols);

  return (
    <div className="glass-panel event-card">
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <h3 className="event-title">{event.name}</h3>
          <span
            style={{
              fontSize: "0.75rem",
              background: "rgba(99, 102, 241, 0.15)",
              color: "var(--seat-selected-border)",
              padding: "0.2rem 0.5rem",
              borderRadius: "4px",
              fontWeight: 600,
            }}
          >
            Admin Mode
          </span>
        </div>
        <div className="event-meta" style={{ marginTop: "0.75rem" }}>
          <div className="event-meta-item">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{formattedDate}</span>
          </div>
          <div className="event-meta-item">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span>
              {totalSeats} Seats ({event.total_rows} × {event.total_cols} Layout)
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.75rem" }}>
        <Link href={`/admin/events/${event.id}`} className="btn btn-primary" style={{ flex: 1 }}>
          <span>Manage Event & Seats</span>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
