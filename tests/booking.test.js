/**
 * Ticket Booking System - Core Logic Tests
 * Run with: node tests/booking.test.js (from project root)
 */

const assert = require('assert');
const http = require('http');

const BASE_URL = 'http://localhost:4000/api';

// Simple HTTP helper
function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ❌ ${name}: ${err.message}`);
    failed++;
  }
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log('\n🧪 Ticket Booking System Tests\n');

  // --- Auth ---
  console.log('Auth Tests:');
  let customerToken, organiserToken, customer2Token;

  await test('Login as customer', async () => {
    const res = await request('POST', '/auth/login', {
      email: 'customer@example.com',
      password: 'Customer123!',
    });
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert.ok(res.data.token, 'Token should be present');
    assert.strictEqual(res.data.user.role, 'CUSTOMER');
    customerToken = res.data.token;
  });

  await test('Login as organiser', async () => {
    const res = await request('POST', '/auth/login', {
      email: 'organiser@example.com',
      password: 'Organiser123!',
    });
    assert.strictEqual(res.status, 200);
    organiserToken = res.data.token;
  });

  await test('Register new customer', async () => {
    const email = `test_${Date.now()}@example.com`;
    const res = await request('POST', '/auth/register', {
      name: 'Test User 2',
      email,
      password: 'Password123!',
      role: 'CUSTOMER',
    });
    assert.strictEqual(res.status, 201, `Expected 201, got ${res.status}`);
    customer2Token = res.data.token;
  });

  await test('Reject invalid login', async () => {
    const res = await request('POST', '/auth/login', {
      email: 'wrong@example.com',
      password: 'wrongpassword',
    });
    assert.strictEqual(res.status, 401);
  });

  // --- Events ---
  console.log('\nEvents Tests:');

  await test('List events', async () => {
    const res = await request('GET', '/events');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.data), 'Should return array');
    assert.ok(res.data.length >= 3, 'Should have at least 3 events');
  });

  await test('Get event by ID', async () => {
    const res = await request('GET', '/events/1');
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.title, 'Should have title');
    assert.ok(res.data.showSeats, 'Should have showSeats');
  });

  // --- Seat Hold ---
  console.log('\nSeat Hold Tests:');

  let availableSeatId;

  await test('Fetch event seats', async () => {
    const res = await request('GET', '/events/1/seats', null, customerToken);
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.data));
    const available = res.data.find((s) => s.status === 'AVAILABLE');
    assert.ok(available, 'Should have at least one available seat');
    availableSeatId = available.id;
  });

  await test('Customer can hold an available seat', async () => {
    const res = await request('POST', '/seats/hold', { showSeatIds: [availableSeatId] }, customerToken);
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.data)}`);
    assert.ok(res.data.holdExpiresAt, 'Should return expiry time');
  });

  await test('Same seat cannot be held by another user simultaneously', async () => {
    const res = await request('POST', '/seats/hold', { showSeatIds: [availableSeatId] }, customer2Token);
    assert.strictEqual(res.status, 409, `Expected 409 (conflict), got ${res.status}`);
    assert.ok(res.data.error.includes('no longer available') || res.data.error.includes('not found'));
  });

  // --- Booking ---
  console.log('\nBooking Tests:');
  let bookingId, bookingReference;

  await test('Confirm booking changes seats to BOOKED', async () => {
    const res = await request('POST', '/bookings', {
      eventId: 1,
      showSeatIds: [availableSeatId],
    }, customerToken);
    assert.strictEqual(res.status, 201, `Expected 201, got ${res.status}: ${JSON.stringify(res.data)}`);
    assert.ok(res.data.reference.startsWith('TB-'), 'Reference should start with TB-');
    assert.ok(res.data.qrDataUrl, 'QR code should be generated');
    bookingId = res.data.id;
    bookingReference = res.data.reference;
  });

  await test('Seat is marked as BOOKED after booking', async () => {
    const res = await request('GET', '/events/1/seats', null, customerToken);
    const seat = res.data.find((s) => s.id === availableSeatId);
    assert.strictEqual(seat.status, 'BOOKED', `Expected BOOKED, got ${seat.status}`);
  });

  await test('Get booking with QR code', async () => {
    const res = await request('GET', `/bookings/${bookingId}`, null, customerToken);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.reference, bookingReference);
    assert.ok(res.data.qrDataUrl, 'QR code should be present');
  });

  // --- Cancellation ---
  console.log('\nCancellation Tests:');

  await test('Cancellation releases seat back to AVAILABLE', async () => {
    const res = await request('POST', `/bookings/${bookingId}/cancel`, null, customerToken);
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.message.includes('cancelled'), 'Should confirm cancellation');
  });

  await test('Seat is AVAILABLE after cancellation', async () => {
    const res = await request('GET', '/events/1/seats', null, customerToken);
    const seat = res.data.find((s) => s.id === availableSeatId);
    assert.strictEqual(seat.status, 'AVAILABLE', `Expected AVAILABLE after cancel, got ${seat.status}`);
  });

  // --- Waitlist ---
  console.log('\nWaitlist Tests:');

  await test('Customer can join waitlist', async () => {
    const res = await request('POST', '/waitlist', {
      eventId: 2,
      category: 'PREMIUM',
    }, customerToken);
    assert.strictEqual(res.status, 201, `Expected 201, got ${res.status}: ${JSON.stringify(res.data)}`);
    assert.ok(res.data.message.includes('waitlist'));
  });

  await test('Duplicate waitlist entry rejected', async () => {
    const res = await request('POST', '/waitlist', {
      eventId: 2,
      category: 'PREMIUM',
    }, customerToken);
    assert.strictEqual(res.status, 409, 'Should reject duplicate');
  });

  await test('Get waitlist entries', async () => {
    const res = await request('GET', '/waitlist', null, customerToken);
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.data));
    assert.ok(res.data.length >= 1, 'Should have at least one entry');
  });

  // --- Summary ---
  console.log(`\n${'─'.repeat(40)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed === 0) {
    console.log('🎉 All tests passed!\n');
  } else {
    console.log('⚠️  Some tests failed. Please fix the issues above.\n');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
