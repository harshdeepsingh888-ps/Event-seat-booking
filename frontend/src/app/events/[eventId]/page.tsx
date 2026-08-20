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
          style={{
            color: "var(--text-secondary)",
            fontSize: "0.875rem",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            marginBottom: "0.75rem",
          }}
        >
          &larr; Back to Events Catalog
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
            <h1 style={{ fontSize: "2.25rem", fontWeight: 700 }}>
              {eventDetail.name}
            </h1>

            <p
              style={{
                color: "var(--text-secondary)",
                marginTop: "0.25rem",
              }}
            >
              {formattedDate}
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
        <div
          className="modal-overlay"
          onClick={() => setSuccessBooking(null)}
        >
          <div
            className="glass-panel modal-content"
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className="alert alert-success"
              style={{
                flexDirection: "column",
                gap: "0.75rem",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: "rgba(16, 185, 129, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto",
                }}
              >
                <svg
                  width="28"
                  height="28"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>

              <h3
                style={{
                  fontSize: "1.35rem",
                  fontWeight: 700,
                  color: "#fff",
                }}
              >
                Booking Confirmed!
              </h3>

              <p
                style={{
                  fontSize: "0.9rem",
                  color: "var(--text-secondary)",
                }}
              >
                Thank you <strong>{successBooking.booker_name}</strong>! Your
                seats have been successfully reserved.
              </p>

              <div
                style={{
                  background: "rgba(15, 23, 42, 0.8)",
                  padding: "1rem",
                  borderRadius: "8px",
                  width: "100%",
                  textAlign: "left",
                  fontSize: "0.85rem",
                }}
              >
                <div>
                  Email: <strong>{successBooking.booker_email}</strong>
                </div>

                <div style={{ marginTop: "0.4rem" }}>
                  Booked Seats:{" "}
                  <strong
                    style={{ color: "var(--seat-available-text)" }}
                  >
                    {successBooking.seat_labels.join(", ")}
                  </strong>
                </div>

                <div
                  style={{
                    marginTop: "0.4rem",
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                  }}
                >
                  Booking Ref: {successBooking.booking_ids.join(", ")}
                </div>
              </div>

              <button
                className="btn btn-primary"
                onClick={() => setSuccessBooking(null)}
                style={{
                  width: "100%",
                  marginTop: "0.5rem",
                }}
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

      <BookingSummary
        selectedSeats={selectedSeatsObj}
        onProceed={() => setIsModalOpen(true)}
        onClearSelection={handleClearSelection}
      />

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
