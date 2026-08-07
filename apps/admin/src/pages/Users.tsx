import { useCallback, useEffect, useMemo, useState } from 'react';
import { ShieldAlert, Trash2 } from 'lucide-react';
import { bulkDeleteUsers, deleteUser, getUsers, type AdminUser } from '../api';
import {
  AlertDialog,
  ConfirmDialog,
  LoadingSpinner,
  PageError,
  useToasts,
} from '../components/ui';
import { formatApiError } from '../utils/apiError';

export default function Users() {
  const toast = useToasts();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [pageError, setPageError] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [alertError, setAlertError] = useState<{ title: string; message: string } | null>(null);

  const loadUsers = useCallback(async (nextPage: number) => {
    setPageError('');
    try {
      setIsLoading(true);
      const offset = (nextPage - 1) * limit;
      const res = await getUsers({ limit, offset, includeDeleted: showDeleted });
      setUsers(Array.isArray(res.data) ? res.data : []);
      setTotal(typeof res.total === 'number' ? res.total : 0);
    } catch (err: unknown) {
      const detail = formatApiError(err);
      const message = `Fehler beim Laden der Benutzer. ${detail}`;
      setPageError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [limit, showDeleted, toast]);

  useEffect(() => {
    void loadUsers(page);
  }, [page, loadUsers]);

  const requestSingleDelete = (user: AdminUser) => {
    if (user.role === 'admin') return;
    setDeleteTargetId(user.id);
  };

  const executeSingleDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await deleteUser(deleteTargetId);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(deleteTargetId);
        return next;
      });
      toast.success('Benutzer wurde gelöscht.');
      setDeleteTargetId(null);
      await loadUsers(page);
    } catch (err: unknown) {
      const detail = formatApiError(err);
      setAlertError({ title: 'Löschen fehlgeschlagen', message: detail });
    }
  };

  const singleDeleteTarget = deleteTargetId
    ? users.find((u) => u.id === deleteTargetId) ?? null
    : null;

  const requestBulkDelete = () => {
    if (selectedIds.size === 0) return;
    setBulkDeleteOpen(true);
  };

  const executeBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      setBulkDeleteOpen(false);
      return;
    }
    try {
      await bulkDeleteUsers(ids);
      toast.success(`${ids.length} Benutzer wurden gelöscht.`);
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);

      const newTotal = Math.max(0, total - ids.length);
      const totalPages = Math.max(1, Math.ceil(newTotal / limit));
      const nextPage = Math.min(page, totalPages);
      if (nextPage !== page) setPage(nextPage);
      else await loadUsers(page);
    } catch (err: unknown) {
      const detail = formatApiError(err);
      setAlertError({ title: 'Massen-Löschen fehlgeschlagen', message: detail });
    }
  };

  const formatRole = (role: AdminUser['role']) => {
    switch (role) {
      case 'client':
        return 'Kunde';
      case 'provider':
        return 'Anbieter';
      case 'admin':
        return 'Admin';
      default:
        return role;
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const pageButtons = useMemo(() => {
    const windowSize = 7;
    const half = Math.floor(windowSize / 2);
    const start = Math.max(1, Math.min(totalPages - windowSize + 1, page - half));
    const end = Math.min(totalPages, start + windowSize - 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [page, totalPages]);

  const selectableIdsOnPage = useMemo(
    () => users.filter((u) => u.role !== 'admin').map((u) => u.id),
    [users],
  );

  const allSelectedOnPage =
    selectableIdsOnPage.length > 0 && selectableIdsOnPage.every((id) => selectedIds.has(id));

  const toggleSelectAllOnPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelectedOnPage) {
        selectableIdsOnPage.forEach((id) => next.delete(id));
      } else {
        selectableIdsOnPage.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div>
      <div
        style={{
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <h1 style={{ margin: 0, color: 'var(--primary)' }}>Benutzer</h1>

        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={showDeleted}
              onChange={(e) => {
                setSelectedIds(new Set());
                setPage(1);
                setShowDeleted(e.target.checked);
              }}
            />
            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Gelöschte anzeigen
            </span>
          </label>
          <span aria-live="polite" style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {total} Benutzer
          </span>
          <button
            className="btn btn-danger"
            disabled={selectedIds.size === 0}
            onClick={requestBulkDelete}
            style={{ opacity: selectedIds.size === 0 ? 0.5 : 1 }}
            title="Ausgewählte löschen"
          >
            Ausgewählte löschen ({selectedIds.size})
          </button>
        </div>
      </div>

      {pageError && <PageError message={pageError} onRetry={() => void loadUsers(page)} />}

      {isLoading && users.length === 0 ? (
        <LoadingSpinner label="Benutzer werden geladen…" />
      ) : (
        <div className="table-container" style={{ overflowX: 'auto', overflowY: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <th scope="col" style={{ width: 48 }}>
                  <input
                    type="checkbox"
                    aria-label="Alle auswählbaren Benutzer auf dieser Seite auswählen"
                    checked={allSelectedOnPage}
                    onChange={toggleSelectAllOnPage}
                    disabled={selectableIdsOnPage.length === 0}
                  />
                </th>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Rolle</th>
                <th scope="col">Status</th>
                <th scope="col">Registriert</th>
                <th scope="col" style={{ textAlign: 'right' }}>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isDeleted = Boolean(u.deletedAt);
                const statusText = isDeleted
                  ? 'Gelöscht'
                  : u.isActive
                    ? 'Aktiv'
                    : 'Inaktiv';

                return (
                  <tr key={u.id}>
                    <td>
                      {u.role !== 'admin' && !isDeleted && (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(u.id)}
                          onChange={() => toggleRow(u.id)}
                          aria-label={`${u.firstName} ${u.lastName} auswählen`}
                        />
                      )}
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {u.firstName} {u.lastName}
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{u.email}</td>
                    <td style={{ textTransform: 'capitalize' }}>{formatRole(u.role)}</td>
                    <td>
                      {statusText}
                      {u.isEmailVerified ? (
                        <span style={{ marginLeft: 8, color: '#2E7D32', fontSize: 12 }}>
                          ✓ Verifiziert
                        </span>
                      ) : (
                        <span style={{ marginLeft: 8, color: '#E65100', fontSize: 12 }}>
                          ✉ Nicht verifiziert
                        </span>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {!isDeleted && u.role !== 'admin' && (
                        <button
                          className="btn btn-danger"
                          style={{ padding: '0.4rem' }}
                          onClick={() => requestSingleDelete(u)}
                          title="Löschen"
                          aria-label={`${u.firstName} ${u.lastName} löschen`}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && !isLoading && (
                <tr>
                  <td
                    colSpan={7}
                    style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}
                  >
                    <ShieldAlert size={48} style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
                    Keine Benutzer gefunden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <nav
          aria-label="Benutzer Paginierung"
          style={{
            marginTop: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Seite {page} von {totalPages}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              className="btn btn-outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={{ opacity: page <= 1 ? 0.5 : 1 }}
              aria-label="Zur vorherigen Seite"
            >
              Zurück
            </button>

            {pageButtons.map((p) => (
              <button
                key={p}
                className={p === page ? 'btn btn-success' : 'btn btn-outline'}
                onClick={() => setPage(p)}
                aria-current={p === page ? 'page' : undefined}
                aria-label={`Seite ${p}`}
              >
                {p}
              </button>
            ))}

            <button
              className="btn btn-outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              style={{ opacity: page >= totalPages ? 0.5 : 1 }}
              aria-label="Zur nächsten Seite"
            >
              Weiter
            </button>
          </div>
        </nav>
      )}

      <ConfirmDialog
        open={deleteTargetId !== null}
        onClose={() => setDeleteTargetId(null)}
        title="Benutzer wirklich löschen?"
        description={
          singleDeleteTarget ? (
            <>
              <strong>
                {singleDeleteTarget.firstName} {singleDeleteTarget.lastName}
              </strong>
              {' '}
              ({singleDeleteTarget.email}) wird unwiderruflich gelöscht.
            </>
          ) : (
            'Diese Aktion kann nicht rückgängig gemacht werden.'
          )
        }
        confirmLabel="Löschen"
        confirmVariant="danger"
        onConfirm={executeSingleDelete}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        title="Massen-Löschung durchführen?"
        description={`${selectedIds.size} ausgewählte Benutzer werden unwiderruflich gelöscht.`}
        confirmLabel={`${selectedIds.size} Benutzer löschen`}
        confirmVariant="danger"
        onConfirm={executeBulkDelete}
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
