import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/admin-login', { identifier: email, password });
      if (res.data && res.data.accessToken) {
        localStorage.setItem('admin_token', res.data.accessToken);
        navigate('/dashboard');
      }
    } catch (err: any) {
      if (err.message === 'Network Error') {
        setError('Connection failed. Backend might be unreachable or blocking CORS.');
      } else if (err.response && err.response.status === 401) {
        setError('Falsches Passwort oder falsche Email!');
      } else {
        setError(`Error: ${err.message || 'Ungültige Anmeldedaten'}`);
      }
    }
  };

  return (
    <div className="login-page">
      <div className="card login-card">
        <h1 style={{ marginBottom: '0.5rem', color: 'var(--primary)' }}>HairConnekt</h1>
        <p style={{ marginBottom: '2rem', color: 'var(--text-muted)' }}>Admin Panel Login</p>
        
        {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', padding: '0.75rem', background: '#fee2e2', borderRadius: '8px' }}>{error}</div>}
        
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <input 
              type="email" 
              className="input-field" 
              placeholder="Email-Adresse" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>
          <div>
            <input 
              type="password" 
              className="input-field" 
              placeholder="Passwort" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>
            Anmelden
          </button>
        </form>
      </div>
    </div>
  );
}
