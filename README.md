# SeatBook — Concurrency-Safe Event Seat Booking System

> **Full-Stack Development Assignment**  
> **Status: Production Ready & Fully Verified**

A production-grade, concurrency-safe **Event Seat Booking System** built with **Next.js 16**, **FastAPI**, and **MySQL 8 (InnoDB)**.

The application allows administrators to create events, configure custom seat grids, manage administrative seat blocks, and cancel/delete events. Users can browse upcoming events, interact with touch-friendly seat maps, and execute multi-seat reservations safely.

The core engineering objective is **preventing double-booking and race conditions when multiple users attempt to reserve the same seat concurrently**.

---

## 🌐 Live Application & Deployment

| Service               | Production URL / Link                                       | Platform |
| :-------------------- | :---------------------------------------------------------- | :------- |
| **Live Frontend**     | [https://event-seat-booking-delta.vercel.app/](https://event-seat-booking-delta.vercel.app/) | Vercel   |
| **Live Backend API**  | [https://event-seat-booking-production.up.railway.app/](https://event-seat-booking-production.up.railway.app/) | Railway  |
| **Backend Health**    | [https://event-seat-booking-production.up.railway.app/health](https://event-seat-booking-production.up.railway.app/health) | Railway  |
| **API Documentation** | [https://event-seat-booking-production.up.railway.app/docs](https://event-seat-booking-production.up.railway.app/docs) | Swagger  |
| **GitHub Repository** | [https://github.com/harshdeepsingh888-ps/Event-seat-booking](https://github.com/harshdeepsingh888-ps/Event-seat-booking) | GitHub   |

### Production System Architecture

```text
               User Devices (Desktop & Mobile)
                              │
                              ▼
                   ┌─────────────────────┐
                   │    Vercel Edge      │
                   │  Next.js 16 Client  │
                   └──────────┬──────────┘
                              │ HTTPS / JWT Auth Header
                              ▼
                   ┌─────────────────────┐
                   │   Railway Service   │
                   │   FastAPI Backend   │
                   └──────────┬──────────┘
                              │ Async SQL (aiomysql)
                              ▼
                   ┌─────────────────────┐
                   │       MySQL 8       │
                   │    InnoDB Engine    │
                   └─────────────────────┘
```

---

## 🔐 Authentication & Access Control

The application implements Role-Based Access Control (RBAC). Administrative routes (`/admin`, `POST /events`, `PATCH /seats/block`, `DELETE /events/{id}`) require authentication with an `ADMIN` role account. Administrators can authenticate via `/admin/login` using JWT Bearer tokens.

---

## ⚡ Technical Highlights & Key Features

### 1. Concurrency-Safe Booking Engine
- **Row-Level Pessimistic Locking (`SELECT ... FOR UPDATE`)**: Locks requested seat rows at the database engine level during reservation processing.
- **Deterministic Locking Order**: Sorts seat IDs before acquiring locks to prevent database deadlocks under concurrent traffic spikes.
- **Atomic Multi-Seat Transactions**: Ensures multi-seat reservations succeed 100% or roll back cleanly without leaving partial seat allocations.
- **Conflict Handling (`HTTP 409`)**: Returns clear conflict payloads if a requested seat is taken milliseconds prior to submission, instantly refreshing the seat map.

### 2. Authentication & Role-Based Access Control (RBAC)
- **JWT Bearer Token Security**: Password hashing with `bcrypt` and signed JWT access tokens (`HS256`).
- **Route & API Protection**: Enforces `require_admin` dependency on administrative routes (`POST /events`, `PATCH /seats/block`, `DELETE /events/{id}`, analytics, and booking logs).
- **Client Session Context**: React `AuthContext` with automatic persistent token management (`localStorage`) and route redirection.

### 3. De-Congested UI & Mobile Responsiveness
- **Slide-Over Mobile Drawer (`≡`)**: Collapsible navigation sidebar for mobile screens ($\le 768\text{px}$) with backdrop blur overlays and touch controls.
- **Touch Panning Seat Grid**: Seat maps support horizontal touch panning (`touch-action: pan-x`), larger touch targets ($38\times38\text{px}$), tactile active feedback, and responsive seat legends.
- **Spacious Visual Rhythm**: De-congested card layouts ($1.75\text{rem}$ padding), glassmorphic panels, responsive stat cards, and scrollable data tables (`.table-responsive`).

### 4. Admin Operations & Event Management
- **Event Setup**: Configure event name, date, time, and custom grid dimensions (rows $\times$ columns).
- **Administrative Seat Blocking**: Select and hold seats out-of-service or for VIP reservation.
- **Event Cancellation / Deletion**: Permanently remove events with cascading deletion of seat grids and booking records.
- **Analytics & Booking Logs**: Real-time total capacity, availability, booked count, occupancy percentage, and chronological transaction logs.

---

## 🛠️ Technology Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | Next.js 16 (App Router), React 19 | Server & Client Components, Responsive Glassmorphic UI |
| **Language** | TypeScript, Python 3.14 | Strict type checking on frontend and backend schemas |
| **Backend API** | FastAPI, Uvicorn | High-performance asynchronous REST API framework |
| **Database** | MySQL 8 (InnoDB Engine) | ACID transactions, row-level locking, foreign keys |
| **ORM & Migrations**| SQLAlchemy 2.0 (Async), Alembic | Asynchronous database operations & migrations |
| **Authentication**| PyJWT, bcrypt | JWT Token generation and secure password hashing |
| **Testing** | pytest, pytest-asyncio | 35 automated unit, integration, and concurrency tests |

---

## 🔒 Concurrency Strategy: 4-Layer Double-Booking Prevention

```text
Request: Book [A1, A2, A3]
         │
         ▼
Sort IDs deterministically [A1, A2, A3]  <── Layer 1: Deadlock Avoidance
         │
         ▼
BEGIN TRANSACTION
         │
         ▼
SELECT * FROM seats FOR UPDATE            <── Layer 2: InnoDB Row Locking
         │
         ▼
Validate all seats AVAILABLE?            <── Layer 3: Atomic Validation
         ├── NO  ──► ROLLBACK & Return HTTP 409 Conflict
         │
         ▼
Mark seats BOOKED & Insert Booking
         │
         ▼
COMMIT TRANSACTION                       <── Layer 4: Relational Integrity
```

---

## 🧪 Automated Test Suite

The backend includes **35 automated test cases** covering API contracts, authentication, database concurrency, and administrative operations:

```bash
cd backend
python -m pytest
```

### Test Coverage Highlights:
- `test_auth.py`: User registration, admin login, invalid password rejections, JWT token validation.
- `test_admin_api.py`: Event creation, administrative seat blocking/unblocking, event deletion, and RBAC rejection (`403 Forbidden`).
- `test_concurrency.py`: Simulated parallel booking attempts on identical seat IDs testing `409 Conflict` and zero double-booking guarantees.
- `test_event_api.py` & `test_e2e_flow.py`: End-to-end user reservation flows, multi-seat atomic rollbacks, and schema validation.

---

## 🚀 Local Development Setup

### Prerequisites
- Python 3.10+
- Node.js 20+ & npm
- MySQL 8+

---

### 1. Database Setup

```sql
CREATE DATABASE IF NOT EXISTS neubit_event_booking;
CREATE USER IF NOT EXISTS 'neubit_app'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON neubit_event_booking.* TO 'neubit_app'@'localhost';
FLUSH PRIVILEGES;
```

---

### 2. Backend Setup

```bash
cd backend

# Create & activate virtual environment
python -m venv .venv
# On Windows PowerShell:
.venv\Scripts\Activate.ps1
# On Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
```

Edit `backend/.env`:
```env
ENVIRONMENT=development
ASYNC_DATABASE_URL=mysql+aiomysql://neubit_app:your_secure_password@localhost:3306/neubit_event_booking
DB_POOL_SIZE=10
DB_MAX_OVERFLOW=20
JWT_SECRET_KEY=your_development_jwt_secret_key_32_bytes_min
```

Run database migrations:
```bash
python -m alembic upgrade head
```

Start FastAPI development server:
```bash
uvicorn app.main:app --reload --port 8000
```

- API Base: `http://localhost:8000`
- Interactive Swagger Docs: `http://localhost:8000/docs`

---

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local
```

Edit `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Start Next.js development server:
```bash
npm run dev
```

- Frontend App: `http://localhost:3000`
- Admin Console: `http://localhost:3000/admin`

---

## 📌 Feature Verification Summary

| Requirement / Feature | Status | Verification Method |
| :--- | :---: | :--- |
| **Next.js 16 Frontend** | ✅ | Responsive App Router with Glassmorphic UI |
| **FastAPI Async Backend** | ✅ | OpenAPI Docs at `/docs` |
| **MySQL 8 InnoDB** | ✅ | Row-level locking (`FOR UPDATE`) |
| **Authentication & RBAC** | ✅ | JWT tokens + Protected `/admin` routes |
| **Admin Route Security** | ✅ | Protected admin route guard & auth middleware |
| **Interactive Seat Map** | ✅ | Touch panning + Status indicators |
| **Multi-Seat Atomic Booking**| ✅ | Single transaction rollback |
| **Double-Booking Protection**| ✅ | Verified by `test_concurrency.py` |
| **Delete / Cancel Event** | ✅ | Cascading DB deletion + UI confirmation modal |
| **Mobile Responsiveness** | ✅ | Slide-over drawer menu + Touch target optimization |
| **Automated Test Suite** | ✅ | 35 pytest test cases passing |

---

## 👨‍💻 Author

**Harshdeep Singh**  
*B.Tech Information Technology*  
Developed for the **NeuBitAt Full-Stack Development Assignment — August 2026**

> **Engineering Principle**: *The frontend displays availability. The backend validates it. The database guarantees it.*
