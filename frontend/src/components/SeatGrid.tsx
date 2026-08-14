import React from "react";
import { Seat } from "@/types";

interface SeatGridProps {
  seats: Seat[];
  totalRows: number;
  totalCols: number;
  selectedSeatIds: string[];
  onToggleSeat: (seatId: string) => void;
}

type DisplaySeatStatus = Seat["status"] | "SELECTED";

export default function SeatGrid({
  seats,
  totalRows,
  totalCols,
  selectedSeatIds,
  onToggleSeat,
}: SeatGridProps) {
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

  return (
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

                const currentStatus: DisplaySeatStatus =
                  seat.status === "AVAILABLE" && isSelected
                    ? "SELECTED"
                    : seat.status;

                const isClickable = seat.status === "AVAILABLE";

                let statusClass = "seat-available";
                let ariaText = `Seat ${seat.seat_label} - Available`;

                if (currentStatus === "SELECTED") {
                  statusClass = "seat-selected";
                  ariaText = `Seat ${seat.seat_label} - Selected`;
                } else if (seat.status === "BOOKED") {
                  statusClass = "seat-booked";
                  ariaText = `Seat ${seat.seat_label} - Booked by another user`;
                } else if (seat.status === "BLOCKED") {
                  statusClass = "seat-blocked";
                  ariaText = `Seat ${seat.seat_label} - Blocked by administration`;
                }

                return (
                  <button
                    key={seat.id}
                    type="button"
                    className={`seat-button ${statusClass}`}
                    onClick={() => isClickable && onToggleSeat(seat.id)}
                    disabled={!isClickable}
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
  );
}
