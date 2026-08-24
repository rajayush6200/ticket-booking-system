# System Design — TicketForge

A concise explanation of key design decisions in the ticket booking system (~800 words).

## Overall Architecture

```
Browser (React SPA)
    │  HTTP REST (JSON)
    ▼
Express Server (Node.js)
    │  Prisma ORM
    ▼
SQLite Database (dev.db)
```

Single-process monolith with a SQLite database — ideal for assessment scale. No queues, no caches, no microservices. Every design decision prioritises **simplicity and correctness**.

---

## 1. Seat Hold + TTL

### The Problem
Between "click seat" and "confirm booking", the user needs a guaranteed window to complete checkout. Without this, a seat could be booked by someone else mid-checkout.

### Solution: 2-Minute Holds
When a user selects seats, the server:
1. Sets `status = 'HELD'`
2. Sets `heldById = userId`
3. Sets `holdExpiresAt = now + 120 seconds`

The hold is a **lease** — the customer "owns" the seat temporarily. Only they can confirm it into a real booking.

### Automatic Release
Holds expire via two mechanisms:

**Inline cleanup**: Every time seat availability is queried (`GET /api/events/:id/seats`), expired holds are released first. This is zero-latency for the requester.

**Background scheduler**: A `setInterval` runs every 15 seconds to batch-release all expired holds across the entire database. This ensures cleanup even if no users are querying.

```js
// Every 15 seconds
await prisma.showSeat.updateMany({
  where: { status: 'HELD', holdExpiresAt: { lt: new Date() } },
  data: { status: 'AVAILABLE', heldById: null, holdExpiresAt: null },
});
```

---

## 2. Concurrent Seat Selection Prevention

### The Problem
Two users click the same seat at the same millisecond. Without protection, both could read `AVAILABLE`, both update to `HELD`, and both believe they own the seat.

### Solution: Optimistic Locking via Transactions

The hold logic runs inside a **Prisma database transaction**:

```js
await prisma.$transaction(async (tx) => {
  // Step 1: Read seat state
  const seat = await tx.showSeat.findMany({ where: { id: seatId } });
  if (seat.status !== 'AVAILABLE') throw new Error('Not available');

  // Step 2: Conditional update (only if still AVAILABLE)
  await tx.showSeat.updateMany({
    where: {
      id: seatId,
      OR: [{ status: 'AVAILABLE' }, { status: 'HELD', holdExpiresAt: { lt: now } }]
    },
    data: { status: 'HELD', heldById: userId, holdExpiresAt }
  });

  // Step 3: Verify — did our update actually win?
  const verified = await tx.showSeat.findMany({
    where: { id: seatId, heldById: userId, status: 'HELD' }
  });

  if (verified.length !== expected) {
    throw new Error('Seat is no longer available');
  }
});
```

SQLite serializes writes within a transaction. If User A and User B race:
- One transaction commits → seat is `HELD` with their `userId`
- The other reads the now-`HELD` seat → fails the verification step → returns 409 Conflict

The `WHERE` clause in `updateMany` acts as an **optimistic lock** — it only updates if the seat is still in the expected state.

---

## 3. Waitlist — FIFO Flow

### Joining the Waitlist
When all seats of a category (`PREMIUM` or `STANDARD`) are `HELD` or `BOOKED`, a customer can join the waitlist:
```
POST /api/waitlist { eventId, category: 'PREMIUM' }
→ Waitlist row: { status: 'WAITING', createdAt: timestamp }
```

### Triggering an Offer
When a booking is **cancelled**:
1. Seats are released → `status = 'AVAILABLE'`
2. The server queries: "Who is the **earliest** WAITING person for this event+category?"
   ```js
   await prisma.waitlist.findFirst({
     where: { eventId, category, status: 'WAITING' },
     orderBy: { createdAt: 'asc' }, // FIFO
   });
   ```
3. That person's entry is updated: `status = 'OFFERED'`, `offerExpiresAt = now + 2 min`
4. A notification email is sent (or simulated)

### Accepting an Offer
When the customer accepts:
1. Server verifies the offer hasn't expired
2. Finds a currently `AVAILABLE` seat of the requested category
3. Holds it for 2 minutes (same hold mechanism as normal flow)
4. Waitlist entry → `status = 'FULFILLED'`
5. Customer is redirected to checkout

### Offer Expiry
The same background scheduler also checks for expired offers every 15 seconds, marks them `EXPIRED`, and cascades to the **next** WAITING entry in the FIFO queue.

---

## 4. QR Code Generation

After a booking is confirmed:
```js
const qrContent = `BOOKING:${booking.reference}`;
const qrDataUrl = await QRCode.toDataURL(qrContent);
```

The `qrcode` npm library generates a base64 PNG data URL. This is:
- Returned in the API response
- Rendered directly as `<img src={qrDataUrl}>`
- Embeddable in emails via HTML `<img src="data:image/png;base64,..."/>`

The QR contains only the booking reference — no personal data.

---

## 5. Email (Optional SMTP)

Nodemailer is configured if `SMTP_*` environment variables are set. If they're absent, email calls fall through to:
```js
console.log(`[EMAIL SIMULATED] Ticket sent to ${email}`);
```

This prevents the application from crashing in dev/demo environments while still exercising all the email code paths.

---

## 6. Authentication

JWT-based stateless auth:
- Passwords hashed with bcrypt (cost factor 10)
- JWT signed with `JWT_SECRET`, 24-hour expiry
- Every protected route extracts and verifies the token from `Authorization: Bearer <token>`
- Role checking via middleware: `requireRole('ORGANISER', 'ADMIN')`

No session storage, no cookies. Simple and stateless.

---

## Key Trade-offs

| Decision | Choice | Reason |
|----------|--------|--------|
| Database | SQLite | Zero setup, sufficient for demo scale |
| Real-time updates | Polling (8s) | Simpler than WebSockets for assessment |
| Hold mechanism | DB transaction | No Redis required |
| Email | Optional SMTP | Demo doesn't need real email |
| Payments | Simulated | Out of scope |

## Scalability Notes (For Interview)

For production scale:
- Replace SQLite with PostgreSQL — Prisma supports zero-code-change migration
- Add Redis for distributed session/hold management
- Use WebSockets for real-time seat map updates
- Run behind a load balancer with sticky sessions or stateless JWT
- Add a proper job queue (Bull/BullMQ) for waitlist notifications
