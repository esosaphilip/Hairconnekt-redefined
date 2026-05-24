import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Providers from './pages/Providers';
import Users from './pages/Users';
import Categories from './pages/Categories';
import PopularStyles from './pages/PopularStyles';
import { getAdminSession, type AdminUserSummary } from './api';
import './index.css';

// Protected Route Wrapper
const ProtectedRoute = () => {
  const [status, setStatus] = useState<'loading' | 'ready' | 'unauthorized'>(
    'loading',
  );
  const [user, setUser] = useState<AdminUserSummary | null>(null);

  useEffect(() => {
    let mounted = true;
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
    };
  }, []);

  if (status === 'loading') {
    return (
      <div
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

  if (status === 'unauthorized' || !user) {
    return <Navigate to="/login" replace />;
  }

  return <Layout user={user} />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={<ProtectedRoute />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="providers" element={<Providers />} />
          <Route path="users" element={<Users />} />
          <Route path="popular-styles" element={<PopularStyles />} />
          <Route path="categories" element={<Categories />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
