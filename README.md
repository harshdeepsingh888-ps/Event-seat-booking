# NeuBitAt — Event Seat Booking System

A production-quality, concurrency-safe Event Seat Booking System built for the NeuBitAt Full-Stack Development Internship Technical Assignment.

---

## 🌟 Core Architecture & Highlights

The primary technical mandate of this project is to **prevent double-booking under high concurrency at the database level**. When multiple users attempt to reserve the same seat(s) at nearly the same millisecond, the system guarantees atomic, row-level locking using `SELECT ... FOR UPDATE`, ACID transaction isolation, and relational database uniqueness constraints.

- **Frontend**: Next.js 16 (App Router), TypeScript, React 19, CSS Modules / Vanilla CSS (Dark Mode Glassmorphism UI).
- **Backend**: FastAPI (Python 3.14), SQLAlchemy 2.0 Async ORM with `aiomysql` driver.
- **Database**: MySQL 8 with `InnoDB` storage engine.
- **Testing**: 30 automated tests in `pytest` covering DB schema, API endpoints, high-concurrency race conditions, atomic multi-seat rollbacks, admin read endpoints, and end-to-end integration flows.

---

## 🏗️ System Features

### User Experience
- **Event Catalog (`/`)**: View available events, start times, and capacity metrics.
- **Interactive Seat Map (`/events/[eventId]`)**: Real-time visual seat map supporting `AVAILABLE`, `SELECTED`, `BOOKED`, and `BLOCKED` states.
- **Atomic Multi-Seat Booking**: Select multiple seats and submit a single reservation request.
- **Graceful Conflict Handling**: If another user books a selected seat milliseconds earlier, the backend returns `409 Conflict`, and the frontend alerts the user while automatically refetching fresh seat state.

### Admin Management (`/admin`)
- **Event Creation**: Configure event names, dates, and custom row $\times$ column layout dimensions (seat grids generated automatically by backend).
- **Real-Time Analytics Dashboard (`/admin/events/[eventId]`)**: Monitor Total Capacity, Available Seats, Booked Seats, Blocked Seats, and Occupancy Rate.
- **Administrative Seat Blocking**: Select multiple available seats to block from booking, or unblock previously blocked seats. Booked seats are strictly protected from administrative modification.
- **Chronological Booking History**: View confirmed reservation logs containing Booking Ref, Booker Name, Email, Seat Labels, and Timestamps.

---

## 🔒 Concurrency & Transaction Guarantee

Double-booking is prevented using a 4-tier database protection strategy:

1. **Deterministic Locking Order**: Seat IDs are sorted lexicographically prior to execution to prevent relational database deadlocks.
2. **Row-Level Pessimistic Locks (`SELECT ... FOR UPDATE`)**: The transaction locks targeted seat rows in MySQL `InnoDB`, forcing concurrent requests to wait sequentially.
3. **Status Check & Atomic Mutation**: If any requested seat is no longer `AVAILABLE`, the entire transaction rolls back cleanly, releasing locks and returning HTTP `409 Conflict`.
4. **Database Uniqueness Constraint**: A unique database index `UNIQUE KEY uq_event_seat (event_id, seat_id)` on `bookings` acts as an unbypassable safeguard at the database engine level.

---

## 🛠️ Local Development & Setup Guide

### Prerequisites
- **Python**: 3.10+ (Tested on Python 3.14.6)
- **Node.js**: 20+ (Tested on Node.js v24.18.0 / npm 11.16.0)
- **MySQL Server**: 8.0+ running on port 3306

---

### 1. Database Configuration

Create a dedicated MySQL database and application user:

```sql
CREATE DATABASE IF NOT EXISTS neubit_event_booking;
CREATE USER IF NOT EXISTS 'neubit_app'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON neubit_event_booking.* TO 'neubit_app'@'localhost';
FLUSH PRIVILEGES;
```

---

### 2. Backend Setup (`backend/`)

```bash
# Navigate to backend directory
cd backend

# Create & activate virtual environment
python -m venv .venv
# On Windows PowerShell:
.venv\Scripts\Activate.ps1
# On Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables (.env)
cp .env.example .env
```

Edit `backend/.env`:
```env
ENVIRONMENT=development
ASYNC_DATABASE_URL=mysql+aiomysql://neubit_app:your_secure_password@localhost:3306/neubit_event_booking
DB_POOL_SIZE=10
DB_MAX_OVERFLOW=20
```

Start the FastAPI development server:
```bash
uvicorn app.main:app --reload --port 8000
```
- API Base URL: `http://localhost:8000`
- Interactive OpenAPI Docs: `http://localhost:8000/docs`

---

### 3. Frontend Setup (`frontend/`)

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Configure environment variables (.env.local)
cp .env.example .env.local
```

Edit `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Start the Next.js development server:
```bash
npm run dev
```
- Frontend Application: `http://localhost:3000`
- Admin Console: `http://localhost:3000/admin`

---

## 🧪 Running Automated Tests

Run the complete backend test suite (includes concurrency race-condition tests and E2E integration flows):

```bash
# From the backend directory with virtual environment activated:
pytest backend/tests
```

Run frontend typecheck and production build verification:

```bash
# From the frontend directory:
npx tsc --noEmit
npm run build
```

---

## 🚀 Production Deployment Target Guide

- **Frontend Deployment**: Host on **Vercel** connected to GitHub repository with environment variable `NEXT_PUBLIC_API_URL`.
- **Backend Deployment**: Deploy on **Render** or **Railway** (Docker / Python Web Service) with `ASYNC_DATABASE_URL` pointing to production MySQL.
- **Database Deployment**: Cloud MySQL instance (PlanetScale, Aiven, Railway MySQL, or AWS RDS MySQL).

---

## 📜 License & Author

Developed for **NeuBitAt Internship Assignment** (August 2026).
