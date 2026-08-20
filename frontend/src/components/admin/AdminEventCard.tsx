"use client";

import { useState } from "react";
import Link from "next/link";
import { Event } from "@/types";
import { api, ApiClientError } from "@/lib/api";

interface AdminEventCardProps {
  event: Event;
  onDeleteSuccess?: () => void;
}

export default function AdminEventCard({ event, onDeleteSuccess }: AdminEventCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formattedDate = new Date(event.event_date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const totalSeats = Number(event.total_rows) * Number(event.total_cols);

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      await api.deleteEvent(event.id);
      setShowConfirm(false);
      if (onDeleteSuccess) {
        onDeleteSuccess();
      }
    } catch (err: unknown) {
      setError(err instanceof ApiClientError ? err.message : "Failed to delete event.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="glass-panel event-card">
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
          <h3 className="event-title">{event.name}</h3>
          <span
            style={{
              fontSize: "0.75rem",
              background: "rgba(13, 148, 136, 0.12)",
              color: "var(--accent-teal-text)",
              padding: "0.2rem 0.5rem",
              borderRadius: "4px",
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            Active
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

      {error && (
        <div className="alert alert-error" style={{ margin: "0.5rem 0", fontSize: "0.8rem", padding: "0.5rem" }}>
          {error}
        </div>
      )}

      {showConfirm ? (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            padding: "0.75rem",
            borderRadius: "8px",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          <p style={{ fontSize: "0.8rem", color: "#991b1b", fontWeight: 600, margin: 0 }}>
            Delete &quot;{event.name}&quot;? All seats and bookings will be permanently removed.
          </p>
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button
              className="btn btn-outline"
              onClick={() => setShowConfirm(false)}
              disabled={isDeleting}
              style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
            >
              Cancel
            </button>
            <button
              className="btn btn-red"
              onClick={() => void handleDelete()}
              disabled={isDeleting}
              style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
            >
              {isDeleting ? "Deleting..." : "Confirm Delete"}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Link href={`/admin/events/${event.id}`} className="btn btn-teal" style={{ flex: 1 }}>
            <span>Manage Seats</span>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
          <button
            className="btn btn-outline"
            onClick={() => setShowConfirm(true)}
            title="Delete Event"
            style={{ color: "#dc2626", borderColor: "#fca5a5" }}
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
