const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/seats/hold — authenticated
router.post('/hold', authenticate, async (req, res) => {
  const { showSeatIds } = req.body; // array of show seat IDs
  const userId = req.user.id;

  if (!showSeatIds || !Array.isArray(showSeatIds) || showSeatIds.length === 0) {
    return res.status(400).json({ error: 'showSeatIds array is required' });
  }

  try {
    const now = new Date();
    const holdExpiresAt = new Date(now.getTime() + 2 * 60 * 1000); // 2 minutes

    const result = await prisma.$transaction(async (tx) => {
      // Check all requested seats in one query
      const seatData = await tx.showSeat.findMany({
        where: { id: { in: showSeatIds.map(Number) } },
        include: { seat: true },
      });

      if (seatData.length !== showSeatIds.length) {
        throw new Error('One or more seats not found');
      }

      // Check availability (expired holds are treated as available)
      for (const seat of seatData) {
        const isExpiredHold = seat.status === 'HELD' && seat.holdExpiresAt < now;
        if (!isExpiredHold && seat.status !== 'AVAILABLE') {
          throw new Error(`Seat ${seat.seat.row}${seat.seat.number} is no longer available`);
        }
      }

      // Hold all seats atomically
      await tx.showSeat.updateMany({
        where: {
          id: { in: showSeatIds.map(Number) },
          OR: [
            { status: 'AVAILABLE' },
            { status: 'HELD', holdExpiresAt: { lt: now } },
          ],
        },
        data: { status: 'HELD', heldById: userId, holdExpiresAt },
      });

      // Verify all were updated (concurrency check)
      const updated = await tx.showSeat.findMany({
        where: { id: { in: showSeatIds.map(Number) }, heldById: userId, status: 'HELD' },
      });

      if (updated.length !== showSeatIds.length) {
        throw new Error('Seat is no longer available — another user may have selected it simultaneously');
      }

      return { holdExpiresAt };
    });

    res.json({ message: 'Seats held successfully', holdExpiresAt: result.holdExpiresAt });
  } catch (err) {
    console.error('[Hold]', err.message);
    res.status(409).json({ error: err.message || 'Failed to hold seats' });
  }
});

// POST /api/seats/release — authenticated
router.post('/release', authenticate, async (req, res) => {
  const { showSeatIds } = req.body;
  const userId = req.user.id;

  if (!showSeatIds || !Array.isArray(showSeatIds)) {
    return res.status(400).json({ error: 'showSeatIds array is required' });
  }

  try {
    await prisma.showSeat.updateMany({
      where: { id: { in: showSeatIds.map(Number) }, heldById: userId, status: 'HELD' },
      data: { status: 'AVAILABLE', heldById: null, holdExpiresAt: null },
    });
    res.json({ message: 'Seats released' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to release seats' });
  }
});

module.exports = router;
