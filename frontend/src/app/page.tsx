"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Event } from "@/types";
import { api, ApiClientError } from "@/lib/api";

export default function EventsCatalogPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchEvents = async () => {
      try {
        const data = await api.getEvents();

        if (!cancelled) {
          setEvents(data);
          setError(null);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const message =
            err instanceof ApiClientError
              ? err.message
              : "Failed to load events.";

          setError(message);
          setLoading(false);
        }
      }
    };

    void fetchEvents();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        <div>
          <div
            style={{
              fontSize: "0.8rem",
              color: "var(--text-muted)",
              fontWeight: 700,
              marginBottom: "0.3rem",
            }}
          >
            SeatBook &gt; Events
          </div>

          <h1
            style={{
              fontSize: "2rem",
              fontWeight: 800,
              color: "var(--text-primary)",
            }}
          >
            Upcoming Events
          </h1>

          <p
            style={{
              color: "var(--text-secondary)",
              marginTop: "0.35rem",
              fontSize: "0.9rem",
            }}
          >
            Browse events and reserve your seats.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="card-panel"
              style={{
                minHeight: "190px",
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
              }}
            >
              <div
                className="skeleton"
                style={{ height: "24px", width: "65%" }}
              />
              <div
                className="skeleton"
                style={{ height: "16px", width: "45%" }}
              />
              <div
                className="skeleton"
                style={{
                  height: "40px",
                  width: "100%",
                  marginTop: "auto",
                }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <div>
        <div
          style={{
            fontSize: "0.8rem",
            color: "var(--text-muted)",
            fontWeight: 700,
            marginBottom: "0.3rem",
          }}
        >
          SeatBook &gt; Events
        </div>

        <h1
          style={{
            fontSize: "2rem",
            fontWeight: 800,
            color: "var(--text-primary)",
          }}
        >
          Upcoming Events
        </h1>

        <p
          style={{
            color: "var(--text-secondary)",
            marginTop: "0.35rem",
            fontSize: "0.9rem",
          }}
        >
          Discover upcoming events and choose your seats.
        </p>
      </div>

      {error && (
        <div className="alert alert-error">
          <svg
            width="20"
            height="20"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>{error}</div>
        </div>
      )}

      {!error && events.length === 0 && (
        <div
          className="card-panel"
          style={{
            padding: "3.5rem 2rem",
            textAlign: "center",
          }}
        >
          <h3
            style={{
              fontSize: "1.35rem",
              color: "var(--text-primary)",
              fontWeight: 800,
            }}
          >
            No Upcoming Events
          </h3>

          <p
            style={{
              color: "var(--text-secondary)",
              marginTop: "0.5rem",
            }}
          >
            There are currently no events available for booking.
          </p>
        </div>
      )}

      {!error && events.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              style={{
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <article
                className="card-panel"
                style={{
                  minHeight: "190px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  cursor: "pointer",
                }}
              >
                <div>
                  <h2
                    style={{
                      color: "var(--text-primary)",
                      fontSize: "1.2rem",
                      fontWeight: 800,
                    }}
                  >
                    {event.name}
                  </h2>

                  <p
                    style={{
                      color: "var(--text-secondary)",
                      marginTop: "0.5rem",
                      fontSize: "0.9rem",
                    }}
                  >
                    {new Date(event.event_date).toLocaleString()}
                  </p>
                </div>

                <div
                  style={{
                    marginTop: "1.5rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "1rem",
                  }}
                >
                  <span
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "0.8rem",
                    }}
                  >
                    {event.total_rows} rows × {event.total_cols} columns
                  </span>

                  <span
                    className="btn btn-teal"
                    style={{
                      pointerEvents: "none",
                    }}
                  >
                    View Event
                  </span>
                </div>
              </article>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}