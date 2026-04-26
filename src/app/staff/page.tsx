'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import POSView from '@/components/POSView';
import { ToastContainer, toast } from '@/components/Toast';

// ── Types ────────────────────────────────────────────────────────────────────
type PaymentMethod = 'cash' | 'e_wallet' | 'online';
type CustomerType  = 'regular' | 'pwd' | 'senior';

interface CartItem {
  name: string;
  emoji?: string;
  price: number;
  qty: number;
}

export interface CheckoutPayload {
  method: PaymentMethod;
  cash: number;
  payRef: string;
  custName: string;
  custType: CustomerType;
  table: string;
  subtotal: number;
  discount: number;
  total: number;
  change: number;
  cart: CartItem[];
}

// ── Single source of truth for validation ────────────────────────────────────
// Returns an error string, or null if the payload is valid.
// Called at Gate 1 (before modal opens) AND Gate 2 (before processCheckout fires).
function validatePayload(payload: CheckoutPayload): string | null {
  const { method, cash, payRef, cart, total } = payload;

  if (!cart.length)
    return 'Cart is empty.';

  if (total <= 0)
    return 'Order total must be greater than ₱0.00.';

  if (method === 'cash') {
    if (!cash || cash <= 0)
      return 'Please enter the cash amount received.';
    if (cash < total)
      return `Cash received (₱${cash.toFixed(2)}) is less than the total (₱${total.toFixed(2)}).`;
  } else {
    if (!payRef || !payRef.trim())
      return 'A reference / transaction number is required for cashless payment.';
    if (payRef.trim().length < 4)
      return 'Reference number seems too short — please double-check.';
  }

  return null;
}

// ── Constants ────────────────────────────────────────────────────────────────
const METHOD_ICONS:  Record<PaymentMethod, string> = { cash: '💵', e_wallet: '📱', online: '🏦' };
const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash:     'Cash Payment',
  e_wallet: 'E-Wallet · GCash / Maya',
  online:   'Online Bank Transfer',
};
const DISCOUNT_MAP: Record<CustomerType, { label: string; percent: number }> = {
  regular: { label: 'None',             percent: 0  },
  pwd:     { label: 'PWD (20% off)',    percent: 20 },
  senior:  { label: 'Senior (20% off)', percent: 20 },
};

const NAV = [
  {
    page: 'pos',
    label: 'Point of Sale',
    icon: (
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
      </svg>
    ),
  },
];

// ── Payment Confirmation Modal ───────────────────────────────────────────────
interface PayConfirmModalProps {
  payload: CheckoutPayload;
  onConfirm: () => void;
  onBack: () => void;
}

