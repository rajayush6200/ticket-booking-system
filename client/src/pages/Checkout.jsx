import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api/client';
import CountdownTimer from '../components/CountdownTimer';

export default function Checkout() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expired, setExpired] = useState(false);

  if (!state || !state.showSeatIds) {
    return (
      <div className="page">
        <div className="container">
          <div className="empty-state">
            <div className="icon">🛒</div>
            <h3>No seats selected</h3>
            <p>Please select seats from an event first.</p>
            <button className="btn btn-primary" onClick={() => navigate('/events')}>Browse Events</button>
          </div>
        </div>
      </div>
    );
  }

  const { event, showSeatIds, holdExpiresAt, seats } = state;
  const totalAmount = seats.reduce((sum, ss) => sum + ss.seat.price, 0);

  const handleConfirm = async () => {
    if (expired) {
      setError('Your hold has expired. Please select seats again.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/bookings', {
        eventId: event.id,
        showSeatIds,
      });
      navigate(`/bookings/${res.data.id}/confirmation`, { state: res.data });
    } catch (err) {
      setError(err.response?.data?.error || 'Booking failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleExpire = () => {
    setExpired(true);
    setError('Your seat hold has expired. Please go back and select seats again.');
  };

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <h1>Checkout</h1>
          <p>Review your selection and confirm your booking.</p>
        </div>

        <div className="checkout-layout">
          {/* Left: Order Summary */}
          <div>
            <div className="card" style={{ marginBottom: '1rem' }}>
              <div className="section-title">🎟️ Event Details</div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ fontSize: '2.5rem' }}>{event.type === 'MOVIE' ? '🎬' : '🎵'}</div>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{event.title}</div>
                  <div style={{ color: 'var(--text2)', fontSize: '0.875rem' }}>
                    📅 {event.date} at {event.time}
                  </div>
                  <div style={{ color: 'var(--text2)', fontSize: '0.875rem' }}>
                    📍 {event.venue?.name}
                  </div>
                </div>
              </div>
            </div>

            <div className="card" style={{ marginBottom: '1rem' }}>
              <div className="section-title">🪑 Selected Seats</div>
              <ul className="seat-summary-list">
                {seats.map((ss) => (
                  <li key={ss.id}>
                    <div>
                      <strong>Seat {ss.seat.row}{ss.seat.number}</strong>
                      <span style={{ marginLeft: '0.5rem' }}>
                        <span className={`badge badge-${ss.seat.category.toLowerCase()}`}>
                          {ss.seat.category}
                        </span>
                      </span>
                    </div>
                    <span style={{ color: 'var(--primary)', fontWeight: 600 }}>₹{ss.seat.price}</span>
                  </li>
                ))}
                <li className="total-row">
                  <span>Total Amount</span>
                  <span style={{ color: 'var(--primary)', fontSize: '1.25rem' }}>₹{totalAmount}</span>
                </li>
              </ul>
            </div>

            <div className="alert alert-info">
              💡 <strong>Payment Simulated:</strong> No real payment is required for this demo. Click "Confirm Booking" to complete.
            </div>
          </div>

          {/* Right: Confirmation Panel */}
          <div>
            <div className="card" style={{ position: 'sticky', top: '80px' }}>
              <div className="section-title">⏱ Seat Hold</div>

              <CountdownTimer expiresAt={holdExpiresAt} onExpire={handleExpire} />

              <p style={{ fontSize: '0.8rem', color: 'var(--text2)', marginTop: '0.75rem', marginBottom: '1.5rem' }}>
                Your seats are reserved for 2 minutes. Complete booking before the timer expires.
              </p>

              {error && <div className="alert alert-error">{error}</div>}

              {expired ? (
                <button
                  className="btn btn-secondary btn-full btn-lg"
                  onClick={() => navigate(`/events/${event.id}`)}
                >
                  ← Select Seats Again
                </button>
              ) : (
                <button
                  className="btn btn-success btn-full btn-lg"
                  onClick={handleConfirm}
                  disabled={loading}
                >
                  {loading ? 'Processing...' : '✓ Confirm Booking'}
                </button>
              )}

              <button
                className="btn btn-secondary btn-full"
                style={{ marginTop: '0.5rem' }}
                onClick={() => navigate(`/events/${event.id}`)}
              >
                Cancel
              </button>

              <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--bg3)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: 'var(--text2)' }}>
                <strong style={{ color: 'var(--text)' }}>Order Summary</strong>
                <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{seats.length} seat{seats.length !== 1 ? 's' : ''}</span>
                  <span>₹{totalAmount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
