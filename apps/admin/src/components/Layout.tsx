import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Users, Tag, LayoutDashboard } from 'lucide-react';

export default function Layout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/login');
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          HairConnekt
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/dashboard" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
            <LayoutDashboard size={20} />
            <span style={{ marginLeft: '10px' }}>Dashboard</span>
          </NavLink>
          <NavLink to="/providers" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
            <Users size={20} />
            <span style={{ marginLeft: '10px' }}>Anbieter</span>
          </NavLink>
          <NavLink to="/categories" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
            <Tag size={20} />
            <span style={{ marginLeft: '10px' }}>Kategorien</span>
          </NavLink>
        </nav>
        <div style={{ padding: '1rem', borderTop: '1px solid var(--border)' }}>
          <button onClick={handleLogout} className="btn" style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--text-muted)' }}>
            <LogOut size={20} />
            <span style={{ marginLeft: '10px' }}>Abmelden</span>
          </button>
        </div>
      </aside>
      
      <main className="main-content">
        <header className="topbar">
          <div style={{ fontWeight: 600, fontSize: '1.25rem' }}>Admin Dashboard</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Logged in as: <strong>admin@hairconnekt.de</strong>
          </div>
        </header>
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
