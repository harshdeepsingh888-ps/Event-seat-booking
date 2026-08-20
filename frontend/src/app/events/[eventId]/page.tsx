"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ApiClientError, api } from "@/lib/api";
import { BookingResponse, EventDetail } from "@/types";
import SeatGrid from "@/components/SeatGrid";
import SeatLegend from "@/components/SeatLegend";
import BookingSummary from "@/components/BookingSummary";
import BookingFormModal from "@/components/BookingFormModal";

interface PageProps {
  params: Promise<{ eventId: string }>;
}

export default function EventSeatMapPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const eventId = resolvedParams.eventId;

  const [eventDetail, setEventDetail] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successBooking, setSuccessBooking] =
    useState<BookingResponse | null>(null);

  const loadEventDetail = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await api.getEventDetail(eventId);
      setEventDetail(data);

      const currentAvailableIds = new Set(
        data.seats
          .filter((seat) => seat.status === "AVAILABLE")
          .map((seat) => seat.id)
      );

      setSelectedSeatIds((previous) =>
        previous.filter((id) => currentAvailableIds.has(id))
      );
    } catch (err: unknown) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : "Failed to load event details.";

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const fetchEventDetail = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await api.getEventDetail(eventId);

        if (cancelled) {
          return;
        }

        setEventDetail(data);

        const currentAvailableIds = new Set(
          data.seats
            .filter((seat) => seat.status === "AVAILABLE")
            .map((seat) => seat.id)
        );

        setSelectedSeatIds((previous) =>
          previous.filter((id) => currentAvailableIds.has(id))
        );
      } catch (err: unknown) {
        if (cancelled) {
          return;
        }

        const message =
          err instanceof ApiClientError
            ? err.message
            : "Failed to load event details.";

        setError(message);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchEventDetail();

    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const handleToggleSeat = (seatId: string) => {
    setSelectedSeatIds((previous) => {
      if (previous.includes(seatId)) {
        return previous.filter((id) => id !== seatId);
      }

      return [...previous, seatId];
    });
  };

  const handleClearSelection = () => {
    setSelectedSeatIds([]);
  };

  const handleBookingSuccess = (res: BookingResponse) => {
    setIsModalOpen(false);
    setSelectedSeatIds([]);
    setSuccessBooking(res);
    void loadEventDetail();
  };

  const handleConflictError = () => {
    void loadEventDetail();
  };

  if (loading && !eventDetail) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "2rem",
        }}
      >
        <div className="skeleton" style={{ height: "40px", width: "40%" }} />
        <div className="skeleton" style={{ height: "300px", width: "100%" }} />
      </div>
    );
  }

  if (error || !eventDetail) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
        }}
      >
        <Link
          href="/"
          className="btn btn-secondary"
          style={{ width: "fit-content" }}
        >
          &larr; Back to Events
        </Link>

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

          <div>{error || "Event not found."}</div>
        </div>
      </div>
    );
  }

  const formattedDate = new Date(
    eventDetail.event_date
  ).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const selectedSeatsObj = eventDetail.seats.filter((seat) =>
    selectedSeatIds.includes(seat.id)
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "2rem",
      }}
    >
      <div>
        <Link
          href="/"
          className="btn btn-outline"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.6rem",
            marginBottom: "1.25rem",
            fontWeight: 800,
            padding: "0.55rem 1.1rem",
            fontSize: "0.875rem",
            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.04)",
          }}
        >
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to Events Catalog</span>
        </Link>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div>
            <h1 style={{ fontSize: "2.25rem", fontWeight: 800, color: "var(--text-primary)" }}>
              {eventDetail.name}
            </h1>

            <p
              style={{
                color: "var(--text-secondary)",
                marginTop: "0.35rem",
                fontSize: "0.95rem",
              }}
            >
              📅 {formattedDate}
            </p>
          </div>

          <button
            className="btn btn-outline"
            onClick={() => void loadEventDetail()}
            disabled={loading}
          >
            <svg
              width="16"
              height="16"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>Refresh Seat Map</span>
          </button>
        </div>
      </div>

      <div
        className="glass-panel"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "1.25rem",
          padding: "1.5rem",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              textTransform: "uppercase",
              fontWeight: 800,
              letterSpacing: "0.04em",
            }}
          >
            Total Seats
          </div>

          <div
            style={{
              fontSize: "1.65rem",
              fontWeight: 800,
              color: "var(--text-primary)",
              marginTop: "0.2rem",
            }}
          >
            {eventDetail.total_seats}
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: "0.75rem",
              color: "var(--accent-teal)",
              textTransform: "uppercase",
              fontWeight: 800,
              letterSpacing: "0.04em",
            }}
          >
            Available
          </div>

          <div
            style={{
              fontSize: "1.65rem",
              fontWeight: 800,
              color: "var(--accent-teal)",
              marginTop: "0.2rem",
            }}
          >
            {eventDetail.available_seats}
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: "0.75rem",
              color: "#e11d48",
              textTransform: "uppercase",
              fontWeight: 800,
              letterSpacing: "0.04em",
            }}
          >
            Booked
          </div>

          <div
            style={{
              fontSize: "1.65rem",
              fontWeight: 800,
              color: "#e11d48",
              marginTop: "0.2rem",
            }}
          >
            {eventDetail.booked_seats}
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: "0.75rem",
              color: "#d97706",
              textTransform: "uppercase",
              fontWeight: 800,
              letterSpacing: "0.04em",
            }}
          >
            Blocked
          </div>

          <div
            style={{
              fontSize: "1.65rem",
              fontWeight: 800,
              color: "#d97706",
              marginTop: "0.2rem",
            }}
          >
            {eventDetail.blocked_seats}
          </div>
        </div>
      </div>

      {successBooking && (
        <div className="modal-overlay" onClick={() => setSuccessBooking(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "460px" }}>
            <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  background: "#ecfdf5",
                  color: "#059669",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto",
                }}
              >
                <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <div>
                <h3 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--text-primary)" }}>
                  Booking Confirmed!
                </h3>
                <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginTop: "0.35rem" }}>
                  Thank you <strong>{successBooking.booker_name}</strong>! Your seats have been successfully reserved.
                </p>
              </div>

              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid var(--border-card)",
                  padding: "1.25rem",
                  borderRadius: "14px",
                  width: "100%",
                  textAlign: "left",
                  fontSize: "0.875rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                }}
              >
                <div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.04em" }}>
                    Email Address
                  </span>
                  <div style={{ color: "var(--text-primary)", fontWeight: 700, marginTop: "0.15rem" }}>
                    {successBooking.booker_email}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: "0.75rem", color: "var(--accent-teal)", textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.04em" }}>
                    Confirmed Seats ({successBooking.seat_labels.length})
                  </span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.25rem" }}>
                    {successBooking.seat_labels.map((seat) => (
                      <span key={seat} className="seat-pill" style={{ background: "#ccfbf1", color: "#0f766e" }}>
                        {seat}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.04em" }}>
                    Booking Reference IDs
                  </span>
                  <div
                    style={{
                      maxHeight: "80px",
                      overflowY: "auto",
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "8px",
                      fontFamily: "monospace",
                      fontSize: "0.75rem",
                      color: "var(--accent-teal)",
                      marginTop: "0.25rem",
                      lineHeight: "1.5",
                    }}
                  >
                    {successBooking.booking_ids.join(", ")}
                  </div>
                </div>
              </div>

              <button
                className="btn btn-teal"
                onClick={() => setSuccessBooking(null)}
                style={{ width: "100%", padding: "0.75rem", fontSize: "0.95rem" }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      <SeatLegend />

      <SeatGrid
        seats={eventDetail.seats}
        totalRows={Number(eventDetail.total_rows)}
        totalCols={Number(eventDetail.total_cols)}
        selectedSeatIds={selectedSeatIds}
        onToggleSeat={handleToggleSeat}
      />

      {eventDetail.available_seats === 0 ? (
        <div
          className="glass-panel"
          style={{
            padding: "2rem",
            textAlign: "center",
            background: "#fff1f2",
            border: "1px solid #fecaca",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "#ffe4e6",
              color: "#e11d48",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#991b1b" }}>
              ALL SEATS RESERVED
            </h3>
            <p style={{ color: "#991b1b", fontSize: "0.9rem", marginTop: "0.35rem" }}>
              All seats for this event are currently booked or unavailable. Please check back later or explore other events in our catalog.
            </p>
          </div>

          <Link href="/" className="btn btn-dark" style={{ marginTop: "0.5rem" }}>
            <span>Explore Other Events</span>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>
      ) : (
        <BookingSummary
          selectedSeats={selectedSeatsObj}
          onProceed={() => setIsModalOpen(true)}
          onClearSelection={handleClearSelection}
        />
      )}

      {isModalOpen && (
        <BookingFormModal
          eventId={eventDetail.id}
          eventName={eventDetail.name}
          selectedSeats={selectedSeatsObj}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleBookingSuccess}
          onConflictError={handleConflictError}
        />
      )}
    </div>
  );
}
