import React, { useState } from "react";
import { Seat, BookingResponse } from "@/types";
import { api, ApiClientError } from "@/lib/api";

interface BookingFormModalProps {
  eventId: string;
  eventName: string;
  selectedSeats: Seat[];
  onClose: () => void;
  onSuccess: (response: BookingResponse) => void;
  onConflictError: () => void;
}

export default function BookingFormModal({
  eventId,
  eventName,
  selectedSeats,
  onClose,
  onSuccess,
  onConflictError,
}: BookingFormModalProps) {
  const [bookerName, setBookerName] = useState("");
  const [bookerEmail, setBookerEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const seatLabels = selectedSeats.map((s) => s.seat_label).join(", ");
  const seatIds = selectedSeats.map((s) => s.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedName = bookerName.trim();
    const trimmedEmail = bookerEmail.trim();

    if (!trimmedName) {
      setErrorMsg("Please enter your full name.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    if (seatIds.length === 0) {
      setErrorMsg("No seats selected.");
      return;
    }

    setLoading(true);

    try {
      const res = await api.createBooking(eventId, {
        booker_name: trimmedName,
        booker_email: trimmedEmail,
        seat_ids: seatIds,
      });

      setLoading(false);
      onSuccess(res);
    } catch (err: unknown) {
      setLoading(false);

      if (err instanceof ApiClientError && err.status === 409) {
        setErrorMsg(
          "One or more selected seats are no longer available. Please refresh the seat map and choose different seats."
        );
        onConflictError();
      } else if (err instanceof ApiClientError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Failed to complete booking. Please try again.");
      }
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-panel modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Complete Your Booking</h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              fontSize: "1.5rem",
              cursor: "pointer",
              lineHeight: 1,
            }}
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>

        <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "1rem", borderRadius: "8px" }}>
          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Event</div>
          <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)" }}>{eventName}</div>
          <div style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "var(--seat-available-text)" }}>
            Selected Seats: <strong style={{ color: "#fff" }}>{seatLabels}</strong> ({selectedSeats.length})
          </div>
        </div>

        {errorMsg && (
          <div className="alert alert-error">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>{errorMsg}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div className="form-group">
            <label className="form-label" htmlFor="bookerName">Full Name *</label>
            <input
              id="bookerName"
              type="text"
              className="form-input"
              placeholder="e.g. Harshdeep Singh"
              value={bookerName}
              onChange={(e) => setBookerName(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="bookerEmail">Email Address *</label>
            <input
              id="bookerEmail"
              type="email"
              className="form-input"
              placeholder="e.g. harsh@example.com"
              value={bookerEmail}
              onChange={(e) => setBookerEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading} style={{ flex: 1 }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 2 }}>
              {loading ? "Confirming Booking..." : "Confirm & Book Now"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
