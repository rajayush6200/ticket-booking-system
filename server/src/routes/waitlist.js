const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { sendWaitlistOffer } = require('../utils/email');

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/waitlist — join waitlist for a category
router.post('/', authenticate, async (req, res) => {
  try {
    const { eventId, category } = req.body;
    const userId = req.user.id;

    if (!eventId || !category) {
      return res.status(400).json({ error: 'eventId and category are required' });
    }

    // Check if already on waitlist
    const existing = await prisma.waitlist.findFirst({
      where: { userId, eventId: parseInt(eventId), category, status: { in: ['WAITING', 'OFFERED'] } },
    });
    if (existing) return res.status(409).json({ error: 'You are already on the waitlist for this category' });

    const entry = await prisma.waitlist.create({
      data: { userId, eventId: parseInt(eventId), category, status: 'WAITING' },
    });

    res.status(201).json({ message: `You've been added to the ${category} waitlist`, entry });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to join waitlist' });
  }
});

// GET /api/waitlist — user's waitlist entries
router.get('/', authenticate, async (req, res) => {
  try {
    const entries = await prisma.waitlist.findMany({
      where: { userId: req.user.id },
      include: { event: { include: { venue: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(entries);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch waitlist' });
  }
});

// POST /api/waitlist/:id/accept — accept a waitlist offer
router.post('/:id/accept', authenticate, async (req, res) => {
  try {
    const entryId = parseInt(req.params.id);
    const userId = req.user.id;
    const now = new Date();

    const entry = await prisma.waitlist.findUnique({
      where: { id: entryId },
      include: { event: { include: { venue: true } } },
    });

    if (!entry) return res.status(404).json({ error: 'Waitlist entry not found' });
    if (entry.userId !== userId) return res.status(403).json({ error: 'Access denied' });
    if (entry.status !== 'OFFERED') return res.status(400).json({ error: 'No active offer to accept' });
    if (entry.offerExpiresAt < now) {
      await prisma.waitlist.update({ where: { id: entryId }, data: { status: 'EXPIRED' } });
      return res.status(400).json({ error: 'Offer has expired' });
    }

    // Find an available seat of the requested category for this event
    const availableSeat = await prisma.showSeat.findFirst({
      where: { eventId: entry.eventId, status: 'AVAILABLE', seat: { category: entry.category } },
      include: { seat: true },
    });

    if (!availableSeat) {
      return res.status(409).json({ error: 'No available seats found for this category' });
    }

    const holdExpiresAt = new Date(now.getTime() + 2 * 60 * 1000);

    // Hold the seat and mark waitlist as fulfilled
    await prisma.$transaction(async (tx) => {
      await tx.showSeat.update({
        where: { id: availableSeat.id },
        data: { status: 'HELD', heldById: userId, holdExpiresAt },
      });
      await tx.waitlist.update({
        where: { id: entryId },
        data: { status: 'FULFILLED' },
      });
    });

    res.json({
      message: 'Seat held! Complete your booking within 2 minutes.',
      showSeat: availableSeat,
      holdExpiresAt,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to accept offer' });
  }
});

module.exports = router;