function PayConfirmModal({ payload, onConfirm, onBack }: PayConfirmModalProps) {
  const { method, cash, payRef, custName, table,
          subtotal, discount, total, change, cart, custType } = payload;

  // Staff must tick this before the Confirm button is active
  const [acknowledged, setAcknowledged] = useState(false);
  // Error shown inline inside the modal (Gate 2 failures surface here)
  const [modalError, setModalError]     = useState<string | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  const isCash    = method === 'cash';
  const discLabel = DISCOUNT_MAP[custType].percent > 0
    ? `Discount — ${DISCOUNT_MAP[custType].label}`
    : 'Discount';
  const cashlessNote = method === 'e_wallet'
    ? `Confirm that ₱${total.toFixed(2)} has been received in your GCash or Maya account before completing this order.`
    : `Confirm that ₱${total.toFixed(2)} has been credited to your bank account before completing this order.`;

  // Gate 2 lives here — re-validates the frozen payload before onConfirm fires
  function handleConfirmClick() {
    setModalError(null);

    if (!acknowledged) {
      setModalError('Please tick the confirmation checkbox before proceeding.');
      return;
    }

    const err = validatePayload(payload);
    if (err) {
      setModalError(`⚠️ ${err}`);
      return;
    }

    onConfirm(); // only reaches here if both checks pass
  }

  return (
    <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && onBack()}>
      <div style={s.modal}>

        {/* Header */}
        <div style={s.header}>
          <div style={s.methodIcon}>{METHOD_ICONS[method]}</div>
          <div style={s.methodLabel}>{METHOD_LABELS[method]}</div>
          <div style={s.totalAmt}>₱{total.toFixed(2)}</div>
          <div style={s.tableTag}>{table}</div>
        </div>

        {/* Items */}
        <div style={s.itemsList}>
          {cart.map((item, i) => (
            <div key={i} style={s.itemRow}>
              <span>{item.emoji || '🍽'} {item.name} ×{item.qty}</span>
              <span style={{ fontWeight: 500 }}>₱{(item.price * item.qty).toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Cash breakdown */}
        {isCash ? (
          <div>
            <DetailRow label="Subtotal"      value={`₱${subtotal.toFixed(2)}`} />
            <DetailRow label={discLabel}     value={`-₱${discount.toFixed(2)}`} color="green" />
            <DetailRow label="Total"         value={`₱${total.toFixed(2)}`}    color="accent" bold />
            <DetailRow label="Cash Received" value={`₱${cash.toFixed(2)}`} />
            <DetailRow label="Change"        value={`₱${change.toFixed(2)}`}   color="green" />
            <DetailRow label="Customer"      value={custName || 'Walk-in'} />
          </div>
        ) : (
          /* Cashless breakdown */
          <div>
            <DetailRow label="Subtotal"  value={`₱${subtotal.toFixed(2)}`} />
            <DetailRow label={discLabel} value={`-₱${discount.toFixed(2)}`} color="green" />
            <DetailRow label="Total"     value={`₱${total.toFixed(2)}`}    color="accent" bold />
            <div style={s.refBox}>
              <div style={s.refLabel}>Reference / Transaction No.</div>
              <div style={s.refValue}>{payRef}</div>
            </div>
            <div style={s.cashlessInfo}>
              <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ flexShrink: 0, marginTop: 1 }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span>{cashlessNote}</span>
            </div>
            <DetailRow label="Customer" value={custName || 'Walk-in'} />
          </div>
        )}

        {/* ── Acknowledgement checkbox (active barrier) ── */}
        <label style={{ ...s.ackRow, ...(acknowledged ? s.ackRowChecked : {}) }}>
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => { setAcknowledged(e.target.checked); setModalError(null); }}
            style={{ width: 16, height: 16, flexShrink: 0, accentColor: 'var(--accent)', cursor: 'pointer' }}
          />
          <span style={{ fontSize: 13, lineHeight: 1.5 }}>
            {isCash
              ? `I confirm I have collected ₱${cash.toFixed(2)} and returned ₱${change.toFixed(2)} in change to the customer.`
              : `I confirm ₱${total.toFixed(2)} has been received via ${METHOD_LABELS[method]} — ref. no. ${payRef}.`
            }
          </span>
        </label>

        {/* Inline error (Gate 2) */}
        {modalError && <div style={s.errorBanner}>{modalError}</div>}

        {/* Actions */}
        <div style={s.actions}>
          <button style={{ ...s.btn, ...s.btnGhost }} onClick={onBack}>← Back</button>
          <button
            ref={confirmBtnRef}
            style={{ ...s.btn, ...s.btnAccent, opacity: acknowledged ? 1 : 0.4, cursor: acknowledged ? 'pointer' : 'not-allowed' }}
            onClick={handleConfirmClick}
          >
            ✓ Confirm &amp; Complete
          </button>
        </div>

      </div>
    </div>
  );
}

