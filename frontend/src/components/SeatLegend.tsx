export default function SeatLegend() {
  return (
    <div className="glass-panel seat-legend">
      <div className="legend-item">
        <span className="legend-sample seat-available" />
        <span>Available</span>
      </div>

      <div className="legend-item">
        <span className="legend-sample seat-selected" />
        <span>Selected</span>
      </div>

      <div className="legend-item">
        <span className="legend-sample seat-booked" />
        <span>Booked</span>
      </div>

      <div className="legend-item">
        <span className="legend-sample seat-blocked" />
        <span>Blocked (Admin)</span>
      </div>
    </div>
  );
}
