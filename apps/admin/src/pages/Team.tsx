import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Mail, Plus, ShieldAlert, X } from 'lucide-react';
import api, { getUsers, type AdminUser as ApiAdminUser } from '../api';
import {
  AlertDialog,
  ConfirmDialog,
  LoadingSpinner,
  PageError,
  useDialogLifecycle,
  useToasts,
} from '../components/ui';
import { formatApiError } from '../utils/apiError';

type AdminUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  createdAt: string;
  role: string;
};

type InvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired';

type Invitation = {
  id: string;
  email: string;
  role: string;
  status: InvitationStatus;
  invitedBy: string;
  expiresAt: string;
  acceptedAt?: string;
  createdAt: string;
  updatedAt: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STATUS_LABELS: Record<InvitationStatus | '', string> = {
  '': 'Alle',
  pending: 'Ausstehend',
  accepted: 'Angenommen',
  revoked: 'Widerrufen',
  expired: 'Abgelaufen',
};

const STATUS_BADGE: Record<InvitationStatus, { label: string; bg: string; color: string }> = {
  pending: { label: 'OFFEN', bg: '#fef3c7', color: '#92400e' },
  accepted: { label: 'OK', bg: '#dcfce7', color: '#166534' },
  revoked: { label: 'WID', bg: '#f3f4f6', color: '#4b5563' },
  expired: { label: 'ABG', bg: '#fee2e2', color: '#991b1b' },
};

async function getAdminUsers(): Promise<AdminUser[]> {
  const res = await getUsers({ limit: 100, offset: 0 });
  const list = Array.isArray(res?.data) ? res.data : [];
  return list
    .filter((u: ApiAdminUser) => u.role === 'admin')
    .map((u: ApiAdminUser) => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      isActive: u.isActive,
      createdAt: u.createdAt,
      role: u.role,
    }));
}

async function getInvitations(status?: string): Promise<Invitation[]> {
  const url = status
    ? `/admin/invitations?status=${encodeURIComponent(status)}`
    : '/admin/invitations';
  const res = await api.get(url);
  const data = Array.isArray(res?.data) ? res.data : Array.isArray(res?.data?.data) ? res.data.data : [];
  return data as Invitation[];
}

async function createInvite(email: string): Promise<Invitation> {
  const res = await api.post('/admin/invitations', { email });
  return res.data as Invitation;
}

async function revokeInvite(id: string): Promise<void> {
  await api.delete(`/admin/invitations/${id}`);
}

