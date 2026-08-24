import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/events" className="navbar-brand">
          🎟️ <span>Ticket</span>Forge
        </Link>
        <div className="navbar-links">
          <Link to="/events">Events</Link>
          {user && <Link to="/my-bookings">My Bookings</Link>}
          {user && (user.role === 'ORGANISER' || user.role === 'ADMIN') && (
            <Link to="/organiser">Dashboard</Link>
          )}
          {user && user.role === 'ADMIN' && <Link to="/admin">Admin</Link>}
          {user ? (
            <>
              <span style={{ color: 'var(--text3)', fontSize: '0.875rem' }}>
                👤 {user.name}
              </span>
              <button onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register" className="btn-primary">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
