import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import CountdownTimer from '../components/CountdownTimer';

export default function MyBookings() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('bookings');
  const [bookings, setBookings] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchData = async () => {
    try {
      const [bRes, wRes] = await Promise.all([
        api.get('/bookings'),
        api.get('/waitlist'),
      ]);
      setBookings(bRes.data);
      setWaitlist(wRes.data);
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCancel = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    setCancelling(bookingId);
    setError('');
    setSuccess('');
    try {
      const res = await api.post(`/bookings/${bookingId}/cancel`);
      setSuccess(res.data.message);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Cancellation failed');
    } finally {
      setCancelling(null);
    }
  };

  const handleAcceptOffer = async (waitlistId) => {
    try {
      const res = await api.post(`/waitlist/${waitlistId}/accept`);
      setSuccess(`${res.data.message} — Your seat is held for 2 minutes!`);
      // Navigate to checkout with the offered seat
      const ss = res.data.showSeat;
      // Fetch event to get full details
      const eventRes = await api.get(`/events/${ss.eventId}`);
      navigate('/checkout', {
        state: {
          eventId: ss.eventId,
          event: eventRes.data,
          showSeatIds: [ss.id],
          holdExpiresAt: res.data.holdExpiresAt,
          seats: [{ ...ss, seat: ss.seat }],
        },
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to accept offer');
      fetchData();
    }
  };

  if (loading) return <div className="spinner-overlay"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <h1>My Bookings</h1>
          <p>Manage your bookings and waitlist entries.</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="tabs">
          <button className={`tab ${tab === 'bookings' ? 'active' : ''}`} onClick={() => setTab('bookings')}>
            🎟️ Bookings ({bookings.length})
          </button>
          <button className={`tab ${tab === 'waitlist' ? 'active' : ''}`} onClick={() => setTab('waitlist')}>
            ⏳ Waitlist ({waitlist.length})
          </button>
        </div>

        {tab === 'bookings' && (
          <>
            {bookings.length === 0 ? (
              <div className="empty-state">
                <div className="icon">🎟️</div>
                <h3>No bookings yet</h3>
                <p>Browse events and book your first ticket!</p>
                <button className="btn btn-primary" onClick={() => navigate('/events')}>Browse Events</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {bookings.map((booking) => (
                  <div key={booking.id} className="card fade-in">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                          <span className={`badge badge-${booking.status.toLowerCase()}`}>{booking.status}</span>
                          <span className="badge badge-movie">{booking.event?.type}</span>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.25rem' }}>{booking.event?.title}</div>
                        <div style={{ color: 'var(--text2)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                          📅 {booking.event?.date} at {booking.event?.time} · 📍 {booking.event?.venue?.name}
                        </div>
                        <div style={{ fontFamily: 'monospace', color: 'var(--primary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                          {booking.reference}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {booking.bookingSeats?.map((bs) => (
                            <span key={bs.id} className="badge badge-booked" style={{ fontSize: '0.7rem' }}>
                              {bs.showSeat?.seat?.row}{bs.showSeat?.seat?.number}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.5rem' }}>
                          ₹{booking.totalAmount}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => navigate(`/bookings/${booking.id}/confirmation`)}
                          >
                            View QR
                          </button>
                          {booking.status === 'CONFIRMED' && (
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleCancel(booking.id)}
                              disabled={cancelling === booking.id}
                            >
                              {cancelling === booking.id ? 'Cancelling...' : 'Cancel'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'waitlist' && (
          <>
            {waitlist.length === 0 ? (
              <div className="empty-state">
                <div className="icon">⏳</div>
                <h3>Not on any waitlist</h3>
                <p>When sold-out events have seats cancelled, you'll be notified.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {waitlist.map((entry) => (
                  <div key={entry.id} className="card fade-in">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <span className={`badge badge-${entry.status.toLowerCase()}`}>{entry.status}</span>
                          <span className={`badge badge-${entry.category.toLowerCase()}`}>{entry.category}</span>
                        </div>
                        <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{entry.event?.title}</div>
                        <div style={{ color: 'var(--text2)', fontSize: '0.875rem' }}>
                          📅 {entry.event?.date} at {entry.event?.time}
                        </div>
                        {entry.status === 'OFFERED' && (
                          <div style={{ marginTop: '0.75rem' }}>
                            <CountdownTimer expiresAt={entry.offerExpiresAt} onExpire={() => fetchData()} />
                          </div>
                        )}
                      </div>
                      {entry.status === 'OFFERED' && (
                        <div>
                          <div className="waitlist-banner" style={{ marginBottom: '0' }}>
                            <div>
                              <p>🎉 A seat is available for you!</p>
                              <small>Accept now before your offer expires</small>
                            </div>
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => handleAcceptOffer(entry.id)}
                            >
                              Accept Seat
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