function formatDate(iso: string | undefined | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

export default function Team() {
  const toast = useToasts();
  const inviteEmailErrorId = useId();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(true);
  const [pageError, setPageError] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvitationStatus | ''>('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newInviteEmail, setNewInviteEmail] = useState('');
  const [inviteEmailError, setInviteEmailError] = useState('');
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);

  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [alertError, setAlertError] = useState<{ title: string; message: string } | null>(null);

  const inviteModalRef = useRef<HTMLDivElement | null>(null);
  useDialogLifecycle(isModalOpen, () => setIsModalOpen(false), inviteModalRef);

  const loadAdminUsers = useCallback(async () => {
    try {
      setIsLoadingUsers(true);
      const data = await getAdminUsers();
      setUsers(data);
    } catch (err: unknown) {
      const detail = formatApiError(err);
      const message = `Fehler beim Laden der Admin-Benutzer. ${detail}`;
      setPageError(message);
      toast.error(message);
    } finally {
      setIsLoadingUsers(false);
    }
  }, [toast]);

  const loadInvitations = useCallback(async () => {
    try {
      setIsLoadingInvitations(true);
      const data = await getInvitations(statusFilter || undefined);
      setInvitations(data);
    } catch (err: unknown) {
      const detail = formatApiError(err);
      const message = `Fehler beim Laden der Einladungen. ${detail}`;
      setPageError(message);
      toast.error(message);
    } finally {
      setIsLoadingInvitations(false);
    }
  }, [statusFilter, toast]);

  useEffect(() => {
    void loadAdminUsers();
  }, [loadAdminUsers]);

  useEffect(() => {
    void loadInvitations();
  }, [loadInvitations]);

  useEffect(() => {
    if (!successMsg) return;
    const t = window.setTimeout(() => setSuccessMsg(''), 5000);
    return () => window.clearTimeout(t);
  }, [successMsg]);

  useEffect(() => {
    if (!errorMsg) return;
    const t = window.setTimeout(() => setErrorMsg(''), 7000);
    return () => window.clearTimeout(t);
  }, [errorMsg]);

  const openInviteModal = () => {
    setNewInviteEmail('');
    setInviteEmailError('');
    setIsModalOpen(true);
  };

  const validateInviteEmail = (): boolean => {
    setInviteEmailError('');
    const trimmed = newInviteEmail.trim();
    if (!trimmed) {
      setInviteEmailError('E-Mail ist erforderlich.');
      return false;
    }
    if (!EMAIL_REGEX.test(trimmed)) {
      setInviteEmailError('Bitte geben Sie eine gültige E-Mail-Adresse ein.');
      return false;
    }
    return true;
  };

  const submitInvite = async () => {
    if (!validateInviteEmail()) return;
    if (isSubmittingInvite) return;

    try {
      setIsSubmittingInvite(true);
      const email = newInviteEmail.trim();
      await createInvite(email);
      setIsModalOpen(false);
      setNewInviteEmail('');
      setInviteEmailError('');
      setSuccessMsg(`Einladung gesendet an ${email}`);
      toast.success(`Einladung gesendet an ${email}`);
      void loadInvitations();
    } catch (err: unknown) {
      const detail = formatApiError(err);
      setAlertError({ title: 'Einladung fehlgeschlagen', message: detail });
    } finally {
      setIsSubmittingInvite(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await revokeInvite(id);
      setInvitations((prev) => prev.map((inv) => (inv.id === id ? { ...inv, status: 'revoked' as InvitationStatus } : inv)));
      toast.success('Einladung wurde widerrufen.');
      setRevokingId(null);
    } catch (err: unknown) {
      const detail = formatApiError(err);
      setAlertError({ title: 'Widerruf fehlgeschlagen', message: detail });
    }
  };

  const confirmRevoke = revokingId ? invitations.find((i) => i.id === revokingId) : null;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <h1 style={{ color: 'var(--primary)', margin: 0 }}>Team</h1>
        <button className="btn btn-primary" onClick={openInviteModal}>
          <Plus size={18} /> Einladen
        </button>
      </div>

      {successMsg && (
        <div
          role="status"
          aria-live="polite"
          style={{
            marginBottom: '1rem',
            padding: '0.875rem 1rem',
            background: '#dcfce7',
            color: '#166534',
            border: '1px solid #bbf7d0',
            borderRadius: '10px',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div>{successMsg}</div>
          <button
            type="button"
            onClick={() => setSuccessMsg('')}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#166534' }}
            aria-label="Erfolgshinweis schließen"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {errorMsg && (
        <div
          role="alert"
          aria-live="assertive"
          style={{
            marginBottom: '1rem',
            padding: '0.875rem 1rem',
            background: '#fef2f2',
            color: '#991b1b',
            border: '1px solid #fecaca',
            borderRadius: '10px',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div>{errorMsg}</div>
          <button
            type="button"
            onClick={() => setErrorMsg('')}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#991b1b' }}
            aria-label="Fehlerhinweis schließen"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {pageError && <PageError message={pageError} onRetry={() => { setPageError(''); void loadAdminUsers(); void loadInvitations(); }} />}

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem',
        }}
      >
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text)' }}>Admin Benutzer</h3>
          {isLoadingUsers && users.length === 0 ? (
            <LoadingSpinner label="Admin-Benutzer werden geladen…" />
          ) : (
            <div className="table-container" style={{ overflowX: 'auto', overflowY: 'hidden' }}>
              <table>
                <thead>
                  <tr>
                    <th scope="col">E-Mail</th>
                    <th scope="col">Name</th>
                    <th scope="col">Status</th>
                    <th scope="col">Erstellt am</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 500 }}>{u.email}</td>
                      <td>
                        {u.firstName} {u.lastName}
                      </td>
                      <td>
                        <span
                          className={`badge ${u.isActive ? 'badge-approved' : 'badge-suspended'}`}
                        >
                          {u.isActive ? 'Aktiv' : 'Inaktiv'}
                        </span>
                      </td>
                      <td>{formatDate(u.createdAt)}</td>
                    </tr>
                  ))}
                  {users.length === 0 && !isLoadingUsers && (
                    <tr>
                      <td
                        colSpan={4}
                        style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}
                      >
                        <ShieldAlert size={48} style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
                        Keine Admin-Benutzer vorhanden.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <h3 style={{ margin: 0, color: 'var(--text)' }}>Einladungen</h3>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <label
                htmlFor="hc-invite-status-filter"
                style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500 }}
              >
                Filter:
              </label>
              <select
                id="hc-invite-status-filter"
                className="input-field"
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.875rem', width: 'auto' }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as InvitationStatus | '')}
              >
                {Object.entries(STATUS_LABELS).map(([val, label]) => (
                  <option key={val || 'all'} value={val}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {isLoadingInvitations && invitations.length === 0 ? (
            <LoadingSpinner label="Einladungen werden geladen…" />
          ) : (
            <div className="table-container" style={{ overflowX: 'auto', overflowY: 'hidden' }}>
              <table>
                <thead>
                  <tr>
                    <th scope="col">E-Mail</th>
                    <th scope="col">Rolle</th>
                    <th scope="col">Status</th>
                    <th scope="col">Eingeladen von</th>
                    <th scope="col">Gültig bis</th>
                    <th scope="col">Erstellt am</th>
                    <th scope="col" style={{ textAlign: 'right' }}>Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {invitations.map((inv) => {
                    const badge = STATUS_BADGE[inv.status];
                    return (
                      <tr key={inv.id}>
                        <td style={{ fontWeight: 500 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Mail size={14} style={{ color: 'var(--text-muted)' }} />
                            {inv.email}
                          </div>
                        </td>
                        <td>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '999px',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              background: '#e5e7eb',
                              color: '#374151',
                            }}
                          >
                            ADMIN
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.2rem 0.55rem',
                              borderRadius: '6px',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              background: badge.bg,
                              color: badge.color,
                              letterSpacing: '0.02em',
                            }}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                          {inv.invitedBy || '—'}
                        </td>
                        <td>{formatDate(inv.expiresAt)}</td>
                        <td>{formatDate(inv.createdAt)}</td>
                        <td style={{ textAlign: 'right' }}>
                          {inv.status === 'pending' ? (
                            <button
                              className="btn btn-outline"
                              style={{
                                padding: '0.4rem 0.75rem',
                                fontSize: '0.8rem',
                                color: 'var(--danger)',
                                borderColor: 'var(--danger)',
                              }}
                              onClick={() => setRevokingId(inv.id)}
                              aria-label={`Einladung für ${inv.email} widerrufen`}
                            >
                              Widerrufen
                            </button>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {invitations.length === 0 && !isLoadingInvitations && (
                    <tr>
                      <td
                        colSpan={7}
                        style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}
                      >
                        <Mail size={48} style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
                        Keine Einladungen vorhanden.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="hc-invite-title"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            ref={inviteModalRef}
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 460 }}
          >
            <div className="modal-header" id="hc-invite-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600 }}>Neue Einladung</span>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                aria-label="Dialog schließen"
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Sendet eine Einladungs-E-Mail an die angegebene Adresse. Der Empfänger erhält Admin-Zugriff.
              </p>
              <div>
                <label
                  htmlFor="hc-invite-email"
                  style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}
                >
                  E-Mail *
                </label>
                <input
                  id="hc-invite-email"
                  type="email"
                  className="input-field"
                  placeholder="name@beispiel.de"
                  value={newInviteEmail}
                  onChange={(e) => {
                    setNewInviteEmail(e.target.value);
                    if (inviteEmailError) setInviteEmailError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isSubmittingInvite) {
                      e.preventDefault();
                      void submitInvite();
                    }
                  }}
                  aria-invalid={Boolean(inviteEmailError) || undefined}
                  aria-describedby={inviteEmailError ? inviteEmailErrorId : undefined}
                  disabled={isSubmittingInvite}
                />
                {inviteEmailError && (
                  <div
                    id={inviteEmailErrorId}
                    role="alert"
                    style={{ marginTop: 4, color: 'var(--danger)', fontSize: '0.75rem' }}
                  >
                    {inviteEmailError}
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setIsModalOpen(false)} disabled={isSubmittingInvite}>
                Abbrechen
              </button>
              <button className="btn btn-primary" onClick={submitInvite} disabled={isSubmittingInvite} aria-busy={isSubmittingInvite || undefined}>
                {isSubmittingInvite ? 'Wird gesendet…' : 'Einladung senden'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={revokingId !== null}
        onClose={() => setRevokingId(null)}
        title="Einladung wirklich widerrufen?"
        description={
          confirmRevoke ? (
            <>
              Die Einladung an <strong>{confirmRevoke.email}</strong> wird widerrufen und ist nicht mehr gültig.
            </>
          ) : (
            'Diese Aktion kann nicht rückgängig gemacht werden.'
          )
        }
        confirmLabel="Widerrufen"
        confirmVariant="danger"
        onConfirm={() => handleRevoke(revokingId!)}
      />

      <AlertDialog
        open={alertError !== null}
        onClose={() => setAlertError(null)}
        title={alertError?.title ?? 'Fehler'}
        description={alertError?.message ?? null}
      />
    </div>
  );
}
