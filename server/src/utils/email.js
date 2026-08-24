const emailjs = require('@emailjs/nodejs');

function isEmailConfigured() {
  return !!(
    process.env.EMAILJS_PUBLIC_KEY &&
    process.env.EMAILJS_PRIVATE_KEY &&
    process.env.EMAILJS_SERVICE_ID &&
    process.env.EMAILJS_TEMPLATE_ID
  );
}

function clientOrigin() {
  return (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
}

async function sendEmail(templateParams) {
  if (!isEmailConfigured()) {
    console.log(
      `[EMAIL SIMULATED] to=${templateParams.to_email} subject=${templateParams.email_subject}`
    );
    return { simulated: true };
  }

  await emailjs.send(
    process.env.EMAILJS_SERVICE_ID,
    process.env.EMAILJS_TEMPLATE_ID,
    templateParams,
    {
      publicKey: process.env.EMAILJS_PUBLIC_KEY,
      privateKey: process.env.EMAILJS_PRIVATE_KEY,
    }
  );
  return { simulated: false };
}

async function sendBookingConfirmation(to, customerName, booking) {
  const seats = (booking.bookingSeats || [])
    .map((bs) => `${bs.showSeat?.seat?.row ?? ''}${bs.showSeat?.seat?.number ?? ''}`)
    .filter(Boolean)
    .join(', ');

  const reference = booking.reference;
  const params = {
    to_email: to,
    customer_name: customerName || 'Guest',
    email_subject: `Booking Confirmed: ${reference}`,
    intro_text: 'Your booking is confirmed.',
    event_name: booking.event?.title || '',
    venue: booking.event?.venue?.name || '',
    date: booking.event?.date || '',
    time: booking.event?.time || '',
    seat_numbers: seats || '—',
    total_amount: String(booking.totalAmount ?? ''),
    booking_reference: reference,
    ticket_info: `Show booking reference ${reference} (or the QR code on the confirmation page) at the venue.`,
    booking_url: `${clientOrigin()}/bookings/${booking.id}/confirmation`,
    seat_category: '—',
    offer_expires_at: '—',
  };

  return sendEmail(params);
}

async function sendWaitlistOffer(to, customerName, eventTitle, category, offerExpiresAt) {
  const expiry = offerExpiresAt ? new Date(offerExpiresAt).toLocaleString() : '';
  const params = {
    to_email: to,
    customer_name: customerName || 'Guest',
    email_subject: `Seat available: ${eventTitle}`,
    intro_text: `A ${category} seat for ${eventTitle} is now available for you.`,
    event_name: eventTitle || '',
    venue: '—',
    date: 'Offer expires',
    time: expiry,
    seat_numbers: category || '—',
    total_amount: '—',
    booking_reference: 'WAITLIST OFFER',
    ticket_info:
      'Log in to TicketForge, open My Bookings, and accept this offer before it expires. Completing checkout will hold the seat for 2 minutes.',
    booking_url: `${clientOrigin()}/my-bookings`,
    seat_category: category || '',
    offer_expires_at: expiry,
  };

  return sendEmail(params);
}

module.exports = { sendBookingConfirmation, sendWaitlistOffer, isEmailConfigured };
