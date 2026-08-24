const nodemailer = require('nodemailer');

let transporter = null;
const emailEnabled = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

if (emailEnabled) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

async function sendBookingConfirmation(to, booking, qrDataUrl) {
  const subject = `Booking Confirmed: ${booking.reference}`;
  const html = `
    <h2>Booking Confirmed!</h2>
    <p><strong>Reference:</strong> ${booking.reference}</p>
    <p><strong>Event:</strong> ${booking.event?.title}</p>
    <p><strong>Date:</strong> ${booking.event?.date} at ${booking.event?.time}</p>
    <p><strong>Total:</strong> ₹${booking.totalAmount}</p>
    <p>Please show your QR code at the venue entrance.</p>
    <img src="${qrDataUrl}" alt="QR Code" />
  `;

  if (!emailEnabled) {
    console.log(`[EMAIL SIMULATED] Ticket sent to ${to} | Subject: ${subject}`);
    return;
  }

  await transporter.sendMail({ from: process.env.SMTP_USER, to, subject, html });
}

async function sendWaitlistOffer(to, eventTitle, category, offerExpiresAt) {
  const subject = `Seat Available: ${eventTitle}`;
  const html = `
    <h2>A seat is now available!</h2>
    <p>A <strong>${category}</strong> seat for <strong>${eventTitle}</strong> is now available for you.</p>
    <p>This offer expires at: <strong>${new Date(offerExpiresAt).toLocaleString()}</strong></p>
    <p>Log in to accept your seat before it expires.</p>
  `;

  if (!emailEnabled) {
    console.log(`[EMAIL SIMULATED] Waitlist offer sent to ${to} | Event: ${eventTitle}`);
    return;
  }

  await transporter.sendMail({ from: process.env.SMTP_USER, to, subject, html });
}

module.exports = { sendBookingConfirmation, sendWaitlistOffer };
