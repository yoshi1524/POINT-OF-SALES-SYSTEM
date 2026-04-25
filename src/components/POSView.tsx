'use client';
import { useState, useEffect, useCallback } from 'react';
import { MenuItem, CartItem } from '@/types';
import { toast } from './Toast';

interface Props { username: string; }

const DISCOUNT_MAP: Record<string, { percent: number; label: string }> = {
  regular: { percent: 0,  label: 'Regular' },
  pwd:     { percent: 20, label: 'PWD (20%)' },
  senior:  { percent: 20, label: 'Senior Citizen (20%)' },
};

const TABLES = ['Walk-in','Table 1','Table 2','Table 3','Table 4','Table 5','Table 6','Table 7','Table 8','Takeout','Delivery'];

export default function POSView({ username }: Props) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [customerType, setCustomerType] = useState('regular');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [cashInput, setCashInput] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [tableSelect, setTableSelect] = useState('Walk-in');
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastTx, setLastTx] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  const loadMenu = useCallback(async () => {
    const r = await fetch('/api/menu');
    const d = await r.json();
    if (d.success) setMenuItems(d.items);
  }, []);

  useEffect(() => { loadMenu(); }, [loadMenu]);

  const categories = ['all', ...Array.from(new Set(menuItems.map(i => i.category)))];
  const filtered = menuItems.filter(i =>
    (activeCategory === 'all' || i.category === activeCategory) &&
    (i.name.toLowerCase().includes(search.toLowerCase()) || i.category.toLowerCase().includes(search.toLowerCase()))
  );

  function addToCart(item: MenuItem) {
    if (item.status === 'unavailable' || item.stock === 0) return;
    setCart(prev => {
      const ex = prev.find(c => c.id === item.id);
      if (ex) {
        if (ex.qty >= item.stock) { toast('Max stock reached!', 'error'); return prev; }
        return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      }
      return [...prev, { id: item.id, name: item.name, price: item.price, qty: 1, emoji: item.emoji || '🍽' }];
    });
    toast(`${item.emoji || '🍽'} ${item.name} added!`, 'success');
  }

  function changeQty(id: number, delta: number) {
    setCart(prev => prev
      .map(c => c.id === id ? { ...c, qty: c.qty + delta } : c)
      .filter(c => c.qty > 0)
    );
  }

  const disc = DISCOUNT_MAP[customerType] || DISCOUNT_MAP.regular;
  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const discount = subtotal * (disc.percent / 100);
  const total = subtotal - discount;
  const cash = parseFloat(cashInput) || 0;
  const change = cash - total;

  async function processCheckout() {
    if (!cart.length) { toast('Cart is empty!', 'error'); return; }
    if (paymentMethod === 'cash' && cash > 0 && cash < total) { toast('Insufficient cash!', 'error'); return; }
    if (paymentMethod !== 'cash' && !paymentRef) { toast('Payment reference required!', 'error'); return; }
    setLoading(true);
    const tx = {
      table: tableSelect, items: cart, subtotal, discount, total,
      customer_type: customerType, discount_percent: disc.percent, discount_label: disc.label,
      cash: paymentMethod === 'cash' ? cash : total, change: paymentMethod === 'cash' ? change : 0,
      payment_method: paymentMethod, payment_reference: paymentRef, customer_name: customerName,
      time: new Date().toISOString(),
    };
    const r = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order: tx }) });
    const d = await r.json();
    setLoading(false);
    if (!d.success) { toast(d.message || 'Order failed', 'error'); return; }
    setLastTx({ ...tx, id: d.order_id, order_number: d.order_number });
    setShowReceipt(true);
    setCart([]);
    setCashInput(''); setPaymentRef(''); setCustomerName(''); setCustomerType('regular'); setPaymentMethod('cash');
    loadMenu();
    toast('✅ Order saved!', 'success');
  }

  return (
    <div className="pos-layout" style={{ height: '100%' }}>
      {/* MENU PANEL */}
      <div className="menu-panel">
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input className="input-sm" placeholder="Search menu..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1 }} />
        </div>
        <div className="category-tabs">
          {categories.map(cat => (
            <button key={cat} className={`cat-tab${activeCategory === cat ? ' active' : ''}`} onClick={() => setActiveCategory(cat)}>
              {cat === 'all' ? 'All' : cat}
            </button>
          ))}
        </div>
        <div className="menu-grid">
          {!filtered.length && <div className="empty-state" style={{ gridColumn: '1/-1' }}>No items found</div>}
          {filtered.map(item => {
            const unavail = item.status === 'unavailable' || item.stock === 0;
            const stockStatus = item.stock === 0 ? 'out' : item.stock <= 5 ? 'low' : '';
            return (
              <div key={item.id} className={`menu-item${unavail ? ' unavailable' : ''}`} onClick={() => !unavail && addToCart(item)}>
                <span className="menu-emoji">{item.emoji || '🍽'}</span>
                <div className="menu-cat-badge">{item.category}</div>
                <div className="menu-name">{item.name}</div>
                <div className="menu-price">₱{item.price.toFixed(2)}</div>
                <div className={`menu-stock ${stockStatus}`}>
                  {item.stock === 0 ? 'Out of stock' : item.stock <= 5 ? `Low stock: ${item.stock}` : `Stock: ${item.stock}`}
                </div>
                {unavail && <div style={{ position: 'absolute', top: 8, right: 8, fontSize: 10, background: 'var(--surface3)', padding: '2px 6px', borderRadius: 4, color: 'var(--text3)' }}>{item.stock === 0 ? 'OUT' : 'OFF'}</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* CART PANEL */}
      <div className="cart-panel">
        <div className="cart-header">
          <div className="cart-header-row">
            <div className="cart-title">Current Order</div>
            <button className="btn btn-ghost btn-sm" onClick={() => setCart([])}>Clear</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
            <label style={{ fontSize: 12, color: 'var(--text3)' }}>Table</label>
            <select className="input-sm" value={tableSelect} onChange={e => setTableSelect(e.target.value)}>
              {TABLES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="cart-items">
          {!cart.length
            ? <div className="cart-empty"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{width:48,height:48,opacity:.3}}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg><span>Cart is empty</span></div>
            : cart.map(c => (
              <div key={c.id} className="cart-item">
                <span style={{ fontSize: 24 }}>{c.emoji}</span>
                <div className="cart-item-info">
                  <div className="cart-item-name">{c.name}</div>
                  <div className="cart-item-price">₱{(c.price * c.qty).toFixed(2)}</div>
                </div>
                <div className="qty-ctrl">
                  <button className="qty-btn" onClick={() => changeQty(c.id, -1)}>−</button>
                  <span className="qty-num">{c.qty}</span>
                  <button className="qty-btn" onClick={() => changeQty(c.id, 1)}>+</button>
                </div>
              </div>
            ))
          }
        </div>

        <div className="cart-footer">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Customer Type</label>
            <select className="form-input" style={{ padding: '8px 12px' }} value={customerType} onChange={e => setCustomerType(e.target.value)}>
              <option value="regular">Regular</option>
              <option value="pwd">PWD (20% off)</option>
              <option value="senior">Senior Citizen (20% off)</option>
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Payment Method</label>
            <select className="form-input" style={{ padding: '8px 12px' }} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
              <option value="cash">Cash</option>
              <option value="e_wallet">E-Wallet</option>
              <option value="online">Online Bank</option>
            </select>
          </div>
          {paymentMethod === 'cash'
            ? <input className="form-input" type="number" placeholder="Cash received" value={cashInput} onChange={e => setCashInput(e.target.value)} style={{ padding: '8px 12px' }} />
            : <input className="form-input" placeholder={paymentMethod === 'e_wallet' ? 'E-Wallet reference' : 'Transaction ID'} value={paymentRef} onChange={e => setPaymentRef(e.target.value)} style={{ padding: '8px 12px' }} />
          }
          <input className="form-input" placeholder="Customer name (optional)" value={customerName} onChange={e => setCustomerName(e.target.value)} style={{ padding: '8px 12px' }} />
          <div className="cart-line"><span>Subtotal</span><span>₱{subtotal.toFixed(2)}</span></div>
          {discount > 0 && <div className="cart-line"><span>{disc.label}</span><span style={{ color: 'var(--green)' }}>-₱{discount.toFixed(2)}</span></div>}
          <div className="cart-total"><span>Total</span><span>₱{total.toFixed(2)}</span></div>
          {paymentMethod === 'cash' && cash > 0 && (
            <div className="cart-line"><span>Change</span><span style={{ color: change >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>{change >= 0 ? '₱' : '-₱'}{Math.abs(change).toFixed(2)}</span></div>
          )}
          <button className="btn btn-accent" style={{ width: '100%', justifyContent: 'center', padding: '13px 18px' }} onClick={processCheckout} disabled={loading || !cart.length}>
            {loading ? 'Processing...' : 'Checkout →'}
          </button>
        </div>
      </div>

      {/* RECEIPT MODAL */}
      {showReceipt && lastTx && (
        <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && setShowReceipt(false)}>
          <div className="modal receipt-modal">
            <div className="receipt-header">
              <div className="receipt-logo">Countryside</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>Point of Sale Receipt</div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>Order: {lastTx.order_number as string}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>Table: {lastTx.table as string}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>{new Date(lastTx.time as string).toLocaleString('en-PH')}</div>
            <hr className="receipt-divider" />
            {(lastTx.items as CartItem[]).map((item, i) => (
              <div key={i} className="receipt-row"><span>{item.emoji} {item.name} x{item.qty}</span><span>₱{(item.price * item.qty).toFixed(2)}</span></div>
            ))}
            <hr className="receipt-divider" />
            <div className="receipt-row"><span>Subtotal</span><span>₱{(lastTx.subtotal as number).toFixed(2)}</span></div>
            {(lastTx.discount as number) > 0 && <div className="receipt-row"><span>{lastTx.discount_label as string}</span><span>-₱{(lastTx.discount as number).toFixed(2)}</span></div>}
            <div className="receipt-total"><span>Total</span><span>₱{(lastTx.total as number).toFixed(2)}</span></div>
            <div className="receipt-payment">
              <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 4 }}>Cash: ₱{(lastTx.cash as number).toFixed(2)}</div>
              <div className="receipt-change">Change: ₱{(lastTx.change as number).toFixed(2)}</div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => window.print()}>Print</button>
              <button className="btn btn-accent" onClick={() => setShowReceipt(false)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
