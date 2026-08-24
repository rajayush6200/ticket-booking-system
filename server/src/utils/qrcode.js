const QRCode = require('qrcode');

async function generateQRDataUrl(bookingReference) {
  const content = `BOOKING:${bookingReference}`;
  return QRCode.toDataURL(content, { width: 300, margin: 2 });
}

module.exports = { generateQRDataUrl };
