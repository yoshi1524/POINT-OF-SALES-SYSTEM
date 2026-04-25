'use client';
import { useState, useEffect, useCallback } from 'react';
import { Ingredient } from '@/types';
import { toast } from './Toast';

export default function InventoryView() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRestock, setShowRestock] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [restockQty, setRestockQty] = useState('');
  const [newIng, setNewIng] = useState({ name: '', unit: 'kg', stock: '', min_stock: '5', unit_price: '' });

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch('/api/ingredients');
    const d = await r.json();
    if (d.success) setIngredients(d.ingredients.map((i: Ingredient) => ({ ...i, stock: parseFloat(String(i.stock)) })));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const inStock = ingredients.filter(i => i.stock > 5).length;
  const lowStock = ingredients.filter(i => i.stock > 0 && i.stock <= 5).length;
  const outStock = ingredients.filter(i => i.stock === 0).length;

  async function doRestock() {
    if (!selectedId || !restockQty) { toast('Enter quantity', 'error'); return; }
    const item = ingredients.find(i => i.id === selectedId);
    if (!item) return;
    const newStock = item.stock + parseInt(restockQty);
    const r = await fetch('/api/ingredients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'restock', ingredient_id: selectedId, stock: newStock }),
    });
    const d = await r.json();
    if (d.success) {
      setIngredients(prev => prev.map(i => i.id === selectedId ? { ...i, stock: d.new_stock } : i));
      toast(`✅ ${item.name} restocked!`, 'success');
      setShowRestock(false); setRestockQty('');
    } else { toast(d.message || 'Failed', 'error'); }
  }

  async function addIngredient() {
    if (!newIng.name) { toast('Name required', 'error'); return; }
    const r = await fetch('/api/ingredients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add', ingredient: { ...newIng, stock: parseFloat(newIng.stock) || 0, min_stock: parseFloat(newIng.min_stock) || 5, unit_price: parseFloat(newIng.unit_price) || 0 } }),
    });
    const d = await r.json();
    if (d.success) { toast('✅ Ingredient added!', 'success'); setShowAdd(false); setNewIng({ name: '', unit: 'kg', stock: '', min_stock: '5', unit_price: '' }); load(); }
    else { toast(d.message || 'Failed', 'error'); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Stats */}
      <div className="grid-4">
        {[{ label: 'In Stock', val: inStock, cls: 'green' }, { label: 'Low Stock', val: lowStock, cls: 'yellow' }, { label: 'Out of Stock', val: outStock, cls: 'red' }, { label: 'Total Ingredients', val: ingredients.length, cls: 'blue' }].map(s => (
          <div key={s.label} className={`stat-card ${s.cls}`}>
            <div className="stat-label">{s.label}</div>
            <div className={`stat-value ${s.cls}`}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card">
        <div className="section-header">
          <div className="section-title">Ingredients</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(true)}>+ Add Ingredient</button>
            <button className="btn btn-accent" onClick={() => { setSelectedId(null); setShowRestock(true); }}>+ Restock</button>
          </div>
        </div>
        {loading ? <div className="empty-state">Loading...</div> : (
          <table>
            <thead><tr><th>Ingredient</th><th>Unit</th><th>Stock Level</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {!ingredients.length && <tr><td colSpan={5} className="empty-state">No ingredients found</td></tr>}
              {ingredients.map(item => {
                const pct = Math.min(100, (item.stock / 30) * 100);
                const color = item.stock === 0 ? 'var(--red)' : item.stock <= 5 ? 'var(--accent)' : 'var(--green)';
                const statusTag = item.stock === 0
                  ? <span className="tag tag-red">Out of Stock</span>
                  : item.stock <= 5 ? <span className="tag tag-yellow">Low Stock</span>
                  : <span className="tag tag-green">In Stock</span>;
                return (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 500 }}>{item.name}</td>
                    <td style={{ color: 'var(--text3)' }}>{item.unit}</td>
                    <td style={{ width: 200 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="progress-bar" style={{ flex: 1 }}><div className="progress-fill" style={{ width: `${pct}%`, background: color }} /></div>
                        <span style={{ fontSize: 13, fontWeight: 600, minWidth: 24 }}>{item.stock}</span>
                      </div>
                    </td>
                    <td>{statusTag}</td>
                    <td><button className="btn btn-ghost btn-sm" onClick={() => { setSelectedId(item.id); setShowRestock(true); }}>+ Add Stock</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Restock Modal */}
      {showRestock && (
        <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && setShowRestock(false)}>
          <div className="modal">
            <div className="modal-title">Restock Ingredient</div>
            <div className="form-group">
              <label className="form-label">Ingredient</label>
              <select className="form-input" value={selectedId ?? ''} onChange={e => setSelectedId(Number(e.target.value))}>
                <option value="">— Select ingredient —</option>
                {ingredients.map(i => <option key={i.id} value={i.id}>{i.name} (Stock: {i.stock})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Quantity to Add</label>
              <input className="form-input" type="number" min="1" placeholder="Enter quantity" value={restockQty} onChange={e => setRestockQty(e.target.value)} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowRestock(false)}>Cancel</button>
              <button className="btn btn-accent" onClick={doRestock}>Confirm Restock</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Ingredient Modal */}
      {showAdd && (
        <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="modal">
            <div className="modal-title">Add Ingredient</div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Name</label>
                <input className="form-input" placeholder="e.g. Rice" value={newIng.name} onChange={e => setNewIng(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Unit</label>
                <select className="form-input" value={newIng.unit} onChange={e => setNewIng(p => ({ ...p, unit: e.target.value }))}>
                  {['kg','g','L','mL','pc','pack','bottle','sack'].map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Initial Stock</label>
                <input className="form-input" type="number" min="0" placeholder="0" value={newIng.stock} onChange={e => setNewIng(p => ({ ...p, stock: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Min Stock Alert</label>
                <input className="form-input" type="number" min="0" placeholder="5" value={newIng.min_stock} onChange={e => setNewIng(p => ({ ...p, min_stock: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Unit Price (₱)</label>
              <input className="form-input" type="number" min="0" step="0.01" placeholder="0.00" value={newIng.unit_price} onChange={e => setNewIng(p => ({ ...p, unit_price: e.target.value }))} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn-accent" onClick={addIngredient}>Add Ingredient</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
