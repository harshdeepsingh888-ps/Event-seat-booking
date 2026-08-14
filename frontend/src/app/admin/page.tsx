"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ApiClientError, api } from "@/lib/api";
import { Event } from "@/types";
import AdminEventCard from "@/components/admin/AdminEventCard";

export default function AdminPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await api.getEvents();
      setEvents(data);
    } catch (err: unknown) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : "Failed to load events."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadEvents();
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "2rem",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "0.8rem",
              color: "var(--text-muted)",
              fontWeight: 700,
              marginBottom: "0.35rem",
            }}
          >
            Operations &gt; Events
          </div>

          <h1
            style={{
              fontSize: "2rem",
              fontWeight: 800,
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            Admin Console
          </h1>

          <p
            style={{
              color: "var(--text-secondary)",
              marginTop: "0.4rem",
            }}
          >
            Manage events, seats, and booking activity.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            className="btn btn-outline"
            onClick={() => void loadEvents()}
            disabled={loading}
          >
            Refresh
          </button>

          <Link href="/admin?create=true" className="btn btn-teal">
            Create Event
          </Link>
        </div>
      </div>

      {loading ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1rem",
          }}
        >
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="skeleton"
              style={{ height: "190px", width: "100%" }}
            />
          ))}
        </div>
      ) : error ? (
        <div className="alert alert-error">
          <div>{error}</div>
        </div>
      ) : events.length === 0 ? (
        <div
          className="card"
          style={{
            padding: "3rem 2rem",
            textAlign: "center",
          }}
        >
          <h2
            style={{
              fontSize: "1.25rem",
              fontWeight: 800,
              marginBottom: "0.5rem",
            }}
          >
            No events found
          </h2>

          <p
            style={{
              color: "var(--text-secondary)",
              marginBottom: "1.5rem",
            }}
          >
            Create your first event to start managing seats and bookings.
          </p>

          <Link href="/admin?create=true" className="btn btn-teal">
            Create Event
          </Link>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1rem",
          }}
        >
          {events.map((event) => (
            <AdminEventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
