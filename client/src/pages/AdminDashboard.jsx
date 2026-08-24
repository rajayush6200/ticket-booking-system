import { useState, useEffect } from 'react';
import api from '../api/client';

export default function AdminDashboard() {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '', rows: 6, seatsPerRow: 8, premiumRows: 2, premiumPrice: 250, standardPrice: 150,
  });

  const fetchVenues = async () => {
    try {
      const res = await api.get('/venues');
      setVenues(res.data);
    } catch (err) {
      setError('Failed to load venues');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVenues(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const res = await api.post('/venues', form);
      setSuccess(`Venue "${form.name}" created with ${res.data.seatsCreated} seats!`);
      setForm({ name: '', rows: 6, seatsPerRow: 8, premiumRows: 2, premiumPrice: 250, standardPrice: 150 });
      fetchVenues();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create venue');
    }
  };

  if (loading) return <div className="spinner-overlay"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <h1>Admin Dashboard</h1>
          <p>Manage venues and seat configurations.</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>
          {/* Create Venue */}
          <div className="card">
            <div className="section-title">🏟️ Create New Venue</div>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Venue Name</label>
                <input
                  className="form-control"
                  placeholder="e.g. Multiplex Cinema Hall"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Rows</label>
                  <input type="number" min={1} max={26} className="form-control" value={form.rows} onChange={(e) => setForm({ ...form, rows: parseInt(e.target.value) })} />
                </div>
                <div className="form-group">
                  <label>Seats Per Row</label>
                  <input type="number" min={1} max={30} className="form-control" value={form.seatsPerRow} onChange={(e) => setForm({ ...form, seatsPerRow: parseInt(e.target.value) })} />
                </div>
              </div>
              <div className="form-group">
                <label>Premium Rows (from front)</label>
                <input type="number" min={0} max={form.rows} className="form-control" value={form.premiumRows} onChange={(e) => setForm({ ...form, premiumRows: parseInt(e.target.value) })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Premium Price (₹)</label>
                  <input type="number" className="form-control" value={form.premiumPrice} onChange={(e) => setForm({ ...form, premiumPrice: parseFloat(e.target.value) })} />
                </div>
                <div className="form-group">
                  <label>Standard Price (₹)</label>
                  <input type="number" className="form-control" value={form.standardPrice} onChange={(e) => setForm({ ...form, standardPrice: parseFloat(e.target.value) })} />
                </div>
              </div>
              <div className="alert alert-info" style={{ fontSize: '0.8rem', marginBottom: '1rem' }}>
                Total seats: <strong>{form.rows * form.seatsPerRow}</strong> ({form.premiumRows * form.seatsPerRow} premium, {(form.rows - form.premiumRows) * form.seatsPerRow} standard)
              </div>
              <button type="submit" className="btn btn-primary btn-full">Create Venue</button>
            </form>
          </div>

          {/* Venues List */}
          <div>
            <div className="section-title">🏟️ All Venues ({venues.length})</div>
            {venues.length === 0 ? (
              <div className="empty-state">
                <div className="icon">🏟️</div>
                <h3>No venues yet</h3>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {venues.map((venue) => (
                  <div key={venue.id} className="card card-sm fade-in">
                    <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{venue.name}</div>
                    <div style={{ color: 'var(--text2)', fontSize: '0.875rem' }}>
                      {venue.rows} rows × {venue.seatsPerRow} seats = {venue._count?.seats || venue.rows * venue.seatsPerRow} total seats
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
