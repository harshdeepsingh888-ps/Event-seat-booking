import Link from "next/link";

export default function Navbar() {
  return (
    <header className="navbar">
      <div className="navbar-container">
        <Link href="/" className="brand-logo">
          <div className="brand-icon">N</div>
          <span>NeuBitAt Seats</span>
        </Link>
        <nav style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
          <Link
            href="/"
            style={{
              color: "var(--text-secondary)",
              textDecoration: "none",
              fontSize: "0.9rem",
              fontWeight: 500,
            }}
          >
            Events Catalog
          </Link>
          <Link
            href="/admin"
            style={{
              color: "var(--text-secondary)",
              textDecoration: "none",
              fontSize: "0.9rem",
              fontWeight: 500,
            }}
          >
            Admin Dashboard
          </Link>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.8rem",
              background: "rgba(16, 185, 129, 0.1)",
              color: "#34d399",
              padding: "0.35rem 0.75rem",
              borderRadius: "9999px",
              border: "1px solid rgba(16, 185, 129, 0.3)",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: "#10b981",
                boxShadow: "0 0 8px #10b981",
              }}
            />
            Backend Live
          </div>
        </nav>
      </div>
    </header>
  );
}
