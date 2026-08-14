import {
  Event,
  EventDetail,
  EventSummary,
  BookingRequest,
  BookingResponse,
  BookingHistoryResponse,
} from "@/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ApiValidationError {
  msg?: string;
  loc?: string[];
}

interface ApiErrorPayload {
  detail?: string | ApiValidationError[];
}

export class ApiClientError extends Error {
  status: number;
  data: ApiErrorPayload | null;

  constructor(
    status: number,
    message: string,
    data?: ApiErrorPayload | null
  ) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.data = data ?? null;
  }
}

async function parseErrorResponse(
  res: Response
): Promise<ApiErrorPayload | null> {
  try {
    const data: unknown = await res.json();

    if (
      typeof data === "object" &&
      data !== null &&
      "detail" in data
    ) {
      const payload = data as ApiErrorPayload;
      return payload;
    }

    return null;
  } catch {
    return null;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorData = await parseErrorResponse(res);

    let errorDetail = `HTTP ${res.status}: ${res.statusText}`;

    if (typeof errorData?.detail === "string") {
      errorDetail = errorData.detail;
    } else if (Array.isArray(errorData?.detail)) {
      errorDetail = errorData.detail
        .map((error) => error.msg || "Validation error")
        .join(", ");
    }

    throw new ApiClientError(
      res.status,
      errorDetail,
      errorData
    );
  }

  return res.json() as Promise<T>;
}

export const api = {
  async getEvents(): Promise<Event[]> {
    const res = await fetch(
      `${API_BASE_URL}/api/v1/events`,
      { cache: "no-store" }
    );

    return handleResponse<Event[]>(res);
  },

  async createEvent(payload: {
    name: string;
    event_date: string;
    total_rows: number;
    total_cols: number;
  }): Promise<Event> {
    const res = await fetch(
      `${API_BASE_URL}/api/v1/events`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    return handleResponse<Event>(res);
  },

  async getEventDetail(eventId: string): Promise<EventDetail> {
    const res = await fetch(
      `${API_BASE_URL}/api/v1/events/${eventId}`,
      { cache: "no-store" }
    );

    return handleResponse<EventDetail>(res);
  },

  async getEventSummary(eventId: string): Promise<EventSummary> {
    const res = await fetch(
      `${API_BASE_URL}/api/v1/events/${eventId}/summary`,
      { cache: "no-store" }
    );

    return handleResponse<EventSummary>(res);
  },

  async getBookingHistory(
    eventId: string
  ): Promise<BookingHistoryResponse> {
    const res = await fetch(
      `${API_BASE_URL}/api/v1/events/${eventId}/bookings`,
      { cache: "no-store" }
    );

    return handleResponse<BookingHistoryResponse>(res);
  },

  async blockUnblockSeats(
    eventId: string,
    payload: {
      seat_ids: string[];
      blocked: boolean;
    }
  ): Promise<EventDetail> {
    const res = await fetch(
      `${API_BASE_URL}/api/v1/events/${eventId}/seats/block`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    return handleResponse<EventDetail>(res);
  },

  async createBooking(
    eventId: string,
    payload: BookingRequest
  ): Promise<BookingResponse> {
    const res = await fetch(
      `${API_BASE_URL}/api/v1/events/${eventId}/bookings`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    return handleResponse<BookingResponse>(res);
  },
};