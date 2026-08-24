const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const adminPass = await bcrypt.hash('Admin123!', 10);
  const orgPass = await bcrypt.hash('Organiser123!', 10);
  const custPass = await bcrypt.hash('Customer123!', 10);

  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: { name: 'Admin', email: 'admin@example.com', password: adminPass, role: 'ADMIN' },
  });

  await prisma.user.upsert({
    where: { email: 'organiser@example.com' },
    update: {},
    create: { name: 'Organiser', email: 'organiser@example.com', password: orgPass, role: 'ORGANISER' },
  });

  await prisma.user.upsert({
    where: { email: 'customer@example.com' },
    update: {},
    create: { name: 'Customer', email: 'customer@example.com', password: custPass, role: 'CUSTOMER' },
  });

  const venue1 = await prisma.venue.upsert({
    where: { id: 1 },
    update: {},
    create: { name: 'Grand Cinema Hall', rows: 6, seatsPerRow: 8 },
  });

  const venue2 = await prisma.venue.upsert({
    where: { id: 2 },
    update: {},
    create: { name: 'City Concert Arena', rows: 5, seatsPerRow: 10 },
  });

  async function createSeatsForVenue(venue) {
    const existing = await prisma.seat.count({ where: { venueId: venue.id } });
    if (existing > 0) return;
    const rows = 'ABCDEF'.slice(0, venue.rows).split('');
    const seats = [];
    for (let r = 0; r < rows.length; r++) {
      for (let n = 1; n <= venue.seatsPerRow; n++) {
        const category = r < 2 ? 'PREMIUM' : 'STANDARD';
        const price = category === 'PREMIUM' ? 250 : 150;
        seats.push({ venueId: venue.id, row: rows[r], number: n, category, price });
      }
    }
    await prisma.seat.createMany({ data: seats });
  }

  await createSeatsForVenue(venue1);
  await createSeatsForVenue(venue2);

  const events = [
    {
      title: "Inception: Director's Cut",
      type: 'MOVIE',
      venueId: venue1.id,
      date: '2026-09-10',
      time: '19:30',
      description: 'A mind-bending thriller by Christopher Nolan. Experience the dream within a dream.',
    },
    {
      title: 'Taylor Swift: Eras Tour',
      type: 'CONCERT',
      venueId: venue2.id,
      date: '2026-09-15',
      time: '20:00',
      description: 'The biggest concert tour of the decade. Join millions of fans for an unforgettable night.',
    },
    {
      title: 'Interstellar IMAX',
      type: 'MOVIE',
      venueId: venue1.id,
      date: '2026-09-20',
      time: '18:00',
      description: "Christopher Nolan's epic space adventure, now in stunning IMAX format.",
    },
  ];

  for (const ev of events) {
    const existing = await prisma.event.findFirst({ where: { title: ev.title } });
    if (!existing) {
      const event = await prisma.event.create({ data: { ...ev, status: 'ACTIVE' } });
      const seats = await prisma.seat.findMany({ where: { venueId: ev.venueId } });
      await prisma.showSeat.createMany({
        data: seats.map((s) => ({ eventId: event.id, seatId: s.id })),
      });
      console.log(`Created event: ${event.title} with ${seats.length} seats`);
    }
  }

  console.log('\n✅ Seeding complete!');
  console.log('\nDemo Credentials:');
  console.log('  Admin:     admin@example.com / Admin123!');
  console.log('  Organiser: organiser@example.com / Organiser123!');
  console.log('  Customer:  customer@example.com / Customer123!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
