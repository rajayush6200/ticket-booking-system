import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import api from '../api/client';

export default function BookingConfirmation() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(location.state || null);
  const [loading, setLoading] = useState(!location.state);

  useEffect(() => {
    if (!booking) {
      api.get(`/bookings/${id}`)
        .then((res) => setBooking(res.data))
        .catch(() => navigate('/my-bookings'))
        .finally(() => setLoading(false));
    }
  }, [id]);

  const handleDownload = () => {
    if (!booking?.qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `ticket-${booking.reference}.png`;
    link.href = booking.qrDataUrl;
    link.click();
  };

  if (loading) return <div className="spinner-overlay"><div className="spinner" /></div>;
  if (!booking) return null;

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: '700px' }}>
        <div className="card fade-in" style={{ textAlign: 'center', marginBottom: '1.5rem', background: 'linear-gradient(135deg, rgba(34,197,94,0.05), rgba(99,102,241,0.05))' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--success)' }}>
            Booking Confirmed!
          </h1>
          <p style={{ color: 'var(--text2)' }}>
            Your tickets have been booked successfully. Show the QR code at the venue.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          {/* Booking Details */}
          <div className="card">
            <div className="section-title">📋 Booking Details</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
              <div>
                <div style={{ color: 'var(--text3)', marginBottom: '0.2rem' }}>Reference</div>
                <div className="booking-reference" style={{ fontSize: '1rem' }}>{booking.reference}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text3)', marginBottom: '0.2rem' }}>Event</div>
                <div style={{ fontWeight: 600 }}>{booking.event?.title}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text3)', marginBottom: '0.2rem' }}>Date & Time</div>
                <div>{booking.event?.date} at {booking.event?.time}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text3)', marginBottom: '0.2rem' }}>Venue</div>
                <div>{booking.event?.venue?.name}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text3)', marginBottom: '0.2rem' }}>Total Paid</div>
                <div style={{ color: 'var(--success)', fontWeight: 700, fontSize: '1.1rem' }}>₹{booking.totalAmount}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text3)', marginBottom: '0.2rem' }}>Seats</div>
                <div>
                  {booking.bookingSeats?.map((bs) => (
                    <span key={bs.id} className="badge badge-booked" style={{ marginRight: '0.25rem', marginBottom: '0.25rem' }}>
                      {bs.showSeat?.seat?.row}{bs.showSeat?.seat?.number}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* QR Code */}
          <div className="card qr-container">
            <div className="section-title" style={{ justifyContent: 'center' }}>🔲 Entry QR Code</div>
            {booking.qrDataUrl ? (
              <>
                <img src={booking.qrDataUrl} alt="Booking QR Code" style={{ maxWidth: '180px', border: '3px solid white', borderRadius: '8px', marginBottom: '1rem' }} />
                <div style={{ fontSize: '0.7rem', color: 'var(--text3)', fontFamily: 'monospace', marginBottom: '1rem', wordBreak: 'break-all' }}>
                  BOOKING:{booking.reference}
                </div>
                <button className="btn btn-secondary btn-sm" onClick={handleDownload}>
                  ⬇ Download QR
                </button>
              </>
            ) : (
              <div style={{ color: 'var(--text2)', fontSize: '0.875rem' }}>QR code not available</div>
            )}
          </div>
        </div>

        {booking.emailWarning ? (
          <div className="alert alert-warning">
            ⚠️ {booking.emailWarning} Your tickets are still valid — keep this page or My Bookings for your QR code.
          </div>
        ) : booking.emailSimulated ? (
          <div className="alert alert-success">
            ✅ Booking confirmed. Email is in demo mode (check the server console). Add EmailJS keys to send real mail.
          </div>
        ) : (
          <div className="alert alert-success">
            ✅ A confirmation email has been sent to your account email.
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/my-bookings')}>
            📋 View My Bookings
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/events')}>
            🎟️ Book More Tickets
          </button>
        </div>
      </div>
    </div>
  );
}
