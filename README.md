<div align="center">

# 🎟️ TicketForge

**A Next-Generation Full-Stack Ticket Booking System for Movies & Concerts**

[![React](https://img.shields.io/badge/React-19.0-blue?style=for-the-badge&logo=react)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8.0-purple?style=for-the-badge&logo=vite)](https://vitejs.dev)
[![Node.js](https://img.shields.io/badge/Node.js-Express-green?style=for-the-badge&logo=nodedotjs)](https://nodejs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-1B222D?style=for-the-badge&logo=prisma)](https://prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-336791?style=for-the-badge&logo=postgresql)](https://neon.tech)
[![Deploy Status](https://img.shields.io/badge/Deployment-Live-success?style=for-the-badge)](#)

Explore upcoming events, select your perfect seats on an interactive map, and get your QR code tickets instantly. Built with high concurrency in mind to prevent double-booking.

[Live Demo](https://ticket-booking-system-demo.netlify.app) • [API Endpoint](https://ticket-booking-system-hkd2.onrender.com/api/health)

</div>

---

## 🚀 Live Deployments

TicketForge is fully deployed and accessible globally!

| Environment | Platform | URL |
|-------------|----------|-----|
| **Frontend** | Netlify | [ticket-booking-system-demo.netlify.app](https://ticket-booking-system-demo.netlify.app) |
| **Backend API** | Render | [ticket-booking-system-hkd2.onrender.com](https://ticket-booking-system-hkd2.onrender.com) |
| **Database** | Neon | Serverless PostgreSQL |

*(Note: The backend runs on a free tier and may take 30-50 seconds to wake up from inactivity on your first request.)*

---

## ✨ Key Features

### 👤 Customer Experience
*   **Interactive Seat Map**: Visually select standard or premium seats.
*   **Real-time Seat Holds**: Selected seats are locked exclusively for you for 2 minutes with a live countdown timer.
*   **Waitlist System**: Sold out? Join a category-based waitlist. When a seat opens, the next user in line is automatically notified and granted an exclusive window to claim it.
*   **Digital Tickets**: Receive a dynamic QR Code upon successful booking.
*   **Email Confirmations**: Automated emails powered by EmailJS for bookings and waitlist offers.

### 🎭 Organizer & Admin Suite
*   **Event Management**: Organizers can create and manage movie or concert events.
*   **Revenue Dashboard**: Track booked seats and revenue per event instantly.
*   **Venue Creation**: Admins can configure customized venues, specifying seat rows, sizes, and layout.

---

## 🏗️ Architecture & High Concurrency

TicketForge handles high-traffic seat bookings using strict **database transactions**. 

### The Booking Flow

```mermaid
sequenceDiagram
    participant U as User
    participant A as API Server
    participant DB as PostgreSQL (Prisma)
    
    U->>A: Select Seat (POST /api/seats/hold)
    A->>DB: Begin Transaction
    DB-->>A: Read Seat Status
    alt Seat is AVAILABLE
        A->>DB: Update Status -> HELD
        A->>DB: Verify Update Count === 1
        DB-->>A: Success
        A-->>U: Seat Held (2min countdown starts)
    else Seat is HELD/BOOKED
        DB-->>A: Seat unavailable
        A-->>U: Error: Race condition prevented
    end
```

### The Waitlist Engine

```mermaid
stateDiagram-v2
    [*] --> WAITING: User joins Waitlist
    WAITING --> OFFERED: Someone cancels a booking
    OFFERED --> FULFILLED: User accepts offer within 2 mins
    OFFERED --> EXPIRED: 2 mins elapse without acceptance
    EXPIRED --> WAITING: Offer passes to next user in queue
    FULFILLED --> [*]: Booking Confirmed
```

---

## 🛠️ Tech Stack

| Domain | Technologies |
|--------|--------------|
| **Client** | React 19, Vite, React Router DOM, Axios, Vanilla CSS |
| **Server** | Node.js, Express.js |
| **Database** | PostgreSQL, Prisma ORM |
| **Security** | JWT (JSON Web Tokens), bcryptjs, CORS |
| **Utilities** | `qrcode`, `@emailjs/nodejs` |
| **Deployment** | Netlify (UI), Render (API), Neon (DB) |

---

## 💻 Local Development Setup

Want to run TicketForge locally? Follow these steps:

### 1. Prerequisites
*   Node.js v18+
*   npm or yarn

### 2. Clone the Repository
```bash
git clone https://github.com/rajayush6200/ticket-booking-system.git
cd ticket-booking-system
```

### 3. Backend Setup
```bash
cd server
npm install
cp .env.example .env
```
Update `server/.env` with your PostgreSQL database URL (you can create a free one on [Neon.tech](https://neon.tech)):
```env
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"
JWT_SECRET="your-super-secret-key"
PORT=4000
CLIENT_URL=http://localhost:5173
```
Migrate and seed the database:
```bash
npm run db:migrate
npm run db:seed
npm start
```

### 4. Frontend Setup
```bash
# In a new terminal
cd client
npm install
npm run dev
```
Visit `http://localhost:5173` in your browser.

---

## 🔑 Demo Credentials

To test the application, you can use the following seeded accounts:

| Role | Email | Password |
|------|-------|----------|
| **Customer** | `customer@example.com` | `Customer123!` |
| **Organizer** | `organiser@example.com` | `Organiser123!` |
| **Admin** | `admin@example.com` | `Admin123!` |

---

<div align="center">
  <i>Built with ❤️ for seamless ticket booking experiences.</i>
</div>
