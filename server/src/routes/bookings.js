const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { generateQRDataUrl } = require('../utils/qrcode');
const { sendBookingConfirmation, sendWaitlistOffer } = require('../utils/email');

const router = express.Router();
const prisma = new PrismaClient();

function generateReference() {
  const year = new Date().getFullYear();
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let random = '';
  for (let i = 0; i < 6; i++) random += chars[Math.floor(Math.random() * chars.length)];
  return `TB-${year}-${random}`;
}

// POST /api/bookings — confirm booking
router.post('/', authenticate, async (req, res) => {
  const { eventId, showSeatIds } = req.body;
  const userId = req.user.id;

  if (!eventId || !showSeatIds?.length) {
    return res.status(400).json({ error: 'eventId and showSeatIds are required' });
  }

  try {
    const now = new Date();

    const booking = await prisma.$transaction(async (tx) => {
      // Verify all seats are HELD by this user and not expired
      const seats = await tx.showSeat.findMany({
        where: { id: { in: showSeatIds }, status: 'HELD', heldById: userId },
        include: { seat: true },
      });

      if (seats.length !== showSeatIds.length) {
        throw new Error('Some seats are not held by you or hold has expired. Please select seats again.');
      }

      // Check for expired holds
      for (const seat of seats) {
        if (seat.holdExpiresAt < now) {
          throw new Error('Your seat hold has expired. Please select seats again.');
        }
      }

      const totalAmount = seats.reduce((sum, s) => sum + s.seat.price, 0);
      const reference = generateReference();

      const newBooking = await tx.booking.create({
        data: {
          reference,
          userId,
          eventId: parseInt(eventId),
          totalAmount,
          status: 'CONFIRMED',
          bookingSeats: {
            create: seats.map((s) => ({ showSeatId: s.id })),
          },
        },
        include: {
          event: { include: { venue: true } },
          bookingSeats: { include: { showSeat: { include: { seat: true } } } },
        },
      });

      // Mark seats as BOOKED
      await tx.showSeat.updateMany({
        where: { id: { in: showSeatIds } },
        data: { status: 'BOOKED', heldById: null, holdExpiresAt: null },
      });

      return newBooking;
    });

    // Generate QR code (shown on the confirmation page; email uses booking reference)
    const qrDataUrl = await generateQRDataUrl(booking.reference);

    // Email must not roll back a confirmed booking
    const user = await prisma.user.findUnique({ where: { id: userId } });
    let emailSent = false;
    let emailSimulated = false;
    let emailWarning = null;
    try {
      const result = await sendBookingConfirmation(user.email, user.name, booking);
      emailSent = true;
      emailSimulated = !!result?.simulated;
    } catch (e) {
      console.error('[Email] Failed:', e.text || e.message);
      emailWarning = 'Booking is confirmed, but the confirmation email could not be sent.';
    }

    res.status(201).json({ ...booking, qrDataUrl, emailSent, emailSimulated, emailWarning });
  } catch (err) {
    console.error('[Booking]', err.message);
    res.status(400).json({ error: err.message || 'Booking failed' });
  }
});

// GET /api/bookings — get user's bookings
router.get('/', authenticate, async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { userId: req.user.id },
      include: {
        event: { include: { venue: true } },
        bookingSeats: { include: { showSeat: { include: { seat: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// GET /api/bookings/:id — get single booking with QR
router.get('/:id', authenticate, async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        event: { include: { venue: true } },
        bookingSeats: { include: { showSeat: { include: { seat: true } } } },
      },
    });

    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.userId !== req.user.id && req.user.role === 'CUSTOMER') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const qrDataUrl = await generateQRDataUrl(booking.reference);
    res.json({ ...booking, qrDataUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
});

// POST /api/bookings/:id/cancel
router.post('/:id/cancel', authenticate, async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const userId = req.user.id;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        bookingSeats: { include: { showSeat: { include: { seat: true } } } },
        event: true,
      },
    });

    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.userId !== userId) return res.status(403).json({ error: 'Access denied' });
    if (booking.status === 'CANCELLED') return res.status(400).json({ error: 'Booking already cancelled' });

    const showSeatIds = booking.bookingSeats.map((bs) => bs.showSeatId);
    const categories = [...new Set(booking.bookingSeats.map((bs) => bs.showSeat.seat.category))];

    await prisma.$transaction(async (tx) => {
      // Cancel booking
      await tx.booking.update({ where: { id: bookingId }, data: { status: 'CANCELLED' } });

      // Release seats
      await tx.showSeat.updateMany({
        where: { id: { in: showSeatIds } },
        data: { status: 'AVAILABLE', heldById: null, holdExpiresAt: null },
      });
    });

    // Trigger waitlist assignment for each category
    for (const category of categories) {
      const nextWaiting = await prisma.waitlist.findFirst({
        where: { eventId: booking.eventId, category, status: 'WAITING' },
        orderBy: { createdAt: 'asc' },
        include: { user: true, event: true },
      });

      if (nextWaiting) {
        const offerExpiresAt = new Date(Date.now() + 2 * 60 * 1000);
        await prisma.waitlist.update({
          where: { id: nextWaiting.id },
          data: { status: 'OFFERED', offerExpiresAt },
        });
        try {
          await sendWaitlistOffer(
            nextWaiting.user.email,
            nextWaiting.user.name,
            nextWaiting.event.title,
            category,
            offerExpiresAt
          );
        } catch (e) {
          console.error('[Waitlist Email]', e.text || e.message);
        }
      }
    }

    res.json({ message: 'Booking cancelled successfully. Payment simulated successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Cancellation failed' });
  }
});

// GET /api/bookings/event/:eventId — organiser view all bookings for an event
router.get('/event/:eventId', authenticate, async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { eventId: parseInt(req.params.eventId) },
      include: {
        user: { select: { id: true, name: true, email: true } },
        bookingSeats: { include: { showSeat: { include: { seat: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch event bookings' });
  }
});

module.exports = router;
