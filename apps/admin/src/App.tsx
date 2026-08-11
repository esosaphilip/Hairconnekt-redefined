import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Providers from './pages/Providers';
import Users from './pages/Users';
import Categories from './pages/Categories';
import PopularStyles from './pages/PopularStyles';
import Team from './pages/Team';
import AcceptInvite from './pages/AcceptInvite';
import { ToastProvider } from './components/ui';
import { ErrorBoundary } from './components/ErrorBoundary';
import { getAdminSession, setOnAuthExpired, type AdminUserSummary } from './api';
import './index.css';

const LOGIN_PATH = '/login';

const ProtectedRoute = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'ready' | 'unauthorized'>(
    'loading',
  );
  const [user, setUser] = useState<AdminUserSummary | null>(null);

  useEffect(() => {
    let mounted = true;

    setOnAuthExpired(() => {
      if (!mounted) {
        window.location.replace(LOGIN_PATH);
        return;
      }
      setUser(null);
      setStatus('unauthorized');
    });

    getAdminSession()
      .then((data) => {
        if (!mounted) return;
        setUser(data.user);
        setStatus('ready');
      })
      .catch(() => {
        if (!mounted) return;
        setStatus('unauthorized');
      });

    return () => {
      mounted = false;
      setOnAuthExpired(null);
    };
  }, []);

  useEffect(() => {
    if (status === 'unauthorized') {
      navigate(LOGIN_PATH, { replace: true });
    }
  }, [status, navigate]);

  if (status === 'loading') {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
        }}
      >
        Session wird geprueft...
      </div>
    );
  }

  if (!user) {
    return <Navigate to={LOGIN_PATH} replace />;
  }

  return (
    <ToastProvider>
      <Layout user={user} />
    </ToastProvider>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/accept-invite" element={<AcceptInvite />} />

          <Route path="/" element={<ProtectedRoute />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="providers" element={<Providers />} />
            <Route path="users" element={<Users />} />
            <Route path="popular-styles" element={<PopularStyles />} />
            <Route path="team" element={<Team />} />
            <Route path="categories" element={<Categories />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
