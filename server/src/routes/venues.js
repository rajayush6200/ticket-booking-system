const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/venues — admin only
router.post('/', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const { name, rows, seatsPerRow, premiumRows = 2, premiumPrice = 250, standardPrice = 150 } = req.body;
    if (!name || !rows || !seatsPerRow) {
      return res.status(400).json({ error: 'name, rows, seatsPerRow are required' });
    }

    const venue = await prisma.venue.create({
      data: { name, rows: parseInt(rows), seatsPerRow: parseInt(seatsPerRow) },
    });

    // Auto-generate seats
    const rowLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.slice(0, parseInt(rows)).split('');
    const seats = [];
    for (let r = 0; r < rowLetters.length; r++) {
      for (let n = 1; n <= parseInt(seatsPerRow); n++) {
        const category = r < parseInt(premiumRows) ? 'PREMIUM' : 'STANDARD';
        const price = category === 'PREMIUM' ? parseFloat(premiumPrice) : parseFloat(standardPrice);
        seats.push({ venueId: venue.id, row: rowLetters[r], number: n, category, price });
      }
    }
    await prisma.seat.createMany({ data: seats });

    res.status(201).json({ ...venue, seatsCreated: seats.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create venue' });
  }
});

// GET /api/venues
router.get('/', async (req, res) => {
  try {
    const venues = await prisma.venue.findMany({
      include: { _count: { select: { seats: true } } },
    });
    res.json(venues);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch venues' });
  }
});

module.exports = router;
