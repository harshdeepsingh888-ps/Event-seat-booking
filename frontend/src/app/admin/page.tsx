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
          alignItems: "flex-start",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "0.8rem",
              color: "var(--text-muted)",
              fontWeight: 700,
              marginBottom: "0.35rem",
            }}
          >
            Operations &gt; Events
          </div>

          <h1
            style={{
              fontSize: "2rem",
              fontWeight: 800,
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            Admin Console
          </h1>

          <p
            style={{
              color: "var(--text-secondary)",
              marginTop: "0.4rem",
            }}
          >
            Signed in as <strong>{user.full_name}</strong> ({user.email})
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            className="btn btn-outline"
            onClick={() => void loadEvents()}
            disabled={loading}
          >
            Refresh
          </button>

          <button
            className="btn btn-teal"
            onClick={() => setIsCreateModalOpen(true)}
          >
            Create Event
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => {
              logout();
              router.push("/admin/login");
            }}
          >
            Sign Out
          </button>
        </div>
      </div>

      {loading ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1rem",
          }}
        >
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="skeleton"
              style={{ height: "190px", width: "100%" }}
            />
          ))}
        </div>
      ) : error ? (
        <div className="alert alert-error">
          <div>{error}</div>
        </div>
      ) : events.length === 0 ? (
        <div
          className="card"
          style={{
            padding: "3rem 2rem",
            textAlign: "center",
          }}
        >
          <h2
            style={{
              fontSize: "1.25rem",
              fontWeight: 800,
              marginBottom: "0.5rem",
            }}
          >
            No events found
          </h2>

          <p
            style={{
              color: "var(--text-secondary)",
              marginBottom: "1.5rem",
            }}
          >
            Create your first event to start managing seats and bookings.
          </p>

          <button
            className="btn btn-teal"
            onClick={() => setIsCreateModalOpen(true)}
          >
            Create Event
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1rem",
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
