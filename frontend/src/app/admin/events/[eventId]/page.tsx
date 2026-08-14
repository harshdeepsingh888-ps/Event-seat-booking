"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ApiClientError, api } from "@/lib/api";
import {
  BookingHistoryResponse,
  EventDetail,
  EventSummary,
} from "@/types";
import AnalyticsCards from "@/components/admin/AnalyticsCards";
import AdminSeatGrid from "@/components/admin/AdminSeatGrid";
import BookingHistoryTable from "@/components/admin/BookingHistoryTable";

interface PageProps {
  params: Promise<{ eventId: string }>;
}

export default function AdminEventDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const eventId = resolvedParams.eventId;

  const [eventDetail, setEventDetail] = useState<EventDetail | null>(null);
  const [summary, setSummary] = useState<EventSummary | null>(null);
  const [bookingHistory, setBookingHistory] =
    useState<BookingHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"seats" | "history">("seats");

  const loadAllData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [detailData, summaryData, historyData] = await Promise.all([
        api.getEventDetail(eventId),
        api.getEventSummary(eventId),
        api.getBookingHistory(eventId),
      ]);

      setEventDetail(detailData);
      setSummary(summaryData);
      setBookingHistory(historyData);
    } catch (err: unknown) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : "Failed to load admin event data.";

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const fetchAdminEventData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [detailData, summaryData, historyData] = await Promise.all([
          api.getEventDetail(eventId),
          api.getEventSummary(eventId),
          api.getBookingHistory(eventId),
        ]);

        if (cancelled) {
          return;
        }

        setEventDetail(detailData);
        setSummary(summaryData);
        setBookingHistory(historyData);
      } catch (err: unknown) {
        if (cancelled) {
          return;
        }

        const message =
          err instanceof ApiClientError
            ? err.message
            : "Failed to load admin event data.";

        setError(message);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchAdminEventData();

    return () => {
      cancelled = true;
    };
  }, [eventId]);

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
        <div className="skeleton" style={{ height: "100px", width: "100%" }} />
        <div className="skeleton" style={{ height: "320px", width: "100%" }} />
      </div>
    );
  }

  if (error || !eventDetail || !summary || !bookingHistory) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
        }}
      >
        <Link
          href="/admin"
          className="btn btn-outline"
          style={{ width: "fit-content" }}
        >
          &larr; Back to Admin Console
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

          <div>{error || "Event data not found."}</div>
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

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "2rem",
      }}
    >
      <div>
        <div
          style={{
            fontSize: "0.8rem",
            color: "var(--text-muted)",
            fontWeight: 700,
            marginBottom: "0.3rem",
          }}
        >
          Dashboard &gt; Events &gt; {eventDetail.name}
        </div>

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
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
              }}
            >
              <h1
                style={{
                  fontSize: "2rem",
                  fontWeight: 800,
                  color: "var(--text-primary)",
                }}
              >
                {eventDetail.name}
              </h1>

              <span className="badge-pill badge-active">
                <span className="badge-dot" />
                Active
              </span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                color: "var(--text-secondary)",
                marginTop: "0.25rem",
                fontSize: "0.9rem",
              }}
            >
              <span>📅 {formattedDate}</span>
              <span>📍 Grand Convention Hall</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <Link
              href={`/events/${eventId}`}
              className="btn btn-dark"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>View Public Page</span>

              <svg
                width="14"
                height="14"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </Link>

            <button
              className="btn btn-teal"
              onClick={() => void loadAllData()}
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

              <span>Refresh Data</span>
            </button>
          </div>
        </div>
      </div>

      <AnalyticsCards summary={summary} />

      <div
        style={{
          borderBottom: "1px solid var(--border-card)",
          display: "flex",
          gap: "2rem",
        }}
      >
        <button
          onClick={() => setActiveTab("seats")}
          style={{
            background: "none",
            border: "none",
            padding: "0.75rem 0",
            fontSize: "1rem",
            fontWeight: 800,
            color:
              activeTab === "seats"
                ? "var(--accent-teal-text)"
                : "var(--text-secondary)",
            borderBottom:
              activeTab === "seats"
                ? "3px solid var(--accent-teal)"
                : "3px solid transparent",
            cursor: "pointer",
          }}
        >
          Seat Layout & Administrative Blocking
        </button>

        <button
          onClick={() => setActiveTab("history")}
          style={{
            background: "none",
            border: "none",
            padding: "0.75rem 0",
            fontSize: "1rem",
            fontWeight: 800,
            color:
              activeTab === "history"
                ? "var(--accent-teal-text)"
                : "var(--text-secondary)",
            borderBottom:
              activeTab === "history"
                ? "3px solid var(--accent-teal)"
                : "3px solid transparent",
            cursor: "pointer",
          }}
        >
          Recent Confirmed Bookings ({bookingHistory.total_bookings})
        </button>
      </div>

      {activeTab === "seats" ? (
        <AdminSeatGrid
          eventId={eventDetail.id}
          seats={eventDetail.seats}
          totalRows={Number(eventDetail.total_rows)}
          totalCols={Number(eventDetail.total_cols)}
          onMutationSuccess={() => void loadAllData()}
        />
      ) : (
        <BookingHistoryTable history={bookingHistory} />
      )}
    </div>
  );
}
