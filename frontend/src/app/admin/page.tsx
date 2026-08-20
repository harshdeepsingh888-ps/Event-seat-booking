"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiClientError, api } from "@/lib/api";
import { Event } from "@/types";
import AdminEventCard from "@/components/admin/AdminEventCard";
import CreateEventModal from "@/components/admin/CreateEventModal";
import { useAuth } from "@/context/AuthContext";

function AdminContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: isAuthLoading, isAdmin, logout } = useAuth();

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    if (!isAuthLoading && (!user || !isAdmin)) {
      router.push("/admin/login");
    }
  }, [isAuthLoading, user, isAdmin, router]);

  const isCreateParam = searchParams.get("create") === "true";
  const showModal = isCreateModalOpen || isCreateParam;

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await api.getEvents();
      setEvents(data);
    } catch (err: unknown) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : "Failed to load events."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    if (!user || !isAdmin) return;

    api
      .getEvents()
      .then((data) => {
        if (active) {
          setEvents(data);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(
            err instanceof ApiClientError
              ? err.message
              : "Failed to load events."
          );
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [user, isAdmin]);

  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
    if (isCreateParam) {
      router.replace("/admin");
    }
  };

  const handleEventCreated = (createdEvent: Event) => {
    setIsCreateModalOpen(false);
    router.push(`/admin/events/${createdEvent.id}`);
  };

  if (isAuthLoading || !user || !isAdmin) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        Checking authorization...
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "2rem",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1.25rem",
          flexWrap: "wrap",
          paddingBottom: "0.5rem",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "0.8rem",
              color: "var(--text-muted)",
              fontWeight: 800,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              marginBottom: "0.35rem",
            }}
          >
            Operations / Operations Console
          </div>

          <h1
            style={{
              fontSize: "2.25rem",
              fontWeight: 800,
              color: "var(--text-primary)",
              letterSpacing: "-0.03em",
              margin: 0,
            }}
          >
            Admin Console
          </h1>

          <p
            style={{
              color: "var(--text-secondary)",
              marginTop: "0.5rem",
              fontSize: "0.95rem",
            }}
          >
            Signed in as <strong>{user.full_name}</strong> ({user.email})
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button
            className="btn btn-outline"
            onClick={() => void loadEvents()}
            disabled={loading}
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh</span>
          </button>

          <button
            className="btn btn-teal"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Create Event</span>
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => {
              logout();
              router.push("/admin/login");
            }}
          >
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "1.75rem",
          }}
        >
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="glass-panel skeleton"
              style={{ height: "220px", width: "100%" }}
            />
          ))}
        </div>
      ) : error ? (
        <div className="alert alert-error">
          <div>{error}</div>
        </div>
      ) : events.length === 0 ? (
        <div
          className="glass-panel"
          style={{
            padding: "4rem 2rem",
            textAlign: "center",
          }}
        >
          <h2
            style={{
              fontSize: "1.5rem",
              fontWeight: 800,
              marginBottom: "0.75rem",
              color: "var(--text-primary)",
            }}
          >
            No events found
          </h2>

          <p
            style={{
              color: "var(--text-secondary)",
              marginBottom: "2rem",
              maxWidth: "460px",
              marginInline: "auto",
            }}
          >
            Create your first event to start managing seat inventories, administrative blocking, and reservation history.
          </p>

          <button
            className="btn btn-teal"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Create Event</span>
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "1.75rem",
          }}
        >
          {events.map((event) => (
            <AdminEventCard
              key={event.id}
              event={event}
              onDeleteSuccess={() => void loadEvents()}
            />
          ))}
        </div>
      )}

      {showModal && (
        <CreateEventModal
          onClose={handleCloseModal}
          onSuccess={handleEventCreated}
        />
      )}
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<div>Loading Admin Console...</div>}>
      <AdminContent />
    </Suspense>
  );
}
