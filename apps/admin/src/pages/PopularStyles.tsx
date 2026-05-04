import { useEffect, useMemo, useRef, useState } from 'react';
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
  const [styles, setStyles] = useState<PopularStyle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [uploadingImageIds, setUploadingImageIds] = useState<Record<string, boolean>>({});

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStyle, setEditingStyle] = useState<PopularStyle | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadTargetIdRef = useRef<string | null>(null);

  const loadStyles = async () => {
    setPageError('');
    try {
      const data = await getPopularStyles();
      setStyles(Array.isArray(data) ? data : []);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status) {
        setPageError(`Fehler beim Laden der Styles (Status: ${status}).`);
      } else {
        setPageError('Fehler beim Laden der Styles.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStyles();
  }, []);

  const activeSortedStyles = useMemo(() => {
    return [...styles]
      .filter((s) => s.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [styles]);

  const openNew = () => {
    setEditingStyle(null);
    setForm(defaultForm);
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
    setIsModalOpen(true);
  };

  const setRowError = (id: string, message: string) => {
    setRowErrors((prev) => ({ ...prev, [id]: message }));
  };

  const clearRowError = (id: string) => {
    setRowErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const saveStyle = async () => {
    if (!form.name.trim()) {
      alert('Name ist erforderlich.');
      return;
    }

    try {
      if (editingStyle) {
        const updated = await updatePopularStyle(editingStyle.id, {
          name: form.name.trim(),
          emoji: form.emoji || '✨',
          colorHex: form.colorHex,
          sortOrder: form.sortOrder,
        });
        setStyles((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      } else {
        const created = await createPopularStyle({
          name: form.name.trim(),
          emoji: form.emoji || '✨',
          colorHex: form.colorHex,
          sortOrder: form.sortOrder,
        });
        setStyles((prev) => [...prev, created]);
      }

      setIsModalOpen(false);
      setEditingStyle(null);
      setForm(defaultForm);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Fehler beim Speichern');
    }
  };

  const toggleActive = async (style: PopularStyle) => {
    clearRowError(style.id);
    const nextValue = !style.isActive;
    setStyles((prev) => prev.map((s) => (s.id === style.id ? { ...s, isActive: nextValue } : s)));
    try {
      const updated = await updatePopularStyle(style.id, { isActive: nextValue });
      setStyles((prev) => prev.map((s) => (s.id === style.id ? updated : s)));
    } catch (err) {
      setStyles((prev) => prev.map((s) => (s.id === style.id ? { ...s, isActive: style.isActive } : s)));
      setRowError(style.id, 'Aktualisierung fehlgeschlagen');
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
      alert('Datei zu groß. Maximal 5MB.');
      return;
    }

    setUploadingImageIds((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await uploadStyleImage(id, file);
      setStyles((prev) => prev.map((s) => (s.id === id ? { ...s, imageUrl: res.imageUrl } : s)));
    } catch (err) {
      setRowError(id, 'Bild-Upload fehlgeschlagen');
    } finally {
      setUploadingImageIds((prev) => ({ ...prev, [id]: false }));
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const confirmDeleteImage = async (style: PopularStyle) => {
    if (!confirm(`Bild für "${style.name}" wirklich entfernen?`)) return;
    clearRowError(style.id);
    try {
      await deleteStyleImage(style.id);
      setStyles((prev) => prev.map((s) => (s.id === style.id ? { ...s, imageUrl: null } : s)));
    } catch (err) {
      setRowError(style.id, 'Bild konnte nicht entfernt werden');
    }
  };

  const confirmDeleteStyle = async (style: PopularStyle) => {
    if (!confirm(`Style "${style.name}" wirklich löschen? Das Bild wird ebenfalls gelöscht.`)) return;
    clearRowError(style.id);
    try {
      await deletePopularStyle(style.id);
      setStyles((prev) => prev.filter((s) => s.id !== style.id));
    } catch (err) {
      setRowError(style.id, 'Löschen fehlgeschlagen');
    }
  };

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

  if (isLoading) {
    return (
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem', gap: '0.75rem' }}>
        <div className="spinner" />
        <div style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Lädt...</div>
      </div>
    );
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

      {pageError && (
        <div
          className="card"
          style={{
            marginBottom: '1.5rem',
            border: '1px solid var(--danger)',
            color: 'var(--danger)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div>{pageError}</div>
          <button className="btn btn-outline" onClick={loadStyles}>Erneut versuchen</button>
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '60% 40%',
          gap: '1.5rem',
          alignItems: 'start',
        }}
      >
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h1 style={{ color: '#2563eb' }}>Beliebte Styles</h1>
            <button className="btn btn-primary" onClick={openNew}>
              <Plus size={18} /> Neuen Style hinzufügen
            </button>
          </div>

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
                                alt=""
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              <div style={{ fontSize: 22, lineHeight: 1 }}>{style.emoji || '✨'}</div>
                            )}

                            {isUploading && (
                              <div
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
                              onClick={() => confirmDeleteImage(style)}
                              title="Bild entfernen"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                      <td style={{ fontWeight: 500 }}>{style.name}</td>
                      <td>
                        <span style={{ fontSize: '1.25rem' }}>{style.emoji}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div
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
                          aria-label={style.isActive ? 'Aktiv' : 'Inaktiv'}
                        >
                          <span
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
                        <button
                          className="btn btn-outline"
                          style={{ padding: '0.4rem', marginRight: '0.5rem' }}
                          onClick={() => handleUploadClick(style.id)}
                          title="Bild hochladen"
                        >
                          <Camera size={16} />
                        </button>
                        <button
                          className="btn btn-outline"
                          style={{ padding: '0.4rem', marginRight: '0.5rem' }}
                          onClick={() => openEdit(style)}
                          title="Bearbeiten"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          className="btn btn-outline"
                          style={{ padding: '0.4rem', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                          onClick={() => confirmDeleteStyle(style)}
                          title="Löschen"
                        >
                          <Trash2 size={16} />
                        </button>
                        {rowErrors[style.id] && (
                          <div style={{ marginTop: '0.5rem', color: 'var(--danger)', fontSize: '0.75rem' }}>
                            {rowErrors[style.id]}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {styles.length === 0 && (
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

                  <div style={{ position: 'relative', height: '70%', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                    <div style={{ fontSize: 42, lineHeight: 1 }}>{style.emoji || '✨'}</div>
                  </div>

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
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal" style={{ maxWidth: '560px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              {editingStyle ? 'Style bearbeiten' : 'Neuen Style hinzufügen'}
            </div>
            <div className="modal-body">
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Name *</label>
                <input
                  type="text"
                  className="input-field"
                  maxLength={50}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="z.B. Senegalese Twists"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Emoji</label>
                <input
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

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Farbe (Hintergrundfarbe)</label>
                <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr', gap: '0.75rem', alignItems: 'center' }}>
                  <input
                    type="color"
                    value={form.colorHex}
                    onChange={(e) => setForm({ ...form, colorHex: e.target.value })}
                    style={{ width: 56, height: 44, borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', padding: 0 }}
                  />
                  <input
                    type="text"
                    className="input-field"
                    value={form.colorHex}
                    onChange={(e) => setForm({ ...form, colorHex: e.target.value })}
                    pattern="^#[0-9A-Fa-f]{6}$"
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Sortier-Reihenfolge</label>
                <input
                  type="number"
                  className="input-field"
                  min={0}
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
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
    </div>
  );
}
