# NeuBitAt — Event Seat Booking System

> **Full-Stack Development Internship Assignment**
> **Status: Completed — Submitted for Review**

A production-oriented, concurrency-safe **Event Seat Booking System** built for the NeuBitAt Full-Stack Development Internship technical assignment.

The system allows administrators to create events and configure seat layouts while users can browse events, select multiple available seats, and complete bookings safely.

The primary engineering challenge addressed by this project is **preventing double-booking when multiple users attempt to reserve the same seat concurrently**.

---

## 🌐 Live Application

| Service               | Link                                                        |
| --------------------- | ----------------------------------------------------------- |
| **Live Frontend**     | https://event-seat-booking-delta.vercel.app/                |
| **Backend Health**    | https://event-seat-booking-production.up.railway.app/health |
| **API Documentation** | https://event-seat-booking-production.up.railway.app/docs   |
| **GitHub Repository** | https://github.com/harshdeepsingh888-ps/Event-seat-booking  |

### Production Architecture

```text
User Browser
     │
     ▼
┌─────────────────────┐
│       Vercel        │
│  Next.js Frontend   │
└──────────┬──────────┘
           │ HTTPS / REST API
           ▼
┌─────────────────────┐
│      Railway        │
│   FastAPI Backend   │
└──────────┬──────────┘
           │ SQL
           ▼
┌─────────────────────┐
│       MySQL 8       │
│       InnoDB        │
└─────────────────────┘
```

---

# 🎯 Assignment Objective

The assignment required a full-stack application where:

* An administrator can configure an event and its seat layout.
* Users can view available seats.
* Users can select and book multiple seats.
* The system must prevent double-booking.
* Concurrent booking attempts must be handled correctly at the **database level**.
* The project must provide a clean schema and API design.
* The application must have a usable seat-selection interface.
* The repository must include clear documentation and setup instructions.

The implementation prioritizes the highest-weight requirement: **correctness under concurrent booking attempts**.

---

# 🏗️ Core Architecture & Technology Stack

| Layer              | Technology        |
| ------------------ | ----------------- |
| Frontend           | Next.js 16        |
| Frontend Framework | React 19          |
| Frontend Language  | TypeScript        |
| Backend            | FastAPI           |
| Backend Language   | Python            |
| ORM                | SQLAlchemy 2.0    |
| Database Driver    | aiomysql          |
| Database           | MySQL 8           |
| Storage Engine     | InnoDB            |
| API                | REST              |
| API Documentation  | OpenAPI / Swagger |
| Testing            | pytest            |
| Frontend Hosting   | Vercel            |
| Backend Hosting    | Railway           |

---

# ✨ Key Features

## 👤 User Experience

### Event Catalog

The home page allows users to browse available events and view:

* Event name
* Event timing
* Capacity information
* Event availability

### Interactive Seat Map

The event detail page provides an interactive seat map with four seat states:

| State       | Meaning                                    |
| ----------- | ------------------------------------------ |
| `AVAILABLE` | Seat can be selected                       |
| `SELECTED`  | Seat selected by the current user          |
| `BOOKED`    | Seat has already been reserved             |
| `BLOCKED`   | Seat has been disabled by an administrator |

### Multi-Seat Booking

Users can select multiple seats and submit them as one booking request.

The backend treats the operation atomically, ensuring that the booking either succeeds completely or fails without leaving a partial reservation.

### Conflict Handling

If another user successfully books a selected seat immediately before the current booking request is committed:

```text
Backend
   │
   ▼
409 Conflict
   │
   ▼
Frontend displays conflict
   │
   ▼
Fresh seat state is fetched
```

This prevents the UI from continuing to display stale availability.

---

# 🔐 Concurrency & Double-Booking Prevention

## The Core Engineering Problem

Consider two users attempting to book the same seat:

```text
User A ────────┐
               │
               ▼
          Seat A1
               ▲
               │
User B ────────┘
```

A simple application-level implementation could perform:

```text
1. Check whether A1 is available
2. Wait
3. Mark A1 as booked
```

Under concurrency, both requests could observe:

```text
A1 = AVAILABLE
```

before either request updates the database.

That creates a race condition.

This project avoids that approach.

---

## Four-Layer Protection Strategy

### 1. Deterministic Locking Order

Requested seat IDs are sorted before database locking.

This ensures concurrent transactions attempt to acquire locks in a consistent order and reduces the possibility of deadlocks.

```text
Requested:

A3, A1, A2

        ↓

Sorted:

A1, A2, A3
```

---

### 2. Row-Level Pessimistic Locking

The booking transaction uses:

```sql
SELECT ... FOR UPDATE
```

against the relevant seat rows.

With MySQL InnoDB, this places row-level locks on the seats being processed.

If another transaction attempts to modify the same locked rows, it must wait for the existing transaction to finish.

Conceptually:

```text
Transaction A
     │
     ├── SELECT seat FOR UPDATE
     │
     ├── Seat locked
     │
     ├── Validate
     │
     ├── Book
     │
     └── COMMIT
              │
              ▼
        Lock released

Transaction B
     │
     └── waits for locked row
```

---