// ── Detail row helper ────────────────────────────────────────────────────────
function DetailRow({ label, value, color, bold }:
  { label: string; value: string; color?: 'accent' | 'green' | 'red'; bold?: boolean }) {
  const valueColor =
    color === 'accent' ? 'var(--accent)' :
    color === 'green'  ? 'var(--green)'  :
    color === 'red'    ? 'var(--red)'    : 'var(--text)';
  return (
    <div style={s.detailRow}>
      <span style={{ color: 'var(--text3)', fontSize: 13 }}>{label}</span>
      <span style={{ color: valueColor, fontWeight: bold ? 700 : 500, fontSize: bold ? 15 : 13 }}>{value}</span>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function StaffPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [confirmPayload, setConfirmPayload] = useState<CheckoutPayload | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
                    height: '100vh', color: 'var(--text3)' }}>
        Loading...
      </div>
    );
  }

  const user = session?.user as { username: string; role: string } | undefined;

  // ── Gate 1: runs when POSView fires onRequestCheckout ────────────────────
  const handleRequestCheckout = useCallback((payload: CheckoutPayload) => {
    const err = validatePayload(payload);
    if (err) {
      toast(`⚠️ ${err}`, 'error');
      return;
    }
    setConfirmPayload(payload); // only opens modal if payload is valid
  }, []);

  // ── Gate 3: final guard before processCheckout is ever called ────────────
  // (Gate 2 lives inside the modal's handleConfirmClick)
  const handleConfirm = useCallback(() => {
    if (!confirmPayload) return;

    const err = validatePayload(confirmPayload);
    if (err) {
      toast(`⚠️ ${err}`, 'error');
      setConfirmPayload(null);
      return;
    }

    setConfirmPayload(null);
    (window as Window & { processCheckout?: () => void }).processCheckout?.();
  }, [confirmPayload]);

  const handleBack = useCallback(() => setConfirmPayload(null), []);

  return (
    <div className="app">
      <Sidebar
        items={NAV}
        activePage="pos"
        onNavigate={() => {}}
        username={user?.username || ''}
        role="Staff"
      />

      <div className="main">
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 700 }}>
            Point of Sale
          </div>
          <span className="badge">Staff</span>
        </div>

        <div style={{ flex: 1, overflow: 'hidden', padding: 24, display: 'flex', flexDirection: 'column' }}>
          <POSView
            username={user?.username || ''}
            onRequestCheckout={handleRequestCheckout}
          />
        </div>
      </div>

      {confirmPayload && (
        <PayConfirmModal
          payload={confirmPayload}
          onConfirm={handleConfirm}
          onBack={handleBack}
        />
      )}

      <ToastContainer />
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  overlay:     { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal:       { background: 'var(--surface)', borderRadius: 16, padding: 28, width: 420, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.4)' },
  header:      { textAlign: 'center', paddingBottom: 20, borderBottom: '1px solid var(--border)', marginBottom: 20 },
  methodIcon:  { fontSize: 48, marginBottom: 8 },
  methodLabel: { fontSize: 12, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 600 },
  totalAmt:    { fontFamily: "'Syne',sans-serif", fontSize: 36, fontWeight: 800, color: 'var(--accent)', margin: '4px 0' },
  tableTag:    { display: 'inline-block', background: 'var(--surface3)', color: 'var(--text2)', fontSize: 12, padding: '4px 12px', borderRadius: 20, marginTop: 4 },
  itemsList:   { background: 'var(--surface2)', borderRadius: 10, padding: '12px 14px', margin: '14px 0', maxHeight: 140, overflowY: 'auto' },
  itemRow:     { display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0', color: 'var(--text2)' },
  detailRow:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' },
  refBox:      { background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', margin: '14px 0' },
  refLabel:    { fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  refValue:    { fontSize: 14, fontWeight: 600, color: 'var(--accent)', wordBreak: 'break-all' },
  cashlessInfo:{ background: 'rgba(91,191,138,0.08)', border: '1px solid rgba(91,191,138,0.2)', borderRadius: 10, padding: '12px 14px', margin: '14px 0', fontSize: 12, color: 'var(--green)', display: 'flex', alignItems: 'flex-start', gap: 8 },
  ackRow:      { display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 18, padding: '12px 14px', borderRadius: 10, cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text2)', transition: 'border-color 0.15s, background 0.15s' },
  ackRowChecked:{ border: '1px solid var(--accent)', background: 'rgba(91,140,191,0.07)', color: 'var(--text)' },
  errorBanner: { marginTop: 10, padding: '10px 14px', borderRadius: 10, background: 'rgba(224,92,92,0.1)', border: '1px solid rgba(224,92,92,0.3)', fontSize: 12, color: 'var(--red)' },
  actions:     { display: 'flex', gap: 10, marginTop: 16 },
  btn:         { flex: 1, padding: '13px 0', fontSize: 14, fontWeight: 600, border: 'none', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'opacity 0.15s' },
  btnGhost:    { background: 'var(--surface2)', color: 'var(--text)', cursor: 'pointer' },
  btnAccent:   { background: 'var(--accent)', color: '#fff' },
};
