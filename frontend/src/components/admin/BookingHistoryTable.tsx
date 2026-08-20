import { BookingHistoryResponse } from "@/types";

interface BookingHistoryTableProps {
  history: BookingHistoryResponse;
}

export default function BookingHistoryTable({ history }: BookingHistoryTableProps) {
  if (history.total_bookings === 0) {
    return (
      <div className="glass-panel" style={{ padding: "3rem 2rem", textAlign: "center" }}>
        <h4 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-primary)" }}>No Booking History Recorded</h4>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "0.5rem" }}>
          No user reservations have been confirmed for this event yet.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "1.25rem 1.75rem", borderBottom: "1px solid var(--border-card)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--text-primary)" }}>
          Confirmed Booking Log ({history.total_bookings} {history.total_bookings === 1 ? "Transaction" : "Transactions"})
        </h3>
        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 700 }}>Ordered Newest First</span>
      </div>

      <div className="table-responsive">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Booking Ref</th>
              <th>Booker Name</th>
              <th>Email Address</th>
              <th>Seats</th>
              <th>Timestamp</th>
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
                <tr key={item.booking_id || idx}>
                  <td style={{ fontFamily: "monospace", fontSize: "0.85rem", fontWeight: 700, color: "var(--accent-teal)" }}>
                    {item.booking_id.slice(0, 8)}...
                  </td>
                  <td style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                    {item.booker_name}
                  </td>
                  <td style={{ color: "var(--text-secondary)" }}>
                    {item.booker_email}
                  </td>
                  <td>
                    {item.seat_labels.map((seat) => (
                      <span key={seat} className="seat-pill">
                        {seat}
                      </span>
                    ))}
                  </td>
                  <td style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
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
