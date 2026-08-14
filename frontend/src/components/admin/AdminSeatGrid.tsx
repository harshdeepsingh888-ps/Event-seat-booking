import React, { useState } from "react";
import { Seat } from "@/types";
import { api, ApiClientError } from "@/lib/api";

interface AdminSeatGridProps {
  eventId: string;
  seats: Seat[];
  totalRows: number;
  totalCols: number;
  onMutationSuccess: () => void;
}

export default function AdminSeatGrid({
  eventId,
  seats,
  totalRows,
  totalCols,
  onMutationSuccess,
}: AdminSeatGridProps) {
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedSet = new Set(selectedSeatIds);

  const rowsMap = new Map<number, Seat[]>();

  for (let r = 1; r <= totalRows; r++) {
    rowsMap.set(r, []);
  }

  for (const seat of seats) {
    const list = rowsMap.get(seat.row_number) ?? [];
    list.push(seat);
    rowsMap.set(seat.row_number, list);
  }

  const getRowLabel = (seatList: Seat[], rowNum: number) => {
    if (seatList.length > 0 && seatList[0].seat_label) {
      const match = seatList[0].seat_label.match(/^[A-Z]+/);
      if (match) return match[0];
    }

    return String.fromCharCode(64 + rowNum);
  };

  const handleToggleSeat = (seat: Seat) => {
    if (seat.status === "BOOKED") return;

    setSelectedSeatIds((prev) => {
      if (prev.includes(seat.id)) {
        return prev.filter((id) => id !== seat.id);
      }

      return [...prev, seat.id];
    });
  };

  const selectedSeatsObj = seats.filter((seat) => selectedSet.has(seat.id));
  const availableToBlock = selectedSeatsObj.filter((seat) => seat.status === "AVAILABLE");
  const blockedToUnblock = selectedSeatsObj.filter((seat) => seat.status === "BLOCKED");

  const handleBlockUnblock = async (blocked: boolean) => {
    setErrorMsg(null);

    const targetSeatIds = blocked
      ? availableToBlock.map((seat) => seat.id)
      : blockedToUnblock.map((seat) => seat.id);

    if (targetSeatIds.length === 0) return;

    setLoading(true);

    try {
      await api.blockUnblockSeats(eventId, {
        seat_ids: targetSeatIds,
        blocked,
      });

      setSelectedSeatIds([]);
      onMutationSuccess();
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.status === 409) {
        setErrorMsg(
          "Conflict: One or more selected seats have already been booked by a user and cannot be blocked."
        );
      } else if (err instanceof ApiClientError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Failed to update seat block status.");
      }

      onMutationSuccess();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {errorMsg && (
        <div className="alert alert-error">
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>{errorMsg}</div>
        </div>
      )}

      <div
        className="glass-panel"
        style={{
          padding: "1rem 1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <span style={{ fontWeight: 700, fontSize: "1rem" }}>
            Admin Seat Selection ({selectedSeatIds.length} Selected)
          </span>

          <div
            style={{
              fontSize: "0.8rem",
              color: "var(--text-secondary)",
              marginTop: "0.2rem",
            }}
          >
            Select Available seats to block, or Blocked seats to unblock. Booked seats are
            strictly disabled.
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            className="btn"
            style={{
              background: "rgba(239, 68, 68, 0.2)",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              color: "#f87171",
            }}
            onClick={() => handleBlockUnblock(true)}
            disabled={loading || availableToBlock.length === 0}
          >
            Block Selected ({availableToBlock.length})
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => handleBlockUnblock(false)}
            disabled={loading || blockedToUnblock.length === 0}
          >
            Unblock Selected ({blockedToUnblock.length})
          </button>
        </div>
      </div>

      <div className="seat-map-wrapper">
        <div className="stage-banner">STAGE / FRONT</div>

        <div
          className="glass-panel seat-grid-container"
          style={{
            gridTemplateColumns: `repeat(${totalCols}, minmax(42px, 1fr))`,
          }}
        >
          {Array.from(rowsMap.entries()).map(([rowNum, rowSeats]) => {
            rowSeats.sort((a, b) => a.column_number - b.column_number);

            const rowLabelStr = getRowLabel(rowSeats, rowNum);

            return (
              <div key={rowNum} className="seat-row">
                <span className="row-label">{rowLabelStr}</span>

                {rowSeats.map((seat) => {
                  const isSelected = selectedSet.has(seat.id);
                  const isBooked = seat.status === "BOOKED";

                  let statusClass = "seat-available";
                  let ariaText = `Seat ${seat.seat_label} - Available (Click to select for blocking)`;

                  if (seat.status === "BLOCKED") {
                    statusClass = "seat-blocked";
                    ariaText = `Seat ${seat.seat_label} - Blocked (Click to select for unblocking)`;
                  } else if (isBooked) {
                    statusClass = "seat-booked";
                    ariaText = `Seat ${seat.seat_label} - BOOKED by user (Cannot be modified)`;
                  }

                  if (isSelected) {
                    statusClass = "seat-selected";
                  }

                  return (
                    <button
                      key={seat.id}
                      type="button"
                      className={`seat-button ${statusClass}`}
                      onClick={() => handleToggleSeat(seat)}
                      disabled={isBooked || loading}
                      title={ariaText}
                      aria-label={ariaText}
                      aria-pressed={isSelected}
                    >
                      {seat.column_number}
                    </button>
                  );
                })}

                <span className="row-label">{rowLabelStr}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
