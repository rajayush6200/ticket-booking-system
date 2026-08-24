const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env'), override: true });
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const eventSeatsRouter = require('./routes/seats');     // GET /:id/seats
const holdReleaseRouter = require('./routes/holdRelease'); // POST /hold, /release
const bookingRoutes = require('./routes/bookings');
const waitlistRoutes = require('./routes/waitlist');
const venueRoutes = require('./routes/venues');
const { startCleanupScheduler } = require('./utils/cleanup');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/events', eventSeatsRouter); // GET /api/events/:id/seats
app.use('/api/seats', holdReleaseRouter); // POST /api/seats/hold, /api/seats/release
app.use('/api/bookings', bookingRoutes);
app.use('/api/waitlist', waitlistRoutes);
app.use('/api/venues', venueRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// 404 handler
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  startCleanupScheduler();
});

module.exports = app;
