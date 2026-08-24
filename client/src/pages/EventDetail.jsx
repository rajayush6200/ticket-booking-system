import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../hooks/useAuth';

function groupSeatsByRow(showSeats) {
  const rows = {};
  for (const ss of showSeats) {
    const row = ss.seat.row;
    if (!rows[row]) rows[row] = [];
    rows[row].push(ss);
  }
  // Sort each row by seat number
  for (const row of Object.keys(rows)) {
    rows[row].sort((a, b) => a.seat.number - b.seat.number);
  }
  return rows;
}

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [showSeats, setShowSeats] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [holding, setHolding] = useState(false);
  const [error, setError] = useState('');
  const [holdExpiry, setHoldExpiry] = useState(null);
  const [waitlistCategory, setWaitlistCategory] = useState('');
  const [waitlistMsg, setWaitlistMsg] = useState('');
  const intervalRef = useRef(null);

  const fetchSeats = async () => {
    try {
      const res = await api.get(`/events/${id}/seats`);
      setShowSeats(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await api.get(`/events/${id}`);
        setEvent(res.data);
        setShowSeats(res.data.showSeats);
      } catch {
        navigate('/events');
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();

    // Refresh seats every 8 seconds
    intervalRef.current = setInterval(fetchSeats, 8000);
    return () => clearInterval(intervalRef.current);
  }, [id]);

  const getSeatStatus = (ss) => {
    if (selectedIds.includes(ss.id)) return 'selected';
    return ss.status.toLowerCase();
  };

  const toggleSeat = (ss) => {
    if (!user) {
      navigate('/login');
      return;
    }
    const status = getSeatStatus(ss);
    if (status === 'held' || status === 'booked') return;
    if (status === 'selected') {
      setSelectedIds(selectedIds.filter((id) => id !== ss.id));
    } else {
      setSelectedIds([...selectedIds, ss.id]);
    }
  };

  const handleHold = async () => {
    if (!user) { navigate('/login'); return; }
    if (selectedIds.length === 0) {
      setError('Please select at least one seat.');
      return;
    }
    setError('');
    setHolding(true);
    try {
      const res = await api.post('/seats/hold', { showSeatIds: selectedIds });
      setHoldExpiry(res.data.holdExpiresAt);
      // Navigate to checkout with state
      navigate('/checkout', {
        state: {
          eventId: event.id,
          event,
          showSeatIds: selectedIds,
          holdExpiresAt: res.data.holdExpiresAt,
          seats: showSeats.filter((ss) => selectedIds.includes(ss.id)),
        },
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to hold seats');
      setSelectedIds([]);
      fetchSeats(); // Refresh
    } finally {
      setHolding(false);
    }
  };

  const handleJoinWaitlist = async (category) => {
    if (!user) { navigate('/login'); return; }
    try {
      await api.post('/waitlist', { eventId: id, category });
      setWaitlistMsg(`You've joined the ${category} waitlist!`);
    } catch (err) {
      setWaitlistMsg(err.response?.data?.error || 'Failed to join waitlist');
    }
  };

  if (loading) return <div className="spinner-overlay"><div className="spinner" /></div>;
  if (!event) return null;

  const seatsByRow = groupSeatsByRow(showSeats);
  const selectedSeats = showSeats.filter((ss) => selectedIds.includes(ss.id));
  const totalPrice = selectedSeats.reduce((sum, ss) => sum + ss.seat.price, 0);

  // Check which categories are all unavailable
  const premiumSeats = showSeats.filter((ss) => ss.seat.category === 'PREMIUM');
  const standardSeats = showSeats.filter((ss) => ss.seat.category === 'STANDARD');
  const premiumSoldOut = premiumSeats.length > 0 && premiumSeats.every((ss) => ss.status !== 'AVAILABLE');
  const standardSoldOut = standardSeats.length > 0 && standardSeats.every((ss) => ss.status !== 'AVAILABLE');

  return (
    <div className="page">
      <div className="container">
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/events')} style={{ marginBottom: '1rem' }}>
          ← Back to Events
        </button>

        {/* Event Header */}
        <div className="card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, var(--card) 0%, var(--card2) 100%)' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '3rem' }}>{event.type === 'MOVIE' ? '🎬' : '🎵'}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                <span className={`badge badge-${event.type.toLowerCase()}`}>{event.type}</span>
                <span className="badge badge-available">{event.status}</span>
              </div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>{event.title}</h1>
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', color: 'var(--text2)', fontSize: '0.875rem' }}>
                <span>📅 {new Date(event.date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                <span>🕐 {event.time}</span>
                <span>📍 {event.venue?.name}</span>
              </div>
              <p style={{ marginTop: '0.75rem', color: 'var(--text2)', fontSize: '0.875rem' }}>{event.description}</p>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem', alignItems: 'start' }}>
          {/* Seat Map */}
          <div className="card">
            <div className="section-title">🪑 Select Your Seats</div>

            {/* Legend */}
            <div className="seat-legend" style={{ marginBottom: '1.5rem' }}>
              <div className="seat-legend-item">
                <div className="seat-legend-dot" style={{ background: '#1e3a5f' }} />
                <span>Standard Available</span>
              </div>
              <div className="seat-legend-item">
                <div className="seat-legend-dot" style={{ background: '#3d2a00' }} />
                <span>Premium Available</span>
              </div>
              <div className="seat-legend-item">
                <div className="seat-legend-dot" style={{ background: 'var(--primary)' }} />
                <span>Selected</span>
              </div>
              <div className="seat-legend-item">
                <div className="seat-legend-dot" style={{ background: '#4a3800' }} />
                <span>Held</span>
              </div>
              <div className="seat-legend-item">
                <div className="seat-legend-dot" style={{ background: '#1a1a2e' }} />
                <span>Booked</span>
              </div>
            </div>

            {/* Screen */}
            <div style={{
              textAlign: 'center', padding: '0.5rem 2rem', background: 'linear-gradient(to bottom, var(--primary-light), transparent)',
              borderRadius: '4px', marginBottom: '1.5rem', color: 'var(--text3)', fontSize: '0.75rem', letterSpacing: '0.1em',
            }}>
              ■■■■■■■■■■ SCREEN ■■■■■■■■■■
            </div>

            <div className="seat-map-container">
              <div className="seat-map">
                {Object.entries(seatsByRow).map(([row, seats]) => (
                  <div key={row} className="seat-row">
                    <div className="seat-row-label">{row}</div>
                    {seats.map((ss) => {
                      const status = getSeatStatus(ss);
                      return (
                        <button
                          key={ss.id}
                          className={`seat ${status} ${ss.seat.category.toLowerCase()}`}
                          onClick={() => toggleSeat(ss)}
                          title={`${row}${ss.seat.number} — ${ss.seat.category} — ₹${ss.seat.price} — ${status.toUpperCase()}`}
                        >
                          {ss.seat.number}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div>
            {/* Pricing */}
            <div className="card" style={{ marginBottom: '1rem' }}>
              <div className="section-title">💰 Pricing</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                  <span>⭐ Premium</span>
                  <span style={{ color: 'var(--warning)', fontWeight: 700 }}>₹250</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                  <span>🪑 Standard</span>
                  <span style={{ color: 'var(--primary)', fontWeight: 700 }}>₹150</span>
                </div>
              </div>
            </div>

            {/* Selection Summary */}
            {selectedIds.length > 0 && (
              <div className="card fade-in" style={{ marginBottom: '1rem' }}>
                <div className="section-title">🛒 Selection</div>
                {selectedSeats.map((ss) => (
                  <div key={ss.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', padding: '0.25rem 0', color: 'var(--text2)' }}>
                    <span>Seat {ss.seat.row}{ss.seat.number} ({ss.seat.category})</span>
                    <span>₹{ss.seat.price}</span>
                  </div>
                ))}
                <hr className="divider" />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                  <span>Total</span>
                  <span style={{ color: 'var(--primary)' }}>₹{totalPrice}</span>
                </div>
              </div>
            )}

            {error && <div className="alert alert-error">{error}</div>}

            <button
              className="btn btn-primary btn-full btn-lg"
              onClick={handleHold}
              disabled={holding || selectedIds.length === 0}
            >
              {holding ? 'Holding seats...' : `Hold ${selectedIds.length} Seat${selectedIds.length !== 1 ? 's' : ''} →`}
            </button>

            {selectedIds.length === 0 && (
              <p style={{ fontSize: '0.8rem', color: 'var(--text3)', textAlign: 'center', marginTop: '0.5rem' }}>
                Click seats above to select them
              </p>
            )}

            {/* Waitlist */}
            {(premiumSoldOut || standardSoldOut) && (
              <div style={{ marginTop: '1.5rem' }}>
                <div className="section-title">⏳ Waitlist</div>
                {waitlistMsg && (
                  <div className={`alert ${waitlistMsg.includes('joined') ? 'alert-success' : 'alert-error'}`}>
                    {waitlistMsg}
                  </div>
                )}
                {premiumSoldOut && (
                  <div style={{ marginBottom: '0.5rem' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text2)', marginBottom: '0.5rem' }}>
                      ⭐ Premium seats are sold out.
                    </p>
                    <button className="btn btn-secondary btn-sm btn-full" onClick={() => handleJoinWaitlist('PREMIUM')}>
                      Join Premium Waitlist
                    </button>
                  </div>
                )}
                {standardSoldOut && (
                  <div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text2)', marginBottom: '0.5rem' }}>
                      🪑 Standard seats are sold out.
                    </p>
                    <button className="btn btn-secondary btn-sm btn-full" onClick={() => handleJoinWaitlist('STANDARD')}>
                      Join Standard Waitlist
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
