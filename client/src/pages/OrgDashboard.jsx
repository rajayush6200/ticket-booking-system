import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../hooks/useAuth';

export default function OrgDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('events');
  const [events, setEvents] = useState([]);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '', type: 'MOVIE', venueId: '', date: '', time: '', description: '',
  });

  const fetchData = async () => {
    try {
      const [evRes, venRes] = await Promise.all([
        api.get('/events'),
        api.get('/venues'),
      ]);
      setEvents(evRes.data);
      setVenues(venRes.data);
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await api.post('/events', form);
      setSuccess('Event created successfully!');
      setForm({ title: '', type: 'MOVIE', venueId: '', date: '', time: '', description: '' });
      fetchData();
      setTab('events');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create event');
    }
  };

  const handleCancel = async (eventId) => {
    if (!window.confirm('Cancel this event?')) return;
    try {
      await api.delete(`/events/${eventId}`);
      setSuccess('Event cancelled');
      fetchData();
    } catch (err) {
      setError('Failed to cancel event');
    }
  };

  if (loading) return <div className="spinner-overlay"><div className="spinner" /></div>;

  // Stats
  const totalEvents = events.length;
  const totalBookings = events.reduce((sum, e) => {
    const booked = e.showSeats?.filter((s) => s.status === 'BOOKED').length || 0;
    return sum + booked;
  }, 0);
  const totalRevenue = events.reduce((sum, e) => {
    return sum; // We'll compute from bookings
  }, 0);
  const activeEvents = events.filter((e) => e.status === 'ACTIVE').length;

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <h1>Organiser Dashboard</h1>
          <p>Welcome back, {user?.name}. Manage your events here.</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {/* Stats */}
        <div className="stats-grid">
          <div className="card stat-card">
            <div className="stat-value">{totalEvents}</div>
            <div className="stat-label">Total Events</div>
          </div>
          <div className="card stat-card">
            <div className="stat-value">{activeEvents}</div>
            <div className="stat-label">Active Events</div>
          </div>
          <div className="card stat-card">
            <div className="stat-value">{totalBookings}</div>
            <div className="stat-label">Seats Booked</div>
          </div>
          <div className="card stat-card">
            <div className="stat-value">{venues.length}</div>
            <div className="stat-label">Venues</div>
          </div>
        </div>

        <div className="tabs">
          <button className={`tab ${tab === 'events' ? 'active' : ''}`} onClick={() => setTab('events')}>
            📋 My Events
          </button>
          <button className={`tab ${tab === 'create' ? 'active' : ''}`} onClick={() => setTab('create')}>
            ➕ Create Event
          </button>
        </div>

        {tab === 'create' && (
          <div className="card fade-in" style={{ maxWidth: '600px' }}>
            <div className="section-title">Create New Event</div>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Event Title</label>
                <input
                  className="form-control"
                  placeholder="e.g. Avengers: Endgame"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Type</label>
                  <select className="form-control" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    <option value="MOVIE">🎬 Movie</option>
                    <option value="CONCERT">🎵 Concert</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Venue</label>
                  <select className="form-control" value={form.venueId} onChange={(e) => setForm({ ...form, venueId: e.target.value })} required>
                    <option value="">Select venue</option>
                    {venues.map((v) => (
                      <option key={v.id} value={v.id}>{v.name} ({v.rows * v.seatsPerRow} seats)</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Date</label>
                  <input type="date" className="form-control" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Time</label>
                  <input type="time" className="form-control" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} required />
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea className="form-control" rows={3} placeholder="Describe the event..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <button type="submit" className="btn btn-primary btn-full">Create Event</button>
            </form>
          </div>
        )}

        {tab === 'events' && (
          <div>
            {events.length === 0 ? (
              <div className="empty-state">
                <div className="icon">📅</div>
                <h3>No events yet</h3>
                <p>Create your first event to get started.</p>
                <button className="btn btn-primary" onClick={() => setTab('create')}>Create Event</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {events.map((event) => {
                  const total = event.showSeats?.length || 0;
                  const booked = event.showSeats?.filter((s) => s.status === 'BOOKED').length || 0;
                  const held = event.showSeats?.filter((s) => s.status === 'HELD').length || 0;
                  const available = event.showSeats?.filter((s) => s.status === 'AVAILABLE').length || 0;
                  const premiumPrice = event.showSeats?.find((s) => s.seat?.category === 'PREMIUM')?.seat?.price || 0;
                  const standardPrice = event.showSeats?.find((s) => s.seat?.category === 'STANDARD')?.seat?.price || 0;
                  const revenue = booked * ((premiumPrice * event.showSeats?.filter((s) => s.seat?.category === 'PREMIUM' && s.status === 'BOOKED').length + standardPrice * event.showSeats?.filter((s) => s.seat?.category === 'STANDARD' && s.status === 'BOOKED').length) / (booked || 1));

                  return (
                    <div key={event.id} className="card fade-in">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <span className={`badge badge-${event.type.toLowerCase()}`}>{event.type}</span>
                            <span className={`badge ${event.status === 'ACTIVE' ? 'badge-available' : 'badge-cancelled'}`}>{event.status}</span>
                          </div>
                          <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.25rem' }}>{event.title}</div>
                          <div style={{ color: 'var(--text2)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
                            📅 {event.date} · 🕐 {event.time} · 📍 {event.venue?.name}
                          </div>
                          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.85rem' }}>
                            <div>
                              <span style={{ color: 'var(--success)' }}>●</span> {available} Available
                            </div>
                            <div>
                              <span style={{ color: 'var(--warning)' }}>●</span> {held} Held
                            </div>
                            <div>
                              <span style={{ color: 'var(--primary)' }}>●</span> {booked} Booked
                            </div>
                            <div>
                              <span style={{ color: 'var(--text3)' }}>Total: {total}</span>
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text3)', marginBottom: '0.25rem' }}>Revenue</div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)', marginBottom: '0.75rem' }}>
                            ₹{event.showSeats?.filter((s) => s.status === 'BOOKED').reduce((sum, s) => sum + (s.seat?.price || 0), 0).toLocaleString()}
                          </div>
                          {event.status === 'ACTIVE' && (
                            <button className="btn btn-danger btn-sm" onClick={() => handleCancel(event.id)}>
                              Cancel Event
                            </button>
                          )}
                        </div>
                      </div>
                      <div style={{ marginTop: '0.75rem' }}>
                        <div style={{ display: 'flex', height: '6px', borderRadius: '3px', overflow: 'hidden', background: 'var(--bg3)' }}>
                          <div style={{ width: `${(booked / total) * 100}%`, background: 'var(--primary)', transition: 'width 0.3s' }} />
                          <div style={{ width: `${(held / total) * 100}%`, background: 'var(--warning)', transition: 'width 0.3s' }} />
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: '0.25rem' }}>
                          {Math.round((booked / total) * 100)}% sold
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
