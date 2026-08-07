import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Users, User, Tag, LayoutDashboard, Sparkles } from 'lucide-react';
import { adminLogout, type AdminUserSummary } from '../api';

type LayoutProps = {
  user: AdminUserSummary;
};

export default function Layout({ user }: LayoutProps) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await adminLogout();
    } catch (err) {
      console.error('Logout failed:', err);
    }
    navigate('/login');
  };

  return (
    <div className="layout">
      <aside className="sidebar" aria-label="Seitenleiste">
        <div className="sidebar-header" role="banner">
          HairConnekt
        </div>
        <nav className="sidebar-nav" aria-label="Hauptnavigation">
          <NavLink to="/dashboard" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
            <LayoutDashboard size={20} aria-hidden="true" />
            <span style={{ marginLeft: '10px' }}>Dashboard</span>
          </NavLink>
          <NavLink to="/providers" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
            <Users size={20} aria-hidden="true" />
            <span style={{ marginLeft: '10px' }}>Anbieter</span>
          </NavLink>
          <NavLink to="/users" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
            <User size={20} aria-hidden="true" />
            <span style={{ marginLeft: '10px' }}>Benutzer</span>
          </NavLink>
          <NavLink to="/popular-styles" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
            <Sparkles size={20} aria-hidden="true" />
            <span style={{ marginLeft: '10px' }}>Beliebte Styles</span>
          </NavLink>
          <NavLink to="/categories" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
            <Tag size={20} aria-hidden="true" />
            <span style={{ marginLeft: '10px' }}>Kategorien</span>
          </NavLink>
        </nav>
        <div style={{ padding: '1rem', borderTop: '1px solid var(--border)' }}>
          <button
            onClick={handleLogout}
            className="btn"
            style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--text-muted)' }}
            aria-label="Von HairConnekt abmelden"
          >
            <LogOut size={20} aria-hidden="true" />
            <span style={{ marginLeft: '10px' }}>Abmelden</span>
          </button>
        </div>
      </aside>
      
      <main className="main-content" id="hc-main" role="main">
        <header className="topbar" role="banner" aria-label="Kopfbereich">
          <div style={{ fontWeight: 600, fontSize: '1.25rem' }}>Admin Dashboard</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Angemeldet als: <strong>{user.email}</strong>
          </div>
        </header>
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
