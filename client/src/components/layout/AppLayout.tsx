import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../../state/AuthContext';

const roleLabel: Record<string, string> = {
  admin: 'Administrator',
  agent: 'Agent',
  user: 'Requester',
};

export const AppLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <header className="app-header" role="banner">
        <div className="brand">
          <Link to="/" className="brand-mark" aria-label="Return to landing page">
            Terrene OS
          </Link>
          <p className="subtitle">Incident calm for ambitious teams</p>
        </div>
        <nav aria-label="Primary navigation">
          <Link
            className={location.pathname.startsWith('/tickets') && !location.pathname.includes('/new') ? 'active' : ''}
            to="/tickets"
          >
            Ticket queue
          </Link>
          <Link className={location.pathname.startsWith('/tickets/new') ? 'active' : ''} to="/tickets/new">
            New ticket
          </Link>
        </nav>
        <div className="user-chip" aria-label="Signed in user">
          <div className="user-meta">
            <span className="user-name">{user?.fullName}</span>
            {user?.role && (
              <span className="role" aria-label="Role">
                {roleLabel[user.role] ?? user.role}
              </span>
            )}
          </div>
          <button type="button" onClick={handleLogout} className="ghost">
            Log out
          </button>
        </div>
      </header>
      <main className="app-main" role="main">
        <Outlet />
      </main>
    </div>
  );
};
