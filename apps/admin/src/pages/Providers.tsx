import { useEffect, useState } from 'react';
import { UserCheck, UserX, UserMinus, ShieldAlert } from 'lucide-react';
import {
  approveProvider,
  getProviders,
  getAdminProviderIdDocumentUrl,
  rejectProvider,
  suspendProvider,
  type AdminProvider,
  type ProviderStatus,
} from '../api';

export default function Providers() {
  const [providers, setProviders] = useState<AdminProvider[]>([]);
  const [filter, setFilter] = useState<ProviderStatus | ''>('');
  const [selectedProvider, setSelectedProvider] = useState<AdminProvider | null>(null);

  const normalizeStatus = (status?: string | null): ProviderStatus | '' => {
    const normalized = status?.toLowerCase();
    if (
      normalized === 'pending' ||
      normalized === 'approved' ||
      normalized === 'rejected' ||
      normalized === 'suspended'
    ) {
      return normalized;
    }
    return '';
  };

  const loadProviders = async (status?: ProviderStatus) => {
    try {
      const data = await getProviders(status);
      setProviders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadProviders(filter || undefined);
  }, [filter]);

  const approve = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await approveProvider(id);
      loadProviders(filter || undefined);
      if (selectedProvider?.id === id) setSelectedProvider(null);
    } catch (err: unknown) {
      const maybe = err as { response?: { data?: { message?: unknown } } };
      const message =
        typeof maybe?.response?.data?.message === 'string'
          ? maybe.response.data.message
          : 'Fehler beim Genehmigen';
      alert(message);
    }
  };

  const reject = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const reason = prompt('Grund für Ablehnung (optional)?');
    if (reason === null) return;
    try {
      await rejectProvider(id, reason || undefined);
      loadProviders(filter || undefined);
      if (selectedProvider?.id === id) setSelectedProvider(null);
    } catch (err: unknown) {
      const maybe = err as { response?: { data?: { message?: unknown } } };
      const message =
        typeof maybe?.response?.data?.message === 'string'
          ? maybe.response.data.message
          : 'Fehler beim Ablehnen';
      alert(message);
    }
  };

  const suspend = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!confirm('Anbieter wirklich sperren?')) return;
    try {
      await suspendProvider(id);
      loadProviders(filter || undefined);
      if (selectedProvider?.id === id) setSelectedProvider(null);
    } catch {
      alert('Fehler beim Sperren');
    }
  };

  const getStatusBadge = (status: ProviderStatus) => {
    switch(status) {
      case 'pending': return <span className="badge badge-pending">Ausstehend</span>;
      case 'approved': return <span className="badge badge-approved">Genehmigt</span>;
      case 'rejected': return <span className="badge badge-rejected">Abgelehnt</span>;
      case 'suspended': return <span className="badge badge-suspended">Gesperrt</span>;
      default: return <span className="badge">{status}</span>;
    }
  }

  return (
    <div>
      <h1 style={{ marginBottom: '1.5rem', color: 'var(--primary)' }}>Anbieter verwalten</h1>
      
      <div className="tabs">
        <div className={`tab ${filter === '' ? 'active' : ''}`} onClick={() => setFilter('')}>Alle</div>
        <div className={`tab ${filter === 'pending' ? 'active' : ''}`} onClick={() => setFilter('pending')}>Ausstehend</div>
        <div className={`tab ${filter === 'approved' ? 'active' : ''}`} onClick={() => setFilter('approved')}>Genehmigt</div>
        <div className={`tab ${filter === 'rejected' ? 'active' : ''}`} onClick={() => setFilter('rejected')}>Abgelehnt</div>
        <div className={`tab ${filter === 'suspended' ? 'active' : ''}`} onClick={() => setFilter('suspended')}>Gesperrt</div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Business / Typ</th>
              <th>Stadt</th>
              <th>Status</th>
              <th>Registriert</th>
              <th style={{ textAlign: 'right' }}>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {providers.map(p => (
              <tr key={p.id} onClick={() => setSelectedProvider(p)} style={{ cursor: 'pointer' }} className="hover:bg-slate-50">
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-color)', overflow: 'hidden' }}>
                      {p.avatarUrl || p.user?.avatarUrl ? 
                        <img src={p.avatarUrl ?? p.user?.avatarUrl ?? undefined} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> :
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>{p.user?.firstName?.[0]}</div>
                      }
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{p.user?.firstName} {p.user?.lastName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.user?.email}</div>
                      {(() => {
                        const verified = (p.isEmailVerified ?? p.user?.isEmailVerified);
                        if (verified === false) {
                          return (
                            <span
                              style={{
                                display: 'inline-block',
                                marginTop: 6,
                                backgroundColor: '#FFF3E0',
                                color: '#E65100',
                                fontSize: 11,
                                padding: '2px 6px',
                                borderRadius: 4,
                              }}
                            >
                              ✉ Nicht verifiziert
                            </span>
                          );
                        }
                        if (verified === true) {
                          return (
                            <span
                              style={{
                                display: 'inline-block',
                                marginTop: 6,
                                backgroundColor: '#E8F5E9',
                                color: '#2E7D32',
                                fontSize: 11,
                                padding: '2px 6px',
                                borderRadius: 4,
                              }}
                            >
                              ✓ Verifiziert
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                </td>
                <td>
                  <div style={{ fontWeight: 500 }}>{p.businessName || '-'}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{p.providerType}</div>
                </td>
                <td style={{ color: 'var(--text-muted)' }}>{p.city}</td>
                <td>{getStatusBadge(p.status)}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{new Date(p.createdAt).toLocaleDateString()}</td>
                <td style={{ textAlign: 'right' }}>
                  {normalizeStatus(p.status) === 'pending' && (
                    <>
                      <button className="btn btn-success" style={{ padding: '0.4rem', marginRight: '0.5rem' }} onClick={(e) => approve(p.id, e)} title="Genehmigen">
                        <UserCheck size={16} />
                      </button>
                      <button className="btn btn-danger" style={{ padding: '0.4rem' }} onClick={(e) => reject(p.id, e)} title="Ablehnen">
                        <UserX size={16} />
                      </button>
                    </>
                  )}
                  {normalizeStatus(p.status) === 'approved' && (
                    <button className="btn btn-outline" style={{ padding: '0.4rem', color: 'var(--text-muted)' }} onClick={(e) => suspend(p.id, e)} title="Sperren">
                      <UserMinus size={16} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {providers.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  <ShieldAlert size={48} style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
                  Keine Anbieter gefunden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedProvider && (
        <div className="modal-overlay" onClick={() => setSelectedProvider(null)}>
          <div className="modal" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Anbieter Details</span>
              {getStatusBadge(selectedProvider.status)}
            </div>
            <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Kontakt</h3>
                <p><strong>Name:</strong> {selectedProvider.user?.firstName} {selectedProvider.user?.lastName}</p>
                <p><strong>Email:</strong> {selectedProvider.user?.email}</p>
                <p><strong>Telefon:</strong> {selectedProvider.user?.phone || '-'}</p>
                <p><strong>Stadt:</strong> {selectedProvider.city}</p>
              </div>
              <div>
                <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Geschäft</h3>
                <p><strong>Name:</strong> {selectedProvider.businessName || '-'}</p>
                <p><strong>Typ:</strong> <span style={{ textTransform: 'capitalize' }}>{selectedProvider.providerType}</span></p>
                <p><strong>Registriert:</strong> {new Date(selectedProvider.createdAt).toLocaleString()}</p>
              </div>
              
              {selectedProvider.hasIdDocument && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Ausweisdokument</h3>
                  <div style={{ background: 'var(--bg-color)', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <img src={getAdminProviderIdDocumentUrl(selectedProvider.id)} alt="ID Document" style={{ width: '100%', maxHeight: '250px', objectFit: 'contain' }} />
                  </div>
                </div>
              )}
            </div>
            
            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              <button className="btn btn-outline" onClick={() => setSelectedProvider(null)}>Schließen</button>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                {normalizeStatus(selectedProvider.status) === 'pending' && (
                  <>
                    <button className="btn btn-danger" onClick={() => reject(selectedProvider.id)}>Ablehnen</button>
                    <button className="btn btn-success" onClick={() => approve(selectedProvider.id)}>Genehmigen</button>
                  </>
                )}
                {normalizeStatus(selectedProvider.status) === 'approved' && (
                  <button className="btn btn-outline" style={{ color: 'var(--text-muted)' }} onClick={() => suspend(selectedProvider.id)}>Sperren</button>
                )}
                {normalizeStatus(selectedProvider.status) === 'suspended' && (
                  <button className="btn btn-success" onClick={() => approve(selectedProvider.id)}>Reaktivieren</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
