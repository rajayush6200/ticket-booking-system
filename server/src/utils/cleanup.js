const { PrismaClient } = require('@prisma/client');
const { sendWaitlistOffer } = require('./email');

const prisma = new PrismaClient();

// Release expired holds every 15 seconds
async function releaseExpiredHolds() {
  try {
    const now = new Date();
    const expired = await prisma.showSeat.findMany({
      where: { status: 'HELD', holdExpiresAt: { lt: now } },
    });

    if (expired.length > 0) {
      await prisma.showSeat.updateMany({
        where: { status: 'HELD', holdExpiresAt: { lt: now } },
        data: { status: 'AVAILABLE', heldById: null, holdExpiresAt: null },
      });
      console.log(`[Cleanup] Released ${expired.length} expired hold(s)`);
    }
  } catch (err) {
    console.error('[Cleanup] Error releasing expired holds:', err.message);
  }
}

// Expire old waitlist offers
async function expireWaitlistOffers() {
  try {
    const now = new Date();
    const expired = await prisma.waitlist.findMany({
      where: { status: 'OFFERED', offerExpiresAt: { lt: now } },
      include: { user: true, event: true },
    });

    for (const offer of expired) {
      await prisma.waitlist.update({
        where: { id: offer.id },
        data: { status: 'EXPIRED' },
      });
      console.log(`[Cleanup] Expired waitlist offer for user ${offer.userId} on event ${offer.eventId}`);
      
      // Try to give offer to the next person in queue
      const next = await prisma.waitlist.findFirst({
        where: { eventId: offer.eventId, category: offer.category, status: 'WAITING' },
        orderBy: { createdAt: 'asc' },
        include: { user: true, event: true },
      });

      if (next) {
        const offerExpiresAt = new Date(Date.now() + 2 * 60 * 1000);
        await prisma.waitlist.update({
          where: { id: next.id },
          data: { status: 'OFFERED', offerExpiresAt },
        });
        try {
          await sendWaitlistOffer(
            next.user.email,
            next.user.name,
            next.event.title,
            next.category,
            offerExpiresAt
          );
        } catch (e) {
          console.error('[Cleanup] Email error:', e.text || e.message);
        }
      }
    }
  } catch (err) {
    console.error('[Cleanup] Error expiring waitlist offers:', err.message);
  }
}

function startCleanupScheduler() {
  setInterval(async () => {
    await releaseExpiredHolds();
    await expireWaitlistOffers();
  }, 15000); // every 15 seconds
  console.log('[Cleanup] Scheduler started (15s interval)');
}

module.exports = { startCleanupScheduler, releaseExpiredHolds };
