export type SeatStatus = "AVAILABLE" | "BOOKED" | "BLOCKED" | "SELECTED";

export interface Event {
  id: string;
  name: string;
  event_date: string;
  total_rows: number;
  total_cols: number;
  created_at: string;
}


export interface Seat {
  id: string;
  event_id: string;
  row_number: number;
  column_number: number;
  seat_label: string;
  is_blocked: boolean;
  is_booked: boolean;
  status: "AVAILABLE" | "BOOKED" | "BLOCKED";
}

export interface EventDetail extends Event {
  seats: Seat[];
  total_seats: number;
  booked_seats: number;
  blocked_seats: number;
  available_seats: number;
}

export interface EventSummary {
  event_id: string;
  event_name: string;
  total_seats: number;
  available_seats: number;
  booked_seats: number;
  blocked_seats: number;
  occupancy_percentage: number;
  total_revenue: number;
}

export interface BookingRequest {
  booker_name: string;
  booker_email: string;
  seat_ids: string[];
}

export interface BookingResponse {
  booking_ids: string[];
  event_id: string;
  booker_name: string;
  booker_email: string;
  seat_ids: string[];
  seat_labels: string[];
  created_at: string;
}

export interface ApiError {
  detail: string | { msg: string; loc: string[] }[];
}

export interface BookingHistoryItem {
  booking_id: string;
  booker_name: string;
  booker_email: string;
  seat_ids: string[];
  seat_labels: string[];
  created_at: string;
}

export interface BookingHistoryResponse {
  event_id: string;
  total_bookings: number;
  bookings: BookingHistoryItem[];
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: "ADMIN" | "USER";
  created_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}