### 3. Atomic Status Validation & Mutation

After acquiring the locks, the backend verifies that every requested seat is still `AVAILABLE`.

If any requested seat has already become unavailable:

```text
Transaction
     │
     ▼
Seat unavailable
     │
     ▼
ROLLBACK
     │
     ▼
HTTP 409 Conflict
```

No partial booking is committed.

---

### 4. Database-Level Uniqueness

The database also enforces uniqueness through relational constraints.

The relevant uniqueness rule prevents the same event/seat combination from being represented by multiple booking records.

This provides an additional database-level safeguard that cannot simply be bypassed by frontend behavior.

---

# ⚛️ Atomic Multi-Seat Booking

A multi-seat booking is treated as **one transaction**.

For example:

```text
Requested:

A1
A2
A3
```

The required invariant is:

```text
┌───────────────────────┐
│ All seats booked      │
│          OR           │
│ No seats booked       │
└───────────────────────┘
```

The system must never leave a partially completed booking such as:

```text
A1 → BOOKED
A2 → BOOKED
A3 → FAILED
```

without rolling back the successful portions.

The transaction therefore follows:

```text
Request
   │
   ▼
Validate input
   │
   ▼
Begin transaction
   │
   ▼
Lock requested seats
   │
   ▼
Validate availability
   │
   ├──── Conflict ────► ROLLBACK → 409
   │
   ▼
Create booking
   │
   ▼
Reserve seats
   │
   ▼
COMMIT
   │
   ▼
Success
```

---

# 👨‍💼 Admin Management

The `/admin` interface provides administrative controls for managing events and seats.

## Event Creation

Administrators can configure:

* Event name
* Event date/time
* Seat row count
* Seat column count

The backend generates the corresponding seat grid.

---

## Seat Blocking

Administrators can:

* Select multiple available seats
* Block seats from future bookings
* Unblock previously blocked seats

Booked seats are protected from administrative modification.

---

## Analytics Dashboard

The event dashboard provides:

* Total capacity
* Available seats
* Booked seats
* Blocked seats
* Occupancy rate

---

## Booking History

Administrators can view confirmed bookings containing information such as:

* Booking reference
* Booker name
* Email
* Seat labels
* Booking timestamp

---

# 🗄️ Data Model

The system uses MySQL with the InnoDB storage engine.

Conceptually:

```text
┌──────────────┐
│    Event     │
└──────┬───────┘
       │
       │ 1:N
       ▼
┌──────────────┐
│     Seat     │
└──────┬───────┘
       │
       │ booking relationship
       ▼
┌──────────────┐
│   Booking    │
└──────────────┘
```

The relational model is important because booking requires:

* Strong consistency
* Transactions
* Row-level locking
* Uniqueness constraints
* Referential integrity

A relational database is therefore a natural fit for the problem.

---

# 🔌 API Design

The backend exposes REST APIs through FastAPI.

FastAPI automatically generates OpenAPI documentation.

### Health Check

```http
GET /health
```

Used to verify:

* API availability
* Backend health
* Database connectivity

### Interactive API Documentation

```text
/docs
```

The deployed Swagger interface provides the authoritative API contract generated from the FastAPI application.

---

# 🧪 Testing

The backend contains **30 automated tests** covering the major application behaviors.

Testing includes:

* Database schema behavior
* API endpoints
* Event operations
* Seat availability
* Booking creation
* Multi-seat booking
* Already-booked seats
* Administrative operations
* Atomic rollback behavior
* Concurrent booking attempts
* Race-condition handling
* End-to-end integration flows

The concurrency tests are particularly important because sequential tests alone cannot prove that the booking implementation is safe under concurrent requests.

---

## Running Backend Tests

From the repository root:

```bash
pytest backend/tests
```

Or from the backend directory:

```bash
cd backend
pytest tests
```

---

## Frontend Verification

From the frontend directory:

```bash
cd frontend
```

Typecheck:

```bash
npx tsc --noEmit
```

Production build:

```bash
npm run build
```

---

# 🛠️ Local Development

## Prerequisites

Install:

* Python 3.10+
* Node.js 20+
* npm
* MySQL 8+
* Git

The project was developed and tested with:

```text
Python 3.14.6
Node.js 24.18.0
npm 11.16.0
MySQL 8
```

---

# 1. Database Setup

Create the database:

```sql
CREATE DATABASE IF NOT EXISTS neubit_event_booking;
```

Create an application user:

```sql
CREATE USER IF NOT EXISTS
'neubit_app'@'localhost'
IDENTIFIED BY 'your_secure_password';
```

Grant permissions:

```sql
GRANT ALL PRIVILEGES
ON neubit_event_booking.*
TO 'neubit_app'@'localhost';

FLUSH PRIVILEGES;
```

---

# 2. Backend Setup

Navigate to:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv .venv
```

### Windows PowerShell

```powershell
.venv\Scripts\Activate.ps1
```

### Linux/macOS

```bash
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create the environment file:

```bash
cp .env.example .env
```

Configure:

```env
ENVIRONMENT=development
ASYNC_DATABASE_URL=mysql+aiomysql://neubit_app:your_secure_password@localhost:3306/neubit_event_booking
DB_POOL_SIZE=10
DB_MAX_OVERFLOW=20
```

Start FastAPI:

```bash
uvicorn app.main:app --reload --port 8000
```

Backend:

```text
http://localhost:8000
```

Swagger:

```text
http://localhost:8000/docs
```

---

# 3. Frontend Setup

Open a second terminal:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Create the environment file:

```bash
cp .env.example .env.local
```

Configure:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Start Next.js:

```bash
npm run dev
```

Frontend:

```text
http://localhost:3000
```

Admin console:

```text
http://localhost:3000/admin
```

---

# 🚀 Production Deployment

The submitted application is deployed as two services.

### Frontend

**Vercel**

```text
https://event-seat-booking-delta.vercel.app/
```

The frontend uses:

```env
NEXT_PUBLIC_API_URL
```

to communicate with the production backend.

### Backend

**Railway**

```text
https://event-seat-booking-production.up.railway.app/
```

Health endpoint:

```text
https://event-seat-booking-production.up.railway.app/health
```

The deployed health endpoint confirms that the API is online and connected to the database.

---

# 🔒 Security & Data Integrity

The implementation follows several data-integrity principles:

* Server-side validation
* Database transactions
* Database-level uniqueness constraints
* Row-level locking
* Backend authority over seat availability
* Atomic multi-seat operations
* Conflict responses
* Environment-based configuration
* No direct database access from the frontend
* Sensitive credentials kept outside source control

The frontend is intentionally not treated as the source of truth for seat availability.

---

# 🧠 Key Engineering Decisions

## Why MySQL?

The booking domain requires strong transactional guarantees and relational consistency.

MySQL with InnoDB provides:

* ACID transactions
* Row-level locking
* Foreign-key relationships
* Uniqueness constraints
* Reliable concurrent access control

---

## Why `SELECT ... FOR UPDATE`?

A normal availability check is insufficient under concurrency.

`SELECT ... FOR UPDATE` allows the transaction to lock the target rows before validating and mutating them.

This makes the critical booking section serialized for conflicting seat requests.

---

## Why Transactions?

A multi-seat booking must behave as a single logical operation.

Transactions guarantee:

```text
SUCCESS → commit everything
FAILURE → rollback everything
```

---

## Why the Database Is the Authority

The frontend may contain stale information.

For example:

```text
10:00:00
User A sees A1 available

10:00:01
User B books A1

10:00:02
User A submits booking
```

The frontend's previous state cannot be trusted.

The backend therefore checks the current database state during the booking transaction.

---

# 📁 Project Structure

```text
event-seat-booking/
│
├── backend/
│   ├── app/
│   ├── tests/
│   ├── requirements.txt
│   ├── .env.example
│   └── ...
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── public/
│   ├── package.json
│   ├── .env.example
│   └── ...
│
├── README.md
└── ...
```

The frontend and backend are intentionally separated so that presentation, API/business logic, and persistence remain independent.

---

# ⚠️ Known Limitations

The current implementation focuses on the core assignment requirements rather than a complete commercial ticketing platform.

Potential future enhancements include:

* User authentication
* Persistent user accounts
* Payment gateway integration
* Email booking confirmations
* Booking cancellation and refunds
* Temporary seat holds with expiration
* Advanced event discovery
* Comprehensive audit logging
* Expanded observability
* Additional end-to-end testing
* Horizontal scaling strategies

These features were outside the primary scope of the internship assignment.

---

# 🔮 Future Architecture

A larger production ticketing platform could extend the current workflow:

```text
Authentication
      │
      ▼
Event Discovery
      │
      ▼
Temporary Seat Hold
      │
      ▼
Payment
      │
      ▼
Atomic Booking Confirmation
      │
      ▼
Ticket Generation
      │
      ▼
Email / Notification
```

At substantially higher scale, additional infrastructure such as Redis, background workers, distributed tracing, rate limiting, and more advanced distributed coordination could be introduced.

---

# 📌 Submission Summary

| Requirement                           | Implementation |
| ------------------------------------- | -------------- |
| Next.js frontend                      | ✅              |
| FastAPI backend                       | ✅              |
| MySQL database                        | ✅              |
| Admin event setup                     | ✅              |
| Interactive seat selection            | ✅              |
| Multi-seat booking                    | ✅              |
| Database-level concurrency protection | ✅              |
| Row-level locking                     | ✅              |
| Atomic transactions                   | ✅              |
| Double-booking prevention             | ✅              |
| Conflict handling                     | ✅              |
| Automated tests                       | ✅ 30 tests     |
| Live frontend                         | ✅ Vercel       |
| Live backend                          | ✅ Railway      |
| Documentation                         | ✅              |

---

# 👨‍💻 Author

**Harshdeep Singh**

B.Tech Information Technology

Developed as part of the **NeuBitAt Full-Stack Development Internship Technical Assignment — August 2026**.

---

## Final Engineering Principle

> **The frontend displays availability. The backend validates it. The database guarantees it.**

That principle drives the architecture of the booking workflow and is the foundation for preventing double-booking under concurrent requests.
