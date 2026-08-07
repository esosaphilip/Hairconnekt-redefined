import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Edit2, Plus, ShieldAlert, Trash2 } from 'lucide-react';
import {
  createCategory,
  deleteCategory as removeCategory,
  getCategories,
  updateCategory,
  type Category,
} from '../api';
import {
  AlertDialog,
  ConfirmDialog,
  LoadingSpinner,
  PageError,
  useDialogLifecycle,
  useToasts,
} from '../components/ui';
import { formatApiError, tryExtractNameFieldError } from '../utils/apiError';

type FormState = { name: string; description: string; sortOrder: number; isActive: boolean };
const emptyForm: FormState = { name: '', description: '', sortOrder: 0, isActive: true };

export default function Categories() {
  const toast = useToasts();
  const nameErrorId = useId();
  const sortErrorId = useId();

  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formNameError, setFormNameError] = useState('');
  const [formSortError, setFormSortError] = useState('');

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [alertError, setAlertError] = useState<{ title: string; message: string } | null>(null);

  const categoryModalRef = useRef<HTMLDivElement | null>(null);
  useDialogLifecycle(isModalOpen, () => setIsModalOpen(false), categoryModalRef);

  const clearRowError = (id: string) => {
    setRowErrors((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const loadCategories = useCallback(async () => {
    setPageError('');
    try {
      setIsLoading(true);
      const data = await getCategories();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      const detail = formatApiError(err);
      const message = `Fehler beim Laden der Kategorien. ${detail}`;
      setPageError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormNameError('');
    setFormSortError('');
    setIsModalOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditingId(cat.id);
    setForm({
      name: cat.name,
      description: cat.description || '',
      sortOrder: cat.sortOrder,
      isActive: cat.isActive,
    });
    setFormNameError('');
    setFormSortError('');
    setIsModalOpen(true);
  };

  const validateForm = (): boolean => {
    let ok = true;
    setFormNameError('');
    setFormSortError('');
    if (!form.name.trim()) {
      setFormNameError('Name ist erforderlich.');
      ok = false;
    }
    if (form.sortOrder < 0 || Number.isNaN(form.sortOrder)) {
      setFormSortError('Reihenfolge muss >= 0 sein.');
      ok = false;
    }
    return ok;
  };

  const saveCategory = async () => {
    if (!validateForm()) return;
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      sortOrder: form.sortOrder,
      isActive: form.isActive,
    };
    try {
      if (editingId) {
        const updated = await updateCategory(editingId, payload);
        setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        toast.success('Kategorie wurde aktualisiert.');
      } else {
        const created = await createCategory(payload);
        setCategories((prev) => [...prev, created]);
        toast.success('Kategorie wurde erstellt.');
      }
      setIsModalOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      setFormNameError('');
      setFormSortError('');
    } catch (err: unknown) {
      const nameMsg = tryExtractNameFieldError(err);
      if (nameMsg) {
        setFormNameError(nameMsg);
        setTimeout(() => {
          const input = document.getElementById('hc-category-name');
          if (input && input instanceof HTMLElement) input.focus();
        }, 30);
        return;
      }
      const detail = formatApiError(err);
      setAlertError({ title: 'Speichern fehlgeschlagen', message: detail });
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      await removeCategory(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      toast.success('Kategorie wurde gelöscht.');
      setDeletingId(null);
    } catch (err: unknown) {
      const detail = formatApiError(err);
      setAlertError({ title: 'Löschen fehlgeschlagen', message: detail });
    }
  };

  const toggleActive = async (cat: Category) => {
    clearRowError(cat.id);
    const next = !cat.isActive;
    setCategories((prev) => prev.map((c) => (c.id === cat.id ? { ...c, isActive: next } : c)));
    try {
      const updated = await updateCategory(cat.id, { isActive: next });
      setCategories((prev) => prev.map((c) => (c.id === cat.id ? updated : c)));
      toast.success(next ? 'Kategorie aktiviert.' : 'Kategorie deaktiviert.');
    } catch (err: unknown) {
      setCategories((prev) => prev.map((c) => (c.id === cat.id ? { ...c, isActive: cat.isActive } : c)));
      const detail = formatApiError(err);
      setRowErrors((prev) => ({ ...prev, [cat.id]: detail }));
    }
  };

  const confirmTarget = deletingId ? categories.find((c) => c.id === deletingId) : null;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
          gap: '1rem',
        }}
      >
        <h1 style={{ color: 'var(--primary)', margin: 0 }}>Kategorien verwalten</h1>
        <button className="btn btn-primary" onClick={openNew}>
          <Plus size={18} /> Neue Kategorie
        </button>
      </div>

      {pageError && <PageError message={pageError} onRetry={() => void loadCategories()} />}

      {isLoading && categories.length === 0 ? (
        <LoadingSpinner label="Kategorien werden geladen…" />
      ) : (
        <div className="table-container" style={{ overflowX: 'auto', overflowY: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Beschreibung</th>
                <th scope="col">Reihenfolge</th>
                <th scope="col">Aktiv</th>
                <th scope="col" style={{ textAlign: 'right' }}>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => {
                const rowErrorId = `hc-cat-rowerr-${cat.id}`;
                const rowError = rowErrors[cat.id];
                return (
                <tr key={cat.id}>
                  <td style={{ fontWeight: 500 }}>{cat.name}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{cat.description || '-'}</td>
                  <td>{cat.sortOrder}</td>
                  <td>
                    <label
                      style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '0.5rem' }}
                    >
                      <input
                        type="checkbox"
                        checked={cat.isActive}
                        onChange={() => toggleActive(cat)}
                        aria-label={`Aktiv-Status für ${cat.name} umschalten`}
                        aria-describedby={rowError ? rowErrorId : undefined}
                      />
                      <span
                        className={`badge ${cat.isActive ? 'badge-approved' : 'badge-suspended'}`}
                      >
                        {cat.isActive ? 'Aktiv' : 'Inaktiv'}
                      </span>
                    </label>
                    {rowError && (
                      <div
                        id={rowErrorId}
                        role="alert"
                        style={{
                          marginTop: 4,
                          color: 'var(--danger)',
                          fontSize: '0.75rem',
                        }}
                      >
                        Aktualisierung fehlgeschlagen. {rowError}
                      </div>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn btn-outline"
                      style={{ padding: '0.4rem', marginRight: '0.5rem' }}
                      onClick={() => openEdit(cat)}
                      aria-label={`Kategorie ${cat.name} bearbeiten`}
                      aria-describedby={rowError ? rowErrorId : undefined}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      className="btn btn-outline"
                      style={{ padding: '0.4rem', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                      onClick={() => setDeletingId(cat.id)}
                      aria-label={`Kategorie ${cat.name} löschen`}
                      aria-describedby={rowError ? rowErrorId : undefined}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
                );
              })}
              {categories.length === 0 && !isLoading && (
                <tr>
                  <td
                    colSpan={5}
                    style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}
                  >
                    <ShieldAlert size={48} style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
                    Keine Kategorien vorhanden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="hc-category-title"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            ref={categoryModalRef}
            className="modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" id="hc-category-title">
              {editingId ? 'Kategorie bearbeiten' : 'Neue Kategorie'}
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '1rem' }}>
                <label
                  htmlFor="hc-category-name"
                  style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}
                >
                  Name *
                </label>
                <input
                  id="hc-category-name"
                  type="text"
                  className="input-field"
                  value={form.name}
                  onChange={(e) => {
                    setForm({ ...form, name: e.target.value });
                    if (formNameError) setFormNameError('');
                  }}
                  placeholder="z.B. Flechten"
                  aria-invalid={Boolean(formNameError) || undefined}
                  aria-describedby={formNameError ? nameErrorId : undefined}
                />
                {formNameError && (
                  <div
                    id={nameErrorId}
                    role="alert"
                    style={{ marginTop: 4, color: 'var(--danger)', fontSize: '0.75rem' }}
                  >
                    {formNameError}
                  </div>
                )}
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label
                  htmlFor="hc-category-description"
                  style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}
                >
                  Beschreibung
                </label>
                <textarea
                  id="hc-category-description"
                  className="input-field"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Optionale Beschreibung"
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label
                  htmlFor="hc-category-sort"
                  style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}
                >
                  Sortier-Reihenfolge
                </label>
                <input
                  id="hc-category-sort"
                  type="number"
                  min={0}
                  className="input-field"
                  value={form.sortOrder}
                  onChange={(e) => {
                    setForm({ ...form, sortOrder: parseInt(e.target.value, 10) || 0 });
                    if (formSortError) setFormSortError('');
                  }}
                  aria-invalid={Boolean(formSortError) || undefined}
                  aria-describedby={formSortError ? sortErrorId : undefined}
                />
                {formSortError && (
                  <div
                    id={sortErrorId}
                    role="alert"
                    style={{ marginTop: 4, color: 'var(--danger)', fontSize: '0.75rem' }}
                  >
                    {formSortError}
                  </div>
                )}
              </div>
              <div>
                <label
                  style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}
                  htmlFor="hc-category-active"
                >
                  <input
                    id="hc-category-active"
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  />
                  Aktiv
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setIsModalOpen(false)}>
                Abbrechen
              </button>
              <button className="btn btn-primary" onClick={saveCategory}>
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deletingId !== null}
        onClose={() => setDeletingId(null)}
        title="Kategorie wirklich löschen?"
        description={
          confirmTarget ? (
            <>
              <strong>{confirmTarget.name}</strong> wird unwiderruflich gelöscht. Zugeordnete Angebote
              oder Inhalte könnten betroffen sein.
            </>
          ) : (
            'Diese Aktion kann nicht rückgängig gemacht werden.'
          )
        }
        confirmLabel="Löschen"
        confirmVariant="danger"
        onConfirm={() => deleteCategory(deletingId!)}
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
