import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, ShieldAlert } from 'lucide-react';
import {
  createCategory,
  deleteCategory as removeCategory,
  getCategories,
  updateCategory,
  type Category,
} from '../api';

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [form, setForm] = useState({ name: '', description: '', sortOrder: 0, isActive: true });

  const loadCategories = async () => {
    try {
      const data = await getCategories();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const openNew = () => {
    setEditingId(null);
    setForm({ name: '', description: '', sortOrder: 0, isActive: true });
    setIsModalOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditingId(cat.id);
    setForm({ name: cat.name, description: cat.description || '', sortOrder: cat.sortOrder, isActive: cat.isActive });
    setIsModalOpen(true);
  };

  const saveCategory = async () => {
    try {
      if (editingId) {
        await updateCategory(editingId, form);
      } else {
        await createCategory(form);
      }
      setIsModalOpen(false);
      loadCategories();
    } catch (err: unknown) {
      const maybe = err as { response?: { data?: { message?: unknown } } };
      const message =
        typeof maybe?.response?.data?.message === 'string'
          ? maybe.response.data.message
          : 'Fehler beim Speichern';
      alert(message);
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('Kategorie wirklich löschen?')) return;
    try {
      await removeCategory(id);
      loadCategories();
    } catch (err) {
      console.error(err);
      alert('Fehler beim Löschen');
    }
  };

  const toggleActive = async (cat: Category) => {
    try {
      await updateCategory(cat.id, { isActive: !cat.isActive });
      loadCategories();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ color: 'var(--primary)' }}>Kategorien verwalten</h1>
        <button className="btn btn-primary" onClick={openNew}>
          <Plus size={18} /> Neue Kategorie
        </button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Beschreibung</th>
              <th>Reihenfolge</th>
              <th>Aktiv</th>
              <th style={{ textAlign: 'right' }}>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(cat => (
              <tr key={cat.id}>
                <td style={{ fontWeight: 500 }}>{cat.name}</td>
                <td style={{ color: 'var(--text-muted)' }}>{cat.description || '-'}</td>
                <td>{cat.sortOrder}</td>
                <td>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '0.5rem' }}>
                    <input type="checkbox" checked={cat.isActive} onChange={() => toggleActive(cat)} />
                    <span className={`badge ${cat.isActive ? 'badge-approved' : 'badge-suspended'}`}>
                      {cat.isActive ? 'Aktiv' : 'Inaktiv'}
                    </span>
                  </label>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn btn-outline" style={{ padding: '0.4rem', marginRight: '0.5rem' }} onClick={() => openEdit(cat)}>
                    <Edit2 size={16} />
                  </button>
                  <button className="btn btn-outline" style={{ padding: '0.4rem', color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => deleteCategory(cat.id)}>
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  <ShieldAlert size={48} style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
                  Keine Kategorien vorhanden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              {editingId ? 'Kategorie bearbeiten' : 'Neue Kategorie'}
            </div>
            <div className="modal-body">
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Name *</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={form.name} 
                  onChange={e => setForm({...form, name: e.target.value})} 
                  placeholder="z.B. Flechten"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Beschreibung</label>
                <textarea 
                  className="input-field" 
                  rows={3} 
                  value={form.description} 
                  onChange={e => setForm({...form, description: e.target.value})}
                  placeholder="Optionale Beschreibung"
                ></textarea>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Sortier-Reihenfolge</label>
                <input 
                  type="number" 
                  className="input-field" 
                  value={form.sortOrder} 
                  onChange={e => setForm({...form, sortOrder: parseInt(e.target.value) || 0})} 
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={saveCategory}>Speichern</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
