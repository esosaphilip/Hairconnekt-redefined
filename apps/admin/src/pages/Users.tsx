import { useEffect, useMemo, useState } from 'react';
import { ShieldAlert, Trash2 } from 'lucide-react';
import { bulkDeleteUsers, deleteUser, getUsers, type AdminUser } from '../api';

export default function Users() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);

  const loadUsers = async (nextPage = page) => {
    try {
      setIsLoading(true);
      const offset = (nextPage - 1) * limit;
      const res = await getUsers({ limit, offset, includeDeleted: showDeleted });
      setUsers(Array.isArray(res.data) ? res.data : []);
      setTotal(typeof res.total === 'number' ? res.total : 0);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers(page);
  }, [page, showDeleted]);

  const onDelete = async (user: AdminUser) => {
    if (user.role === 'admin') return;
    if (!confirm('Benutzer wirklich löschen?')) return;
    try {
      await deleteUser(user.id);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(user.id);
        return next;
      });
      await loadUsers(page);
    } catch (err: unknown) {
      const maybe = err as { response?: { data?: { message?: unknown } } };
      const message =
        typeof maybe?.response?.data?.message === 'string'
          ? maybe.response.data.message
          : 'Fehler beim Löschen';
      alert(message);
    }
  };

  const onBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!confirm(`Wirklich ${ids.length} Benutzer löschen?`)) return;
    try {
      await bulkDeleteUsers(ids);
      setSelectedIds(new Set());

      const newTotal = Math.max(0, total - ids.length);
      const totalPages = Math.max(1, Math.ceil(newTotal / limit));
      const nextPage = Math.min(page, totalPages);
      if (nextPage !== page) setPage(nextPage);
      else await loadUsers(page);
    } catch (err: unknown) {
      const maybe = err as { response?: { data?: { message?: unknown } } };
      const message =
        typeof maybe?.response?.data?.message === 'string'
          ? maybe.response.data.message
          : 'Fehler beim Löschen';
      alert(message);
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
    selectableIdsOnPage.length > 0 &&
    selectableIdsOnPage.every((id) => selectedIds.has(id));

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
        }}
      >
        <h1 style={{ margin: 0, color: 'var(--primary)' }}>Benutzer</h1>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
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
          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {total} Benutzer
          </span>
          <button
            className="btn btn-danger"
            disabled={selectedIds.size === 0}
            onClick={onBulkDelete}
            style={{ opacity: selectedIds.size === 0 ? 0.5 : 1 }}
            title="Ausgewählte löschen"
          >
            Ausgewählte löschen ({selectedIds.size})
          </button>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th style={{ width: 48 }}>
                <input
                  type="checkbox"
                  checked={allSelectedOnPage}
                  onChange={toggleSelectAllOnPage}
                  disabled={selectableIdsOnPage.length === 0}
                />
              </th>
              <th>Name</th>
              <th>Email</th>
              <th>Rolle</th>
              <th>Status</th>
              <th>Registriert</th>
              <th style={{ textAlign: 'right' }}>Aktionen</th>
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
                        onClick={() => onDelete(u)}
                        title="Löschen"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    textAlign: 'center',
                    padding: '3rem',
                    color: 'var(--text-muted)',
                  }}
                >
                  <ShieldAlert size={48} style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
                  {isLoading ? 'Lädt...' : 'Keine Benutzer gefunden.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div
          style={{
            marginTop: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
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
            >
              Zurück
            </button>

            {pageButtons.map((p) => (
              <button
                key={p}
                className={p === page ? 'btn btn-success' : 'btn btn-outline'}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ))}

            <button
              className="btn btn-outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              style={{ opacity: page >= totalPages ? 0.5 : 1 }}
            >
              Weiter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
