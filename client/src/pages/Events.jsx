import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ type: '', date: '' });
  const navigate = useNavigate();

  const fetchEvents = async () => {
    try {
      const params = {};
      if (filters.type) params.type = filters.type;
      if (filters.date) params.date = filters.date;
      const res = await api.get('/events', { params });
      setEvents(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEvents(); }, [filters]);

  const getEmoji = (type) => type === 'MOVIE' ? '🎬' : '🎵';

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <h1>Upcoming Events</h1>
          <p>Browse and book tickets for movies and concerts.</p>
        </div>

        <div className="filters">
          <div className="form-group">
            <label>Filter by Type</label>
            <select
              className="form-control"
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            >
              <option value="">All Types</option>
              <option value="MOVIE">🎬 Movies</option>
              <option value="CONCERT">🎵 Concerts</option>
            </select>
          </div>
          <div className="form-group">
            <label>Filter by Date</label>
            <input
              type="date"
              className="form-control"
              value={filters.date}
              onChange={(e) => setFilters({ ...filters, date: e.target.value })}
            />
          </div>
          {(filters.type || filters.date) && (
            <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setFilters({ type: '', date: '' })}
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="spinner-overlay"><div className="spinner" /></div>
        ) : events.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🎭</div>
            <h3>No events found</h3>
            <p>Try changing your filters or check back later.</p>
          </div>
        ) : (
          <div className="events-grid">
            {events.map((event) => (
              <div
                key={event.id}
                className="card event-card fade-in"
                onClick={() => navigate(`/events/${event.id}`)}
              >
                <div className={`event-card-banner ${event.type.toLowerCase()}`}>
                  <span style={{ fontSize: '3.5rem' }}>{getEmoji(event.type)}</span>
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
                    height: '50%',
                  }} />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                  <span className={`badge badge-${event.type.toLowerCase()}`}>
                    {getEmoji(event.type)} {event.type}
                  </span>
                  <span className={`badge ${event.available === 0 ? 'badge-booked' : 'badge-available'}`}>
                    {event.available === 0 ? 'Sold Out' : `${event.available} seats left`}
                  </span>
                </div>
                <div className="event-card-title">{event.title}</div>
                <div className="event-card-meta">
                  <span>📅 {new Date(event.date).toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                  <span>🕐 {event.time}</span>
                  <span>📍 {event.venue?.name}</span>
                </div>
                <div className="event-card-footer">
                  <div className="event-price">
                    {event.minPrice === event.maxPrice
                      ? `₹${event.minPrice}`
                      : `₹${event.minPrice} – ₹${event.maxPrice}`}
                  </div>
                  <button className="btn btn-primary btn-sm">Book Now →</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
