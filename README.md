# TicketForge — Ticket Booking System

A full-stack web application for booking tickets to movies and concerts. Built as a software engineering technical assessment.

## Live Demo Screenshots

> Run locally and visit `http://localhost:5173`

## Features

### Customer
- 🎬 Browse upcoming movies & concerts
- 🪑 Visual interactive seat map
- ⏱ 2-minute seat hold with countdown timer
- ✅ Confirm booking → QR code ticket
- 📋 View booking history
- ❌ Cancel bookings
- ⏳ Join category-based waitlist (sold-out events)
- 🎉 Accept waitlist offers when seats open up

### Organiser
- ➕ Create events (movie/concert, venue, date, time)
- 📊 Dashboard: available/held/booked seats per event
- 💰 Revenue tracking per event

### Admin
- 🏟️ Create venues with configurable rows, seats, and pricing
- Premium (first N rows) + Standard seat categories

## Tech Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Frontend    | React 19, Vite 8, Vanilla CSS       |
| Backend     | Node.js, Express 4                  |
| Database    | SQLite via Prisma ORM 5             |
| Auth        | JWT (jsonwebtoken) + bcryptjs       |
| QR Code     | `qrcode` npm package               |
| Email       | EmailJS (`@emailjs/nodejs`)         |

## Project Structure

```
ticket-booking/
├── client/              # React + Vite frontend
│   └── src/
│       ├── api/         # Axios client
│       ├── components/  # Navbar, CountdownTimer
│       ├── hooks/       # useAuth
│       └── pages/       # All page components
├── server/
│   └── src/
│       ├── middleware/  # JWT auth
│       ├── routes/      # API route handlers
│       └── utils/       # email, qrcode, cleanup scheduler
├── prisma/
│   └── schema.prisma    # Database schema
├── tests/
│   └── booking.test.js  # Integration tests
├── .env.example
├── .gitignore
├── README.md
└── SYSTEM_DESIGN.md
```

## Database Schema

```
User          — id, name, email, password, role (CUSTOMER|ORGANISER|ADMIN)
Venue         — id, name, rows, seatsPerRow
Seat          — id, venueId, row, number, category (PREMIUM|STANDARD), price
Event         — id, title, type (MOVIE|CONCERT), venueId, date, time, status
ShowSeat      — id, eventId, seatId, status (AVAILABLE|HELD|BOOKED), heldById, holdExpiresAt
Booking       — id, reference, userId, eventId, totalAmount, status, createdAt
BookingSeat   — id, bookingId, showSeatId
Waitlist      — id, userId, eventId, category, status (WAITING|OFFERED|FULFILLED|EXPIRED), offerExpiresAt
```

## Setup Instructions

### Prerequisites
- Node.js v18+
- npm

### 1. Clone / Navigate to Project

```bash
cd ticket-booking
```

### 2. Install Server Dependencies

```bash
cd server
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
# Edit server/.env — the defaults work for local development
```

Copy `.env.example` to `server/.env` and fill in values. Defaults for local development:

```
DATABASE_URL="file:../dev.db"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
PORT=4000
CLIENT_URL=http://localhost:5173
```

### 4. Run Database Migration

```bash
cd server
npx prisma migrate dev --name init --schema=../prisma/schema.prisma
```

### 5. Seed the Database

```bash
cd server
node src/seed.js
```

### 6. Start the Backend

```bash
cd server
node src/index.js
# Server runs at http://localhost:4000
```

### 7. Install & Start the Frontend

```bash
cd client
npm install
npm run dev
# Frontend runs at http://localhost:5173
```

## Environment Variables

