import { useEffect, useState } from 'react';
import { Users, AlertCircle, CheckCircle, Sparkles } from 'lucide-react';
import api from '../api';
import { getAdminStats } from '../api';

export default function Dashboard() {
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    totalCategories: 0,
    activePopularStyles: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [pendingRes, approvedRes, catRes] = await Promise.all([
          api.get('/admin/providers?status=pending'),
          api.get('/admin/providers?status=approved'),
          api.get('/admin/categories')
        ]);

        const adminStats = await getAdminStats();
        
        setStats({
          pending: pendingRes.data.length || 0,
          approved: approvedRes.data.length || 0,
          totalCategories: catRes.data.length || 0,
          activePopularStyles: adminStats.activePopularStyles || 0,
        });
      } catch (err) {
        console.error("Error fetching stats", err);
      }
    };
    fetchStats();
  }, []);

  return (
    <div>
      <h1 style={{ marginBottom: '2rem', color: 'var(--primary)' }}>Dashboard Overview</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ background: '#fef3c7', padding: '1rem', borderRadius: '16px', color: '#b45309' }}>
            <AlertCircle size={32} />
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase' }}>Ausstehende Anbieter</p>
            <h2 style={{ fontSize: '2rem', margin: '0.25rem 0 0' }}>{stats.pending}</h2>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ background: '#dcfce7', padding: '1rem', borderRadius: '16px', color: '#15803d' }}>
            <CheckCircle size={32} />
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase' }}>Genehmigte Anbieter</p>
            <h2 style={{ fontSize: '2rem', margin: '0.25rem 0 0' }}>{stats.approved}</h2>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ background: '#e0e7ff', padding: '1rem', borderRadius: '16px', color: 'var(--primary)' }}>
            <Users size={32} />
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase' }}>Kategorien Aktiv</p>
            <h2 style={{ fontSize: '2rem', margin: '0.25rem 0 0' }}>{stats.totalCategories}</h2>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ background: '#fef3c7', padding: '1rem', borderRadius: '16px', color: '#b45309' }}>
            <Sparkles size={32} />
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase' }}>Beliebte Styles Aktiv</p>
            <h2 style={{ fontSize: '2rem', margin: '0.25rem 0 0' }}>{stats.activePopularStyles}</h2>
          </div>
        </div>

      </div>
    </div>
  );
}
