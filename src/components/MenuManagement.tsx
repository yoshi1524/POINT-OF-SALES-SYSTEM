'use client';
import { useState, useEffect, useCallback } from 'react';
import { MenuItem } from '@/types';
import { toast } from './Toast';

const CATEGORIES = ['Sizzling Favorites','Grilled Specialties','Rice Meals','Snacks & Starters','Soups & Stews','Beverages','Desserts','Extras'];
const EMOJIS = ['🍽','🥩','🍗','🍖','🍚','🍜','🍲','🥘','🥗','🍺','🍹','🧃','🍰','🍮'];

export default function MenuManagement() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [form, setForm] = useState({ emoji: '🍽', name: '', category: CATEGORIES[0], price: '', stock: '', status: 'available' });

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch('/api/menu');
    const d = await r.json();
    if (d.success) setItems(d.items);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setEditing(null);
    setForm({ emoji: '🍽', name: '', category: CATEGORIES[0], price: '', stock: '', status: 'available' });
    setShowModal(true);
  }

  function openEdit(item: MenuItem) {
    setEditing(item);
    setForm({ emoji: item.emoji || '🍽', name: item.name, category: item.category, price: String(item.price), stock: String(item.stock), status: item.status });
    setShowModal(true);
  }

  async function saveItem() {
    if (!form.name) { toast('Name required!', 'error'); return; }
    if (!form.price || parseFloat(form.price) <= 0) { toast('Valid price required!', 'error'); return; }
    const body = editing
      ? { action: 'update', item: { id: editing.id, ...form, price: parseFloat(form.price), stock: parseInt(form.stock) || 0 } }
      : { action: 'add', item: { ...form, price: parseFloat(form.price), stock: parseInt(form.stock) || 0 } };
    const r = await fetch('/api/menu', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json();
    if (d.success) { toast(editing ? 'Item updated!' : 'Item added!', 'success'); setShowModal(false); load(); }
    else { toast(d.message || 'Failed', 'error'); }
  }

  async function archiveItem(id: number) {
    if (!confirm('Archive this item? It will be hidden from the menu.')) return;
    const r = await fetch('/api/menu', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'archive', item_id: id }) });
    const d = await r.json();
    if (d.success) { toast('Item archived.', 'info'); load(); }
    else { toast(d.message || 'Failed', 'error'); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="card">
        <div className="section-header">
          <div className="section-title">Menu Items</div>
          <button className="btn btn-accent" onClick={openAdd}>+ Add Item</button>
        </div>
        {loading ? <div className="empty-state">Loading...</div> : (
          <table>
            <thead><tr><th>Item</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {!items.length && <tr><td colSpan={6} className="empty-state">No menu items found.</td></tr>}
              {items.map(item => (
                <tr key={item.id}>
                  <td><span style={{ fontSize: 20, marginRight: 8 }}>{item.emoji || '🍽'}</span>{item.name}</td>
                  <td><span className="tag tag-yellow">{item.category}</span></td>
                  <td>₱{item.price.toFixed(2)}</td>
                  <td>{item.stock}</td>
                  <td>
                    <span className={`tag ${item.stock === 0 ? 'tag-red' : item.status === 'available' ? 'tag-green' : 'tag-red'}`}>
                      {item.stock === 0 ? 'Out of Stock' : item.status === 'available' ? 'Available' : 'Unavailable'}
                    </span>
                  </td>
                  <td style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(item)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => archiveItem(item.id)}>Archive</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-title">{editing ? 'Edit Menu Item' : 'Add Menu Item'}</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              {EMOJIS.map(e => <button key={e} onClick={() => setForm(p => ({ ...p, emoji: e }))} style={{ fontSize: 22, background: form.emoji === e ? 'var(--accent)' : 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 8px', cursor: 'pointer' }}>{e}</button>)}
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Name</label>
                <input className="form-input" placeholder="Item name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-input" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Price (₱)</label>
                <input className="form-input" type="number" min="0" step="0.01" placeholder="0.00" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Stock</label>
                <input className="form-input" type="number" min="0" placeholder="0" value={form.stock} onChange={e => setForm(p => ({ ...p, stock: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-input" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                <option value="available">Available</option>
                <option value="unavailable">Unavailable</option>
              </select>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-accent" onClick={saveItem}>Save Item</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
