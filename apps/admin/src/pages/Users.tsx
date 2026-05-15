import { useEffect, useState } from 'react';
import { ShieldAlert, Trash2 } from 'lucide-react';
import { deleteUser, getUsers, type AdminUser } from '../api';

export default function Users() {
  const [users, setUsers] = useState<AdminUser[]>([]);

  const loadUsers = async () => {
    try {
      const data = await getUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const onDelete = async (user: AdminUser) => {
    if (user.role === 'admin') return;
    if (!confirm('Benutzer wirklich löschen?')) return;
    try {
      await deleteUser(user.id);
      await loadUsers();
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

  return (
    <div>
      <h1 style={{ marginBottom: '1.5rem', color: 'var(--primary)' }}>Benutzer</h1>

      <div className="table-container">
        <table>
          <thead>
            <tr>
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
                  colSpan={6}
                  style={{
                    textAlign: 'center',
                    padding: '3rem',
                    color: 'var(--text-muted)',
                  }}
                >
                  <ShieldAlert size={48} style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
                  Keine Benutzer gefunden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

