import { useCallback, useEffect, useRef, useState } from 'react';
import { ShieldAlert, UserCheck, UserMinus, UserX } from 'lucide-react';
import {
  approveProvider,
  getAdminProviderIdDocumentUrl,
  getProviders,
  rejectProvider,
  suspendProvider,
  type AdminProvider,
  type ProviderStatus,
} from '../api';
import {
  AlertDialog,
  ConfirmDialog,
  LoadingSpinner,
  PageError,
  PromptDialog,
  useDialogLifecycle,
  useToasts,
} from '../components/ui';
import { formatApiError } from '../utils/apiError';

type ConfirmKind = 'approve' | null;

export default function Providers() {
  const toast = useToasts();
  const [providers, setProviders] = useState<AdminProvider[]>([]);
  const [filter, setFilter] = useState<ProviderStatus | ''>('');
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<AdminProvider | null>(null);

  const [confirmFor, setConfirmFor] = useState<{ id: string; kind: ConfirmKind } | null>(null);
  const [promptReject, setPromptReject] = useState<string | null>(null);
  const [promptSuspend, setPromptSuspend] = useState<string | null>(null);
  const [alertError, setAlertError] = useState<{ title: string; message: string } | null>(null);

  const providerDetailsRef = useRef<HTMLDivElement | null>(null);
  useDialogLifecycle(selectedProvider !== null, () => setSelectedProvider(null), providerDetailsRef);

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

  const loadProviders = useCallback(async (status?: ProviderStatus) => {
    setPageError('');
    try {
      setIsLoading(true);
      const data = await getProviders(status);
      setProviders(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      const detail = formatApiError(err);
      const message = `Fehler beim Laden der Anbieter. ${detail}`;
      setPageError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadProviders(filter || undefined);
  }, [filter, loadProviders]);

  const refreshAfterMutation = async () => {
    await loadProviders(filter || undefined);
  };

  const approve = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setConfirmFor({ id, kind: 'approve' });
  };

  const reject = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setPromptReject(id);
  };

  const suspend = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setPromptSuspend(id);
  };

  // ---------------------------------------------------------------------------
  // Confirm: approve
  // ---------------------------------------------------------------------------
  const executeConfirm = async () => {
    if (!confirmFor) return;
    const { id } = confirmFor;
    try {
      await approveProvider(id);
      toast.success('Anbieter wurde genehmigt.');
      if (selectedProvider?.id === id) setSelectedProvider(null);
      setConfirmFor(null);
      await refreshAfterMutation();
    } catch (err: unknown) {
      const detail = formatApiError(err);
      setAlertError({
        title: 'Genehmigung fehlgeschlagen',
        message: detail,
      });
    }
  };

  const approveConfirmTarget = confirmFor?.kind === 'approve'
    ? providers.find((p) => p.id === confirmFor.id)
    : null;

  // ---------------------------------------------------------------------------
  // Prompt: reject (reason optional)
  // ---------------------------------------------------------------------------
  const executeReject = async (reason: string) => {
    if (!promptReject) return;
    if (reason.trim().length > 0 && reason.trim().length < 6) {
      toast.error('Begründung muss mindestens 6 Zeichen lang sein, falls angegeben.');
      return;
    }
    try {
      await rejectProvider(promptReject, reason.trim() || undefined);
      toast.success('Anbieter wurde abgelehnt.');
      if (selectedProvider?.id === promptReject) setSelectedProvider(null);
      setPromptReject(null);
      await refreshAfterMutation();
    } catch (err: unknown) {
      const detail = formatApiError(err);
      setAlertError({ title: 'Ablehnung fehlgeschlagen', message: detail });
    }
  };

  // ---------------------------------------------------------------------------
  // Prompt: suspend (reason REQUIRED per audit rules)
  // ---------------------------------------------------------------------------
  const executeSuspend = async (reason: string) => {
    if (!promptSuspend) return;
    if (reason.trim().length < 6) {
      toast.error('Begründung für Sperrung muss mindestens 6 Zeichen lang sein.');
      return;
    }
    try {
      await suspendProvider(promptSuspend, reason.trim() || undefined);
      toast.success('Anbieter wurde gesperrt.');
      if (selectedProvider?.id === promptSuspend) setSelectedProvider(null);
      setPromptSuspend(null);
      await refreshAfterMutation();
    } catch (err: unknown) {
      const detail = formatApiError(err);
      setAlertError({ title: 'Sperrung fehlgeschlagen', message: detail });
    }
  };

  const getStatusBadge = (status: ProviderStatus) => {
    switch (status) {
      case 'pending':
        return <span className="badge badge-pending">Ausstehend</span>;
      case 'approved':
        return <span className="badge badge-approved">Genehmigt</span>;
      case 'rejected':
        return <span className="badge badge-rejected">Abgelehnt</span>;
      case 'suspended':
        return <span className="badge badge-suspended">Gesperrt</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  const filterKeys: Array<{ key: ProviderStatus | ''; label: string }> = [
    { key: '', label: 'Alle' },
    { key: 'pending', label: 'Ausstehend' },
    { key: 'approved', label: 'Genehmigt' },
    { key: 'rejected', label: 'Abgelehnt' },
    { key: 'suspended', label: 'Gesperrt' },
  ];

  return (
    <div>
      <h1 style={{ marginBottom: '1.5rem', color: 'var(--primary)' }}>Anbieter verwalten</h1>

      {pageError && <PageError message={pageError} onRetry={() => void loadProviders(filter || undefined)} />}

      <div
        role="tablist"
        aria-label="Anbieter Filter"
        className="tabs"
      >
        {filterKeys.map(({ key, label }) => (
          <div
            key={key}
            role="tab"
            aria-selected={filter === key}
            tabIndex={0}
            className={`tab ${filter === key ? 'active' : ''}`}
            onClick={() => setFilter(key)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setFilter(key);
              }
            }}
          >
            {label}
          </div>
        ))}
      </div>

      {isLoading && providers.length === 0 ? (
        <LoadingSpinner label="Anbieter werden geladen…" />
      ) : (
        <div className="table-container" style={{ overflowX: 'auto', overflowY: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Business / Typ</th>
                <th scope="col">Stadt</th>
                <th scope="col">Status</th>
                <th scope="col">Registriert</th>
                <th scope="col" style={{ textAlign: 'right' }}>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {providers.map((p) => {
                const avatarAlt =
                  p.user?.firstName && p.user?.lastName
                    ? `Avatar von ${p.user.firstName} ${p.user.lastName}`
                    : '';
                return (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedProvider(p)}
                    style={{ cursor: 'pointer' }}
                    className="hover:bg-slate-50"
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: 'var(--bg-color)',
                            overflow: 'hidden',
                          }}
                        >
                          {p.avatarUrl || p.user?.avatarUrl ? (
                            <img
                              src={p.avatarUrl ?? p.user?.avatarUrl ?? undefined}
                              alt={avatarAlt}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <div
                              aria-hidden={!p.user?.firstName}
                              style={{
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--text-muted)',
                              }}
                            >
                              {p.user?.firstName?.[0]}
                            </div>
                          )}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>
                            {p.user?.firstName} {p.user?.lastName}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {p.user?.email}
                          </div>
                          {(() => {
                            const verified = p.isEmailVerified ?? p.user?.isEmailVerified;
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
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)',
                          textTransform: 'capitalize',
                        }}
                      >
                        {p.providerType}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{p.city}</td>
                    <td>{getStatusBadge(p.status)}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {normalizeStatus(p.status) === 'pending' && (
                        <>
                          <button
                            className="btn btn-success"
                            style={{ padding: '0.4rem', marginRight: '0.5rem' }}
                            onClick={(e) => approve(p.id, e)}
                            title="Genehmigen"
                            aria-label="Anbieter genehmigen"
                          >
                            <UserCheck size={16} />
                          </button>
                          <button
                            className="btn btn-danger"
                            style={{ padding: '0.4rem' }}
                            onClick={(e) => reject(p.id, e)}
                            title="Ablehnen"
                            aria-label="Anbieter ablehnen"
                          >
                            <UserX size={16} />
                          </button>
                        </>
                      )}
                      {normalizeStatus(p.status) === 'approved' && (
                        <button
                          className="btn btn-outline"
                          style={{ padding: '0.4rem', color: 'var(--text-muted)' }}
                          onClick={(e) => suspend(p.id, e)}
                          title="Sperren"
                          aria-label="Anbieter sperren"
                        >
                          <UserMinus size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {providers.length === 0 && !isLoading && (
                <tr>
                  <td
                    colSpan={6}
                    style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}
                  >
                    <ShieldAlert size={48} style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
                    Keine Anbieter gefunden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selectedProvider && (
        <div className="modal-overlay" onClick={() => setSelectedProvider(null)}>
          <div
            ref={providerDetailsRef}
            className="modal"
            style={{ maxWidth: '600px' }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="hc-provider-details-title"
          >
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span id="hc-provider-details-title">Anbieter Details</span>
              {getStatusBadge(selectedProvider.status)}
            </div>
            <div
              className="modal-body"
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}
            >
              <div>
                <h3
                  style={{
                    fontSize: '0.875rem',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    marginBottom: '0.5rem',
                  }}
                >
                  Kontakt
                </h3>
                <p>
                  <strong>Name:</strong> {selectedProvider.user?.firstName}{' '}
                  {selectedProvider.user?.lastName}
                </p>
                <p>
                  <strong>Email:</strong> {selectedProvider.user?.email}
                </p>
                <p>
                  <strong>Telefon:</strong> {selectedProvider.user?.phone || '-'}
                </p>
                <p>
                  <strong>Stadt:</strong> {selectedProvider.city}
                </p>
              </div>
              <div>
                <h3
                  style={{
                    fontSize: '0.875rem',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    marginBottom: '0.5rem',
                  }}
                >
                  Geschäft
                </h3>
                <p>
                  <strong>Name:</strong> {selectedProvider.businessName || '-'}
                </p>
                <p>
                  <strong>Typ:</strong>{' '}
                  <span style={{ textTransform: 'capitalize' }}>{selectedProvider.providerType}</span>
                </p>
                <p>
                  <strong>Registriert:</strong>{' '}
                  {new Date(selectedProvider.createdAt).toLocaleString()}
                </p>
              </div>

              {selectedProvider.hasIdDocument && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <h3
                    style={{
                      fontSize: '0.875rem',
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      marginBottom: '0.5rem',
                    }}
                  >
                    Ausweisdokument
                  </h3>
                  <div
                    style={{
                      background: 'var(--bg-color)',
                      padding: '0.5rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <img
                      src={getAdminProviderIdDocumentUrl(selectedProvider.id)}
                      alt="ID Dokument des Anbieters"
                      style={{ width: '100%', maxHeight: '250px', objectFit: 'contain' }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              <button className="btn btn-outline" onClick={() => setSelectedProvider(null)}>
                Schließen
              </button>

              <div style={{ display: 'flex', gap: '1rem' }}>
                {normalizeStatus(selectedProvider.status) === 'pending' && (
                  <>
                    <button className="btn btn-danger" onClick={() => reject(selectedProvider.id)}>
                      Ablehnen
                    </button>
                    <button className="btn btn-success" onClick={() => approve(selectedProvider.id)}>
                      Genehmigen
                    </button>
                  </>
                )}
                {normalizeStatus(selectedProvider.status) === 'approved' && (
                  <button
                    className="btn btn-outline"
                    style={{ color: 'var(--text-muted)' }}
                    onClick={() => suspend(selectedProvider.id)}
                  >
                    Sperren
                  </button>
                )}
                {normalizeStatus(selectedProvider.status) === 'suspended' && (
                  <button className="btn btn-success" onClick={() => approve(selectedProvider.id)}>
                    Reaktivieren
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <ConfirmDialog
        open={confirmFor?.kind === 'approve'}
        onClose={() => setConfirmFor(null)}
        title="Anbieter genehmigen?"
        description={
          approveConfirmTarget
            ? `${approveConfirmTarget.user?.firstName ?? ''} ${
                approveConfirmTarget.user?.lastName ?? ''
              } (${approveConfirmTarget.businessName || '—'}) wird freigeschaltet.`
            : 'Der Anbieter wird freigeschaltet.'
        }
        confirmLabel="Genehmigen"
        confirmVariant="success"
        onConfirm={executeConfirm}
      />

      <PromptDialog
        open={promptReject !== null}
        onClose={() => setPromptReject(null)}
        title="Grund für Ablehnung"
        description="Die Begründung wird im Audit-Trail gespeichert (optional)."
        confirmLabel="Ablehnen"
        confirmVariant="danger"
        placeholder="z.B. Fehlende Geschäftsunterlagen"
        multiline
        onConfirm={executeReject}
      />

      <PromptDialog
        open={promptSuspend !== null}
        onClose={() => setPromptSuspend(null)}
        title="Grund für Sperrung"
        description="Bitte geben Sie eine Begründung an. Sie wird im Audit-Trail gespeichert und ist verpflichtend."
        confirmLabel="Sperren"
        confirmVariant="danger"
        placeholder="z.B. wiederholte Verstöße gegen die Nutzungsbedingungen"
        multiline
        required
        onConfirm={executeSuspend}
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
