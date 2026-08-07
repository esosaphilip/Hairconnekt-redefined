import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Camera, Edit2, Plus, ShieldAlert, Trash2, X } from 'lucide-react';
import {
  createPopularStyle,
  deletePopularStyle,
  deleteStyleImage,
  getPopularStyles,
  type PopularStyle,
  updatePopularStyle,
  uploadStyleImage,
} from '../api';
import {
  AlertDialog,
  ConfirmDialog,
  LoadingSpinner,
  PageError,
  useToasts,
} from '../components/ui';
import { formatApiError } from '../utils/apiError';

type FormState = {
  name: string;
  emoji: string;
  colorHex: string;
  sortOrder: number;
};

const defaultForm: FormState = {
  name: '',
  emoji: '✨',
  colorHex: '#C8860A',
  sortOrder: 0,
};

export default function PopularStyles() {
  const toast = useToasts();
  const nameErrorId = useId();

  const [styles, setStyles] = useState<PopularStyle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [uploadingImageIds, setUploadingImageIds] = useState<Record<string, boolean>>({});

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStyle, setEditingStyle] = useState<PopularStyle | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [formNameError, setFormNameError] = useState('');

  const [deleteImageTargetId, setDeleteImageTargetId] = useState<string | null>(null);
  const [deleteStyleTargetId, setDeleteStyleTargetId] = useState<string | null>(null);
  const [alertError, setAlertError] = useState<{ title: string; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadTargetIdRef = useRef<string | null>(null);

  const loadStyles = useCallback(async () => {
    setPageError('');
    try {
      setIsLoading(true);
      const data = await getPopularStyles();
      setStyles(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      const detail = formatApiError(err);
      const message = `Fehler beim Laden der Styles. ${detail}`;
      setPageError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadStyles();
  }, [loadStyles]);

  const activeSortedStyles = useMemo(() => {
    return [...styles]
      .filter((s) => s.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [styles]);

  const openNew = () => {
    setEditingStyle(null);
    setForm(defaultForm);
    setFormNameError('');
    setIsModalOpen(true);
  };

  const openEdit = (style: PopularStyle) => {
    setEditingStyle(style);
    setForm({
      name: style.name,
      emoji: style.emoji || '✨',
      colorHex: style.colorHex || '#C8860A',
      sortOrder: typeof style.sortOrder === 'number' ? style.sortOrder : 0,
    });
    setFormNameError('');
    setIsModalOpen(true);
  };

  const clearRowError = (id: string) => {
    setRowErrors((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const validateForm = (): boolean => {
    if (!form.name.trim()) {
      setFormNameError('Name ist erforderlich.');
      return false;
    }
    setFormNameError('');
    return true;
  };

  const saveStyle = async () => {
    if (!validateForm()) return;

    try {
      if (editingStyle) {
        const updated = await updatePopularStyle(editingStyle.id, {
          name: form.name.trim(),
          emoji: form.emoji || '✨',
          colorHex: form.colorHex,
          sortOrder: form.sortOrder,
        });
        setStyles((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        toast.success('Style wurde aktualisiert.');
      } else {
        const created = await createPopularStyle({
          name: form.name.trim(),
          emoji: form.emoji || '✨',
          colorHex: form.colorHex,
          sortOrder: form.sortOrder,
        });
        setStyles((prev) => [...prev, created]);
        toast.success('Style wurde erstellt.');
      }

      setIsModalOpen(false);
      setEditingStyle(null);
      setForm(defaultForm);
      setFormNameError('');
    } catch (err: unknown) {
      const detail = formatApiError(err);
      setAlertError({ title: 'Speichern fehlgeschlagen', message: detail });
    }
  };

  const toggleActive = async (style: PopularStyle) => {
    clearRowError(style.id);
    const nextValue = !style.isActive;
    setStyles((prev) => prev.map((s) => (s.id === style.id ? { ...s, isActive: nextValue } : s)));
    try {
      const updated = await updatePopularStyle(style.id, { isActive: nextValue });
      setStyles((prev) => prev.map((s) => (s.id === style.id ? updated : s)));
      toast.success(nextValue ? 'Style aktiviert.' : 'Style deaktiviert.');
    } catch (err: unknown) {
      setStyles((prev) => prev.map((s) => (s.id === style.id ? { ...s, isActive: style.isActive } : s)));
      const detail = formatApiError(err);
      setRowErrors((prev) => ({ ...prev, [style.id]: detail }));
    }
  };

  const handleUploadClick = (id: string) => {
    uploadTargetIdRef.current = id;
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (file: File | null) => {
    const id = uploadTargetIdRef.current;
    uploadTargetIdRef.current = null;

    if (!id || !file) return;

    clearRowError(id);

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Datei zu groß. Maximal 5MB.');
      return;
    }

    setUploadingImageIds((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await uploadStyleImage(id, file);
      setStyles((prev) => prev.map((s) => (s.id === id ? { ...s, imageUrl: res.imageUrl } : s)));
      toast.success('Bild wurde hochgeladen.');
    } catch (err: unknown) {
      const detail = formatApiError(err);
      setRowErrors((prev) => ({ ...prev, [id]: detail }));
    } finally {
      setUploadingImageIds((prev) => ({ ...prev, [id]: false }));
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const executeDeleteImage = async () => {
    const id = deleteImageTargetId;
    if (!id) return;
    clearRowError(id);
    try {
      await deleteStyleImage(id);
      setStyles((prev) => prev.map((s) => (s.id === id ? { ...s, imageUrl: null } : s)));
      toast.success('Bild wurde entfernt.');
      setDeleteImageTargetId(null);
    } catch (err: unknown) {
      const detail = formatApiError(err);
      setRowErrors((prev) => ({ ...prev, [id]: detail }));
      setDeleteImageTargetId(null);
    }
  };

  const executeDeleteStyle = async () => {
    const id = deleteStyleTargetId;
    if (!id) return;
    clearRowError(id);
    try {
      await deletePopularStyle(id);
      setStyles((prev) => prev.filter((s) => s.id !== id));
      toast.success('Style wurde gelöscht.');
      setDeleteStyleTargetId(null);
    } catch (err: unknown) {
      const detail = formatApiError(err);
      setRowErrors((prev) => ({ ...prev, [id]: detail }));
      setDeleteStyleTargetId(null);
    }
  };

  const deleteImageTarget = deleteImageTargetId
    ? styles.find((s) => s.id === deleteImageTargetId) ?? null
    : null;
  const deleteStyleTarget = deleteStyleTargetId
    ? styles.find((s) => s.id === deleteStyleTargetId) ?? null
    : null;

  const previewCard = (
    <div
      style={{
        width: 80,
        height: 110,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: form.colorHex,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ fontSize: 28, lineHeight: 1, marginTop: -10 }}>{form.emoji || '✨'}</div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.35)',
          padding: 6,
          color: 'white',
          fontWeight: 700,
          fontSize: 12,
        }}
      >
        {form.name || 'Name'}
      </div>
    </div>
  );

  if (isLoading && styles.length === 0) {
    return <LoadingSpinner label="Styles werden geladen…" />;
  }

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={(e) => handleFileSelected(e.target.files?.[0] ?? null)}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '60% 40%',
          gap: '1.5rem',
          alignItems: 'start',
        }}
      >
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 style={{ color: 'var(--primary)', margin: 0 }}>Beliebte Styles</h1>
              <div aria-live="polite" style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                {styles.length} Styles · davon {activeSortedStyles.length} aktiv
              </div>
            </div>
            <button className="btn btn-primary" onClick={openNew}>
              <Plus size={18} /> Neuen Style hinzufügen
            </button>
          </div>

          {pageError && <PageError message={pageError} onRetry={() => void loadStyles()} />}

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>BILD</th>
                  <th>NAME</th>
                  <th>EMOJI</th>
                  <th>FARBE</th>
                  <th>REIHENFOLGE</th>
                  <th>AKTIV</th>
                  <th style={{ textAlign: 'right' }}>AKTIONEN</th>
                </tr>
              </thead>
              <tbody>
                {styles.map((style) => {
                  const isUploading = Boolean(uploadingImageIds[style.id]);
                  return (
                    <tr key={style.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: 12,
                              overflow: 'hidden',
                              position: 'relative',
                              backgroundColor: style.colorHex,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {style.imageUrl ? (
                              <img
                                src={style.imageUrl}
                                alt={`Vorschaubild für ${style.name}`}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              <div role="img" aria-label={`${style.emoji || '✨'} Emoji`} style={{ fontSize: 22, lineHeight: 1 }}>
                                {style.emoji || '✨'}
                              </div>
                            )}

                            {isUploading && (
                              <div
                                role="status"
                                aria-live="polite"
                                aria-label="Bild-Upload läuft"
                                style={{
                                  position: 'absolute',
                                  inset: 0,
                                  background: 'rgba(255,255,255,0.7)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <div className="spinner" />
                              </div>
                            )}
                          </div>

                          {style.imageUrl && (
                            <button
                              className="btn btn-outline"
                              style={{ padding: '0.35rem', borderRadius: 10 }}
                              onClick={() => setDeleteImageTargetId(style.id)}
                              title="Bild entfernen"
                              aria-label={`Bild für ${style.name} entfernen`}
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                      <td style={{ fontWeight: 500 }}>{style.name}</td>
                      <td>
                        <span role="img" aria-label={style.emoji || 'Emoji'} style={{ fontSize: '1.25rem' }}>
                          {style.emoji}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div
                            role="img"
                            aria-label={`Farbe ${style.colorHex}`}
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: '50%',
                              backgroundColor: style.colorHex,
                              border: '1px solid var(--border)',
                            }}
                          />
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{style.colorHex}</span>
                        </div>
                      </td>
                      <td>{style.sortOrder}</td>
                      <td>
                        <button
                          onClick={() => toggleActive(style)}
                          style={{
                            width: 44,
                            height: 26,
                            borderRadius: 999,
                            backgroundColor: style.isActive ? 'var(--success)' : '#cbd5e1',
                            position: 'relative',
                            transition: 'all 0.2s',
                          }}
                          aria-pressed={style.isActive}
                          aria-label={`Aktiv-Status für ${style.name} umschalten`}
                        >
                          <span
                            aria-hidden="true"
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: '50%',
                              background: 'white',
                              position: 'absolute',
                              top: 3,
                              left: style.isActive ? 21 : 3,
                              transition: 'all 0.2s',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                            }}
                          />
                        </button>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
                          <button
                            className="btn btn-outline"
                            style={{ padding: '0.4rem' }}
                            onClick={() => handleUploadClick(style.id)}
                            title="Bild hochladen"
                            aria-label={`Bild für ${style.name} hochladen`}
                          >
                            <Camera size={16} />
                          </button>
                          <button
                            className="btn btn-outline"
                            style={{ padding: '0.4rem' }}
                            onClick={() => openEdit(style)}
                            title="Bearbeiten"
                            aria-label={`Style ${style.name} bearbeiten`}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            className="btn btn-outline"
                            style={{ padding: '0.4rem', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                            onClick={() => setDeleteStyleTargetId(style.id)}
                            title="Löschen"
                            aria-label={`Style ${style.name} löschen`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        {rowErrors[style.id] && (
                          <div
                            role="alert"
                            style={{ marginTop: '0.5rem', color: 'var(--danger)', fontSize: '0.75rem', textAlign: 'left' }}
                          >
                            Aktion fehlgeschlagen. {rowErrors[style.id]}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {styles.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      <ShieldAlert size={48} style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
                      Keine Styles vorhanden.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.75rem' }}>
            Vorschau (Mobilansicht)
          </div>
          <div
            style={{
              border: '1px solid var(--border)',
              borderRadius: 24,
              padding: '1rem',
              background: 'var(--surface)',
            }}
          >
            <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
              {activeSortedStyles.map((style) => (
                <div
                  key={style.id}
                  style={{
                    width: 130,
                    height: 170,
                    borderRadius: 16,
                    overflow: 'hidden',
                    position: 'relative',
                    flex: '0 0 auto',
                    backgroundColor: style.colorHex,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {style.imageUrl && (
                    <img
                      src={style.imageUrl}
                      alt=""
                      style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  )}

                  {!style.imageUrl && (
                    <div style={{ position: 'relative', height: '70%', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                      <div role="img" aria-label={`${style.emoji || '✨'} Emoji`} style={{ fontSize: 42, lineHeight: 1 }}>
                        {style.emoji || '✨'}
                      </div>
                    </div>
                  )}

                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'rgba(0,0,0,0.35)',
                      padding: 8,
                      color: 'white',
                      fontWeight: 700,
                      fontSize: 14,
                    }}
                  >
                    {style.name}
                  </div>
                </div>
              ))}

              {activeSortedStyles.length === 0 && (
                <div style={{ color: 'var(--text-muted)', padding: '1rem' }}>
                  Keine aktiven Styles.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="hc-style-title"
          onClick={() => setIsModalOpen(false)}
        >
          <div className="modal" style={{ maxWidth: '560px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" id="hc-style-title">
              {editingStyle ? 'Style bearbeiten' : 'Neuen Style hinzufügen'}
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '1rem' }}>
                <label
                  htmlFor="hc-style-name"
                  style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}
                >
                  Name *
                </label>
                <input
                  id="hc-style-name"
                  type="text"
                  className="input-field"
                  maxLength={50}
                  value={form.name}
                  onChange={(e) => {
                    setForm({ ...form, name: e.target.value });
                    if (formNameError) setFormNameError('');
                  }}
                  placeholder="z.B. Senegalese Twists"
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
                  htmlFor="hc-style-emoji"
                  style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}
                >
                  Emoji
                </label>
                <input
                  id="hc-style-emoji"
                  type="text"
                  className="input-field"
                  maxLength={4}
                  value={form.emoji}
                  onChange={(e) => setForm({ ...form, emoji: e.target.value })}
                  placeholder="✨"
                />
                <div style={{ marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  Ein Emoji-Zeichen
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label
                  htmlFor="hc-style-color"
                  style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}
                >
                  Farbe (Hintergrundfarbe)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr', gap: '0.75rem', alignItems: 'center' }}>
                  <input
                    aria-label="Farbwähler"
                    type="color"
                    value={form.colorHex}
                    onChange={(e) => setForm({ ...form, colorHex: e.target.value })}
                    style={{ width: 56, height: 44, borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', padding: 0 }}
                  />
                  <input
                    id="hc-style-color"
                    type="text"
                    className="input-field"
                    value={form.colorHex}
                    onChange={(e) => setForm({ ...form, colorHex: e.target.value })}
                    pattern="^#[0-9A-Fa-f]{6}$"
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label
                  htmlFor="hc-style-sort"
                  style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}
                >
                  Sortier-Reihenfolge
                </label>
                <input
                  id="hc-style-sort"
                  type="number"
                  className="input-field"
                  min={0}
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value, 10) || 0 })}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Live Vorschau</label>
                {previewCard}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={saveStyle}>Speichern</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteImageTargetId !== null}
        onClose={() => setDeleteImageTargetId(null)}
        title="Bild wirklich entfernen?"
        description={
          deleteImageTarget ? (
            <>Das Bild für <strong>{deleteImageTarget.name}</strong> wird vom Server gelöscht.</>
          ) : (
            'Das Bild wird unwiderruflich entfernt.'
          )
        }
        confirmLabel="Bild entfernen"
        confirmVariant="danger"
        onConfirm={executeDeleteImage}
      />

      <ConfirmDialog
        open={deleteStyleTargetId !== null}
        onClose={() => setDeleteStyleTargetId(null)}
        title="Style wirklich löschen?"
        description={
          deleteStyleTarget ? (
            <>
              <strong>{deleteStyleTarget.name}</strong> wird vollständig gelöscht. Zugeordnete Bilder werden
              ebenfalls entfernt. Diese Aktion kann nicht rückgängig gemacht werden.
            </>
          ) : (
            'Der Style und sein Bild werden unwiderruflich gelöscht.'
          )
        }
        confirmLabel="Style löschen"
        confirmVariant="danger"
        onConfirm={executeDeleteStyle}
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
