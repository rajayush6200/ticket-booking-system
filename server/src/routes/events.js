const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/events — public, with optional filters
router.get('/', async (req, res) => {
  try {
    const { type, date } = req.query;
    const where = {};
    if (type) where.type = type;
    if (date) where.date = date;

    const events = await prisma.event.findMany({
      where,
      include: {
        venue: true,
        showSeats: {
          include: { seat: true },
        },
      },
      orderBy: { date: 'asc' },
    });

    // Add pricing info and availability
    const enriched = events.map((event) => {
      const seats = event.showSeats;
      const available = seats.filter((s) => s.status === 'AVAILABLE').length;
      const total = seats.length;
      const prices = [...new Set(seats.map((s) => s.seat.price))].sort((a, b) => a - b);
      return {
        ...event,
        available,
        total,
        minPrice: prices[0] || 0,
        maxPrice: prices[prices.length - 1] || 0,
      };
    });

    res.json(enriched);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// GET /api/events/:id
router.get('/:id', async (req, res) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        venue: true,
        showSeats: {
          include: { seat: true },
        },
      },
    });
    if (!event) return res.status(404).json({ error: 'Event not found' });

    // Release expired holds before returning
    const now = new Date();
    await prisma.showSeat.updateMany({
      where: { eventId: event.id, status: 'HELD', holdExpiresAt: { lt: now } },
      data: { status: 'AVAILABLE', heldById: null, holdExpiresAt: null },
    });

    // Re-fetch after cleanup
    const updated = await prisma.event.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { venue: true, showSeats: { include: { seat: true } } },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// POST /api/events — organiser/admin only
router.post('/', authenticate, requireRole('ORGANISER', 'ADMIN'), async (req, res) => {
  try {
    const { title, type, venueId, date, time, description } = req.body;
    if (!title || !type || !venueId || !date || !time) {
      return res.status(400).json({ error: 'Title, type, venueId, date, time are required' });
    }

    const event = await prisma.event.create({
      data: { title, type, venueId: parseInt(venueId), date, time, description: description || '' },
      include: { venue: true },
    });

    // Auto-create ShowSeats for every seat in this venue
    const seats = await prisma.seat.findMany({ where: { venueId: parseInt(venueId) } });
    await prisma.showSeat.createMany({
      data: seats.map((s) => ({ eventId: event.id, seatId: s.id })),
    });

    res.status(201).json({ ...event, seatsCreated: seats.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// DELETE /api/events/:id — organiser/admin only
router.delete('/:id', authenticate, requireRole('ORGANISER', 'ADMIN'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.event.update({ where: { id }, data: { status: 'CANCELLED' } });
    res.json({ message: 'Event cancelled' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to cancel event' });
  }
});

module.exports = router;