| Variable     | Description                              | Required |
|-------------|------------------------------------------|----------|
| DATABASE_URL | SQLite file path (`file:../dev.db`)       | Yes      |
| JWT_SECRET   | Secret key for JWT signing               | Yes      |
| PORT         | Backend port (default: 4000)             | No       |
| CLIENT_URL   | Frontend URL for CORS (default: localhost:5173) | No |
| EMAILJS_PUBLIC_KEY | EmailJS public key                  | For real email |
| EMAILJS_PRIVATE_KEY | EmailJS private key (server only)  | For real email |
| EMAILJS_SERVICE_ID | EmailJS service ID (`service_...`) | For real email |
| EMAILJS_TEMPLATE_ID | EmailJS template ID (`template_...`) | For real email |

> If EmailJS is not configured, emails are **simulated** (printed to the server console). Booking and waitlist still succeed if sending fails.

## EmailJS setup (one template)

EmailJS **free plans allow one template**. This app sends both booking confirmation and waitlist offers through that single template.

1. Create an account at [emailjs.com](https://www.emailjs.com/).
2. **Email Services** → add Gmail (or another provider) → copy **Service ID**.
3. **Account → Security** → enable **Allow API requests from non-browser applications**.
4. **Account → API Keys** → copy **Public Key** and **Private Key**. Never put the private key in frontend code or git.
5. **Email Templates** → create **one** template (e.g. TicketForge Booking Confirmation).
6. Set **To Email** to `{{to_email}}` (not a hardcoded address).
7. Set **From Name** to `TicketForge`, keep **Use Default Email Address**.
8. **Subject:** `{{email_subject}}`
9. **Body** — keep your booking fields and add `{{intro_text}}` so waitlist mail is not titled as a confirmed booking:

```
Hello {{customer_name}},

{{intro_text}}

Event: {{event_name}}
Venue: {{venue}}
Date: {{date}}
Time: {{time}}
Seats: {{seat_numbers}}
Total: ₹{{total_amount}}
Booking reference: {{booking_reference}}
Ticket: {{ticket_info}}
Seat/category: {{seat_category}}
Offer expires: {{offer_expires_at}}

View / accept: {{booking_url}}

Thank you for using TicketForge.
```

10. Copy **Template ID** from the Settings tab.
11. Put all four IDs/keys in `server/.env` as `EMAILJS_*` (see `.env.example`).

The QR code stays on the booking confirmation page. Emails include the booking reference and a link, not the QR image.

## Demo Credentials

| Role       | Email                     | Password        |
|------------|--------------------------|-----------------|
| Customer   | customer@example.com     | Customer123!    |
| Organiser  | organiser@example.com    | Organiser123!   |
| Admin      | admin@example.com        | Admin123!       |

## API Endpoints

### Auth
```
POST /api/auth/register    — Create account
POST /api/auth/login       — Login, receive JWT
```

### Events
```
GET  /api/events           — List events (optional: ?type=MOVIE&date=2026-09-10)
GET  /api/events/:id       — Get event details with showSeats
POST /api/events           — Create event (ORGANISER/ADMIN)
DELETE /api/events/:id     — Cancel event (ORGANISER/ADMIN)
```

### Seats
```
GET  /api/events/:id/seats — Get all showSeats for an event
POST /api/seats/hold       — Hold seats: { showSeatIds: [1,2,3] }
POST /api/seats/release    — Release held seats: { showSeatIds: [1,2] }
```

### Bookings
```
POST /api/bookings         — Confirm booking: { eventId, showSeatIds }
GET  /api/bookings         — My bookings (auth)
GET  /api/bookings/:id     — Get booking + QR code (auth)
POST /api/bookings/:id/cancel — Cancel booking (auth)
```

### Waitlist
```
POST /api/waitlist         — Join waitlist: { eventId, category }
GET  /api/waitlist         — My waitlist entries (auth)
POST /api/waitlist/:id/accept — Accept a waitlist offer (auth)
```

### Venues (Admin)
```
POST /api/venues           — Create venue (ADMIN)
GET  /api/venues           — List venues
```

## Running Tests

```bash
# Make sure server is running first: cd server && node src/index.js
node tests/booking.test.js
```

Tests cover:
- ✅ User registration and login
- ✅ Event listing
- ✅ Seat hold for available seat
- ✅ Concurrent hold rejection
- ✅ Booking confirmation (HELD → BOOKED)
- ✅ QR code generation
- ✅ Booking cancellation (BOOKED → AVAILABLE)
- ✅ Waitlist join and duplicate rejection

## Seat Hold TTL Explanation

When a customer selects seats, the server:
1. Starts a **database transaction** (SQLite BEGIN IMMEDIATE)
2. Checks if the seat is `AVAILABLE` (or `HELD` with expired TTL)
3. Updates `status = 'HELD'`, `heldById = userId`, `holdExpiresAt = now + 2 minutes`
4. **Verifies** the update actually succeeded (checks updated count)
5. If count mismatches → another user got there first → returns 409 Conflict

Hold expiry is enforced two ways:
- **Inline**: Before returning seat availability, expired holds are cleared
- **Background**: `setInterval` runs every 15 seconds to batch-clear all expired holds

## Concurrency Prevention

SQLite is used with Prisma transactions. The critical logic:

```js
await prisma.$transaction(async (tx) => {
  // 1. Read seat status
  const seat = await tx.showSeat.findMany({ where: { id: seatId } });
  
  // 2. Check it's available (throw if not)
  if (seat.status !== 'AVAILABLE') throw new Error('Seat not available');
  
  // 3. Try to update (only if still AVAILABLE)
  await tx.showSeat.updateMany({
    where: { id: seatId, OR: [{ status: 'AVAILABLE' }, { status: 'HELD', holdExpiresAt: { lt: now } }] },
    data: { status: 'HELD', heldById, holdExpiresAt }
  });
  
  // 4. Verify update succeeded — if rowCount < expected → conflict!
  const verified = await tx.showSeat.findMany({ where: { id: seatId, heldById, status: 'HELD' } });
  if (verified.length !== expected) throw new Error('Race condition detected');
});
```

SQLite's serialized writes ensure only one transaction can modify a row at a time.

## Waitlist Flow

```
1. All seats of a category sold out
2. Customer clicks "Join PREMIUM Waitlist"
   → POST /api/waitlist { eventId, category: 'PREMIUM' }
   → Entry created with status: WAITING

3. Another customer cancels their PREMIUM booking
   → Seats released to AVAILABLE
   → System finds EARLIEST WAITING entry (FIFO)
   → Updates status: OFFERED, offerExpiresAt: now + 2 min
   → EmailJS waitlist email sent (or simulated)

4. Customer sees offer in "My Bookings → Waitlist" tab
   → Countdown timer showing time left
   → Clicks "Accept Seat"
   → POST /api/waitlist/:id/accept
   → System finds an available PREMIUM seat
   → Holds it for the customer (2 more minutes)
   → Customer taken to checkout

5. If offer expires: system marks EXPIRED, moves to next WAITING entry
```

## QR Code

Each confirmed booking generates a QR code containing:
```
BOOKING:TB-2026-AB12CD
```

The QR is:
- Displayed on the confirmation page
- Downloadable as PNG
- Referenced in the EmailJS confirmation email by booking reference (not embedded as an image)

## Deployment

### Frontend (Vercel)
```bash
cd client
# Set VITE_API_URL=https://your-backend.onrender.com/api in Vercel env vars
npm run build
# Deploy dist/ to Vercel
```

### Backend (Render / Railway)
1. Push to GitHub
2. Connect repo to Render
3. Set environment variables from `.env.example`
4. Build command: `cd server && npm install`
5. Start command: `node server/src/index.js`

**Note on SQLite**: SQLite works for demos. For persistent cloud deployment, switch to PostgreSQL:
1. Change `provider = "postgresql"` in `prisma/schema.prisma`
2. Update `DATABASE_URL` to a PostgreSQL connection string
3. Re-run migrations

### Free PostgreSQL Options
- [Neon](https://neon.tech) — Free PostgreSQL
- [Supabase](https://supabase.com) — Free PostgreSQL
- [Railway](https://railway.app) — Free PostgreSQL
