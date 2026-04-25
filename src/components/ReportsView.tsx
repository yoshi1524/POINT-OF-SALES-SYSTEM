'use client';
import { useState, useEffect, useCallback } from 'react';

interface ReportData {
  summary: Record<string, number>;
  branches: Array<Record<string, unknown>>;
  daily: Array<Record<string, unknown>>;
  top_items: Array<Record<string, unknown>>;
  recent: Array<Record<string, unknown>>;
}

const fmt = (n: unknown) => `₱${parseFloat(String(n || 0)).toFixed(2)}`;
const COLORS = ['var(--accent)', 'var(--green)', 'var(--blue)', '#b07ff0', '#e05c9a'];

interface Props { isAdmin: boolean; }

export default function ReportsView({ isAdmin }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const firstDay = today.slice(0, 8) + '01';
  const [dateFrom, setDateFrom] = useState(firstDay);
  const [dateTo, setDateTo] = useState(today);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/reports?from=${dateFrom}&to=${dateTo}`);
    const d = await r.json();
    if (d.success) setData(d);
    setLoading(false);
  }, [dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const summary = data?.summary || {};
  const totalRev = isAdmin ? (data?.branches || []).reduce((s, b) => s + parseFloat(String(b.total_revenue || 0)), 0) : parseFloat(String(summary.total_revenue || 0));
  const totalOrd = isAdmin ? (data?.branches || []).reduce((s, b) => s + parseInt(String(b.total_orders || 0)), 0) : parseInt(String(summary.total_orders || 0));
  const totalDisc = isAdmin ? (data?.branches || []).reduce((s, b) => s + parseFloat(String(b.total_discounts || 0)), 0) : parseFloat(String(summary.total_discounts || 0));
  const avgVal = totalOrd ? totalRev / totalOrd : 0;

  const topItems = data?.top_items || [];
  const maxQty = Math.max(...topItems.map(i => parseInt(String(i.qty_sold || 0))), 1);
  const recent = data?.recent || [];
  const cashTotal = isAdmin ? (data?.branches || []).reduce((s,b)=>s+parseFloat(String(b.cash_sales||0)),0) : parseFloat(String(summary.cash_sales||0));
  const ewalletTotal = isAdmin ? (data?.branches||[]).reduce((s,b)=>s+parseFloat(String(b.ewallet_sales||0)),0) : parseFloat(String(summary.ewallet_sales||0));
  const onlineTotal = isAdmin ? (data?.branches||[]).reduce((s,b)=>s+parseFloat(String(b.online_sales||0)),0) : parseFloat(String(summary.online_sales||0));
  const maxPay = Math.max(cashTotal, ewalletTotal, onlineTotal, 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Date filter */}
      <div className="card" style={{ padding: '14px 20px' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label className="form-label" style={{ margin: 0 }}>From</label>
            <input className="form-input" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ padding: '8px 12px', width: 160 }} />
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label className="form-label" style={{ margin: 0 }}>To</label>
            <input className="form-input" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ padding: '8px 12px', width: 160 }} />
          </div>
          <button className="btn btn-accent btn-sm" onClick={load}>Apply</button>
        </div>
      </div>

      {loading ? <div className="empty-state">Loading reports...</div> : <>
        {/* Summary stats */}
        <div className="grid-4">
          {[{ label: 'Total Revenue', val: fmt(totalRev), cls: 'accent' }, { label: 'Total Orders', val: totalOrd, cls: 'blue' }, { label: 'Avg Order Value', val: fmt(avgVal), cls: 'green' }, { label: 'Total Discounts', val: fmt(totalDisc), cls: 'red' }].map(s => (
            <div key={s.label} className={`stat-card ${s.cls}`}>
              <div className="stat-label">{s.label}</div>
              <div className={`stat-value ${s.cls}`} style={{ fontSize: 22 }}>{s.val}</div>
              <div className="stat-sub">{isAdmin ? `Across ${(data?.branches || []).length} branch(es)` : 'This branch'}</div>
            </div>
          ))}
        </div>

        {/* Admin: per-branch cards */}
        {isAdmin && (
          <div className="grid-3">
            {!(data?.branches || []).length
              ? <div className="card" style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text3)', padding: 32 }}>No sales data for this period.</div>
              : (data?.branches || []).map((b, idx) => {
                const color = COLORS[idx % COLORS.length];
                const pct = totalRev > 0 ? ((parseFloat(String(b.total_revenue)) / totalRev) * 100).toFixed(1) : '0.0';
                return (
                  <div key={idx} className="card" style={{ borderLeft: `3px solid ${color}`, borderRadius: '0 var(--radius) var(--radius) 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 700 }}>{b.branch_name as string}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{pct}% of total revenue</div>
                      </div>
                      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800, color }}>{fmt(b.total_revenue)}</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
                      {[{ label: 'Orders', val: b.total_orders }, { label: 'Avg Order', val: fmt(b.avg_order_value) }, { label: 'Discounts', val: fmt(b.total_discounts) }, { label: 'Cash Sales', val: fmt(b.cash_sales) }].map(x => (
                        <div key={x.label} style={{ background: 'var(--surface2)', borderRadius: 8, padding: 8 }}>
                          <div style={{ color: 'var(--text3)' }}>{x.label}</div>
                          <div style={{ fontWeight: 700, marginTop: 2 }}>{x.val as string}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            }
          </div>
        )}

        <div className="grid-2">
          {/* Top Items */}
          <div className="card">
            <div className="card-title">Top Selling Items</div>
            {!topItems.length ? <div className="empty-state">No sales data yet.</div>
              : topItems.map((i, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 12, color: 'var(--text3)', minWidth: 16 }}>{idx + 1}</span>
                  <span style={{ fontSize: 18 }}>{(i.emoji as string) || '🍽'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{i.item_name as string}</div>
                    <div className="progress-bar"><div className="progress-fill" style={{ width: `${(parseInt(String(i.qty_sold)) / maxQty) * 100}%`, background: 'var(--accent)' }} /></div>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text2)' }}>{i.qty_sold as number} sold</span>
                </div>
              ))
            }
          </div>

          {/* Payment breakdown */}
          <div className="card">
            <div className="card-title">Payment Methods</div>
            {[{ label: 'Cash', val: cashTotal, color: 'var(--accent)' }, { label: 'E-Wallet', val: ewalletTotal, color: 'var(--green)' }, { label: 'Online Bank', val: onlineTotal, color: 'var(--blue)' }].map(p => (
              <div key={p.label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 13, minWidth: 110, color: 'var(--text2)' }}>{p.label}</span>
                <div className="progress-bar" style={{ flex: 1 }}><div className="progress-fill" style={{ width: `${(p.val / maxPay) * 100}%`, background: p.color }} /></div>
                <span style={{ fontSize: 13, fontWeight: 600, minWidth: 80, textAlign: 'right' }}>{fmt(p.val)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Daily sales */}
        <div className="card">
          <div className="card-title">Daily Sales Breakdown</div>
          <table>
            <thead><tr><th>Date</th>{isAdmin && <th>Branch</th>}<th>Orders</th><th>Revenue</th></tr></thead>
            <tbody>
              {!(data?.daily || []).length
                ? <tr><td colSpan={isAdmin ? 4 : 3} className="empty-state">No data for this period.</td></tr>
                : (data?.daily || []).map((d, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{d.sale_date as string}</td>
                    {isAdmin && <td><span className="tag tag-yellow" style={{ fontSize: 10 }}>{d.branch_name as string}</span></td>}
                    <td>{d.orders as number}</td>
                    <td style={{ color: 'var(--accent)', fontWeight: 700 }}>{fmt(d.revenue)}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>

        {/* Recent transactions */}
        <div className="card">
          <div className="card-title">Recent Transactions</div>
          <table>
            <thead>
              <tr>
                <th>Order #</th>
                {isAdmin && <th>Branch</th>}
                <th>Table</th><th>Cashier</th><th>Total</th><th>Payment</th><th>Time</th>
              </tr>
            </thead>
            <tbody>
              {!recent.length
                ? <tr><td colSpan={isAdmin ? 7 : 6} className="empty-state">No transactions.</td></tr>
                : recent.map((t, i) => (
                  <tr key={i}>
                    <td style={{ color: 'var(--text3)', fontSize: 11 }}>{t.order_number as string}</td>
                    {isAdmin && <td><span className="tag tag-yellow" style={{ fontSize: 10 }}>{t.branch_name as string}</span></td>}
                    <td>{t.table_name as string}</td>
                    <td style={{ color: 'var(--text3)' }}>{(t.username as string) || '—'}</td>
                    <td style={{ color: 'var(--accent)', fontWeight: 700 }}>{fmt(t.total)}</td>
                    <td>{t.payment_method === 'cash' ? '💵' : t.payment_method === 'e_wallet' ? '📱' : '🏦'} {t.payment_method as string}</td>
                    <td style={{ color: 'var(--text3)', fontSize: 12 }}>{new Date(t.created_at as string).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </>}
    </div>
  );
}
