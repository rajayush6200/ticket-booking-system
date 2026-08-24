const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/events/:id/seats
// (This router is mounted at /api/events, so the path here is /:id/seats)
router.get('/:id/seats', async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const now = new Date();

    // Release expired holds inline
    await prisma.showSeat.updateMany({
      where: { eventId, status: 'HELD', holdExpiresAt: { lt: now } },
      data: { status: 'AVAILABLE', heldById: null, holdExpiresAt: null },
    });

    const showSeats = await prisma.showSeat.findMany({
      where: { eventId },
      include: { seat: true },
      orderBy: [{ seat: { row: 'asc' } }, { seat: { number: 'asc' } }],
    });

    res.json(showSeats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch seats' });
  }
});

module.exports = router;
