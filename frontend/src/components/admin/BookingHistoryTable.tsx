import { BookingHistoryResponse } from "@/types";

interface BookingHistoryTableProps {
  history: BookingHistoryResponse;
}

export default function BookingHistoryTable({ history }: BookingHistoryTableProps) {
  if (history.total_bookings === 0) {
    return (
      <div className="glass-panel" style={{ padding: "2.5rem", textAlign: "center" }}>
        <h4 style={{ fontSize: "1.1rem", color: "var(--text-secondary)" }}>No Booking History Recorded</h4>
        <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginTop: "0.4rem" }}>
          No user reservations have been confirmed for this event yet.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel" style={{ overflow: "hidden" }}>
      <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>
          Confirmed Booking Log ({history.total_bookings} {history.total_bookings === 1 ? "Transaction" : "Transactions"})
        </h3>
        <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Ordered Newest First</span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
          <thead>
            <tr style={{ background: "rgba(15, 23, 42, 0.6)", color: "var(--text-secondary)", borderBottom: "1px solid var(--border-subtle)" }}>
              <th style={{ padding: "0.75rem 1.5rem", fontWeight: 600 }}>Booking Ref</th>
              <th style={{ padding: "0.75rem 1.5rem", fontWeight: 600 }}>Booker Name</th>
              <th style={{ padding: "0.75rem 1.5rem", fontWeight: 600 }}>Email Address</th>
              <th style={{ padding: "0.75rem 1.5rem", fontWeight: 600 }}>Seats</th>
              <th style={{ padding: "0.75rem 1.5rem", fontWeight: 600 }}>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {history.bookings.map((item, idx) => {
              const formattedDate = new Date(item.created_at).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              });

              return (
                <tr
                  key={item.booking_id || idx}
                  style={{
                    borderBottom: "1px solid var(--border-subtle)",
                    transition: "background 0.15s ease",
                  }}
                  className="table-row"
                >
                  <td style={{ padding: "0.85rem 1.5rem", fontFamily: "monospace", fontSize: "0.8rem", color: "var(--accent-primary)" }}>
                    {item.booking_id.slice(0, 8)}...
                  </td>
                  <td style={{ padding: "0.85rem 1.5rem", fontWeight: 600, color: "var(--text-primary)" }}>
                    {item.booker_name}
                  </td>
                  <td style={{ padding: "0.85rem 1.5rem", color: "var(--text-secondary)" }}>
                    {item.booker_email}
                  </td>
                  <td style={{ padding: "0.85rem 1.5rem" }}>
                    <span
                      style={{
                        background: "rgba(16, 185, 129, 0.12)",
                        color: "var(--seat-available-text)",
                        padding: "0.2rem 0.6rem",
                        borderRadius: "4px",
                        fontWeight: 700,
                        fontSize: "0.85rem",
                      }}
                    >
                      {item.seat_labels.join(", ")}
                    </span>
                  </td>
                  <td style={{ padding: "0.85rem 1.5rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                    {formattedDate}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
