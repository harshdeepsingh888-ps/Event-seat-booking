import React, { useState } from "react";
import { Event } from "@/types";
import { api, ApiClientError } from "@/lib/api";

interface CreateEventModalProps {
  onClose: () => void;
  onSuccess: (event: Event) => void;
}

const getDefaultEventDate = (): string =>
  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);

export default function CreateEventModal({ onClose, onSuccess }: CreateEventModalProps) {
  const [name, setName] = useState("");
  const [eventDate, setEventDate] = useState<string>(getDefaultEventDate);
  const [totalRows, setTotalRows] = useState(5);
  const [totalCols, setTotalCols] = useState(8);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedName = name.trim();

    if (!trimmedName) {
      setErrorMsg("Event name cannot be empty.");
      return;
    }

    if (!eventDate) {
      setErrorMsg("Please select a valid event start date and time.");
      return;
    }

    if (totalRows < 1 || totalRows > 50) {
      setErrorMsg("Total rows must be between 1 and 50.");
      return;
    }

    if (totalCols < 1 || totalCols > 50) {
      setErrorMsg("Total columns must be between 1 and 50.");
      return;
    }

    setLoading(true);

    try {
      const isoDate = new Date(eventDate).toISOString();

      const created = await api.createEvent({
        name: trimmedName,
        event_date: isoDate,
        total_rows: Number(totalRows),
        total_cols: Number(totalCols),
      });

      onSuccess(created);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Failed to create event. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-panel modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Create New Event</h2>

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

        {errorMsg && (
          <div className="alert alert-error">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 01-18 0z"
              />
            </svg>
            <div>{errorMsg}</div>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
        >
          <div className="form-group">
            <label className="form-label" htmlFor="eventName">
              Event Name *
            </label>

            <input
              id="eventName"
              type="text"
              className="form-input"
              placeholder="e.g. NeuBitAt Tech Summit 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="eventDate">
              Event Date & Time *
            </label>

            <input
              id="eventDate"
              type="datetime-local"
              className="form-input"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1rem",
            }}
          >
            <div className="form-group">
              <label className="form-label" htmlFor="totalRows">
                Rows (1–50) *
              </label>

              <input
                id="totalRows"
                type="number"
                min="1"
                max="50"
                className="form-input"
                value={totalRows}
                onChange={(e) => setTotalRows(parseInt(e.target.value, 10) || 1)}
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="totalCols">
                Columns (1–50) *
              </label>

              <input
                id="totalCols"
                type="number"
                min="1"
                max="50"
                className="form-input"
                value={totalCols}
                onChange={(e) => setTotalCols(parseInt(e.target.value, 10) || 1)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div
            style={{
              background: "rgba(99, 102, 241, 0.08)",
              padding: "0.75rem",
              borderRadius: "6px",
              fontSize: "0.8rem",
              color: "var(--text-secondary)",
            }}
          >
            Seat Grid Preview:{" "}
            <strong>{totalRows * totalCols} total seats</strong> ({totalRows} rows ×{" "}
            {totalCols} cols). The backend will automatically generate the seat matrix.
          </div>

          <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
              style={{ flex: 1 }}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ flex: 2 }}
            >
              {loading ? "Creating Event..." : "Create Event & Grid"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
