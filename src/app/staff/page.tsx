'use client';
import { useEffect, useState, useCallback } from 'react';
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
  cash: number;          // 0 for cashless
  payRef: string;        // '' for cash
  custName: string;
  custType: CustomerType;
  table: string;
  subtotal: number;
  discount: number;
  total: number;
  change: number;
  cart: CartItem[];
}

// ── Constants ────────────────────────────────────────────────────────────────
const METHOD_ICONS:  Record<PaymentMethod, string> = {
  cash:     '💵',
  e_wallet: '📱',
  online:   '🏦',
};
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
          subtotal, discount, total, change, cart } = payload;
  const discLabel = DISCOUNT_MAP[payload.custType].percent > 0
    ? `Discount — ${DISCOUNT_MAP[payload.custType].label}`
    : 'Discount';
  const isCash = method === 'cash';

  const cashlessNote = method === 'e_wallet'
    ? `Confirm that ₱${total.toFixed(2)} has been received in your GCash or Maya account before completing this order.`
    : `Confirm that ₱${total.toFixed(2)} has been credited to your bank account before completing this order.`;

  return (
    /* Overlay */
    <div style={styles.overlay} onClick={(e) => e.target === e.currentTarget && onBack()}>
      <div style={styles.modal}>

        {/* Header */}
        <div style={styles.header}>
          <div style={styles.methodIcon}>{METHOD_ICONS[method]}</div>
          <div style={styles.methodLabel}>{METHOD_LABELS[method]}</div>
          <div style={styles.totalAmt}>₱{total.toFixed(2)}</div>
          <div style={styles.tableTag}>{table}</div>
        </div>

        {/* Items list */}
        <div style={styles.itemsList}>
          {cart.map((item, i) => (
            <div key={i} style={styles.itemRow}>
              <span>{item.emoji || '🍽'} {item.name} ×{item.qty}</span>
              <span style={{ fontWeight: 500 }}>₱{(item.price * item.qty).toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Cash details */}
        {isCash ? (
          <div>
            <DetailRow label="Subtotal"       value={`₱${subtotal.toFixed(2)}`} />
            <DetailRow label={discLabel}      value={`-₱${discount.toFixed(2)}`} color="green" />
            <DetailRow label="Total"          value={`₱${total.toFixed(2)}`}    color="accent" bold />
            <DetailRow label="Cash Received"  value={`₱${cash.toFixed(2)}`} />
            <DetailRow label="Change"         value={`₱${change.toFixed(2)}`}   color="green" />
            <DetailRow label="Customer"       value={custName || 'Walk-in'} />
          </div>
        ) : (
          /* Cashless details */
          <div>
            <DetailRow label="Subtotal"  value={`₱${subtotal.toFixed(2)}`} />
            <DetailRow label={discLabel} value={`-₱${discount.toFixed(2)}`} color="green" />
            <DetailRow label="Total"     value={`₱${total.toFixed(2)}`}    color="accent" bold />

            {/* Reference number box */}
            <div style={styles.refBox}>
              <div style={styles.refLabel}>Reference / Transaction No.</div>
              <div style={styles.refValue}>{payRef}</div>
            </div>

            {/* Cashless info banner */}
            <div style={styles.cashlessInfo}>
              <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ flexShrink: 0, marginTop: 1 }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span>{cashlessNote}</span>
            </div>

            <DetailRow label="Customer" value={custName || 'Walk-in'} />
          </div>
        )}

        {/* Actions */}
        <div style={styles.actions}>
          <button style={{ ...styles.btn, ...styles.btnGhost }} onClick={onBack}>← Back</button>
          <button style={{ ...styles.btn, ...styles.btnAccent }} onClick={onConfirm}>✓ Confirm &amp; Complete</button>
        </div>
      </div>
    </div>
  );
}

// ── Small helper ─────────────────────────────────────────────────────────────
function DetailRow({
  label, value, color, bold,
}: { label: string; value: string; color?: 'accent' | 'green' | 'red'; bold?: boolean }) {
  const valueColor =
    color === 'accent' ? 'var(--accent)' :
    color === 'green'  ? 'var(--green)'  :
    color === 'red'    ? 'var(--red)'    :
    'var(--text)';
  return (
    <div style={styles.detailRow}>
      <span style={{ color: 'var(--text3)', fontSize: 13 }}>{label}</span>
      <span style={{ color: valueColor, fontWeight: bold ? 700 : 500, fontSize: bold ? 15 : 13 }}>{value}</span>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function StaffPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Confirmation modal state
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

  /**
   * Called by POSView when the staff clicks "Review & Confirm Payment".
   * Validates the cart/payment locally, then opens the confirmation modal.
   * POSView should expose an `onRequestCheckout` prop that fires this.
   */
  const handleRequestCheckout = useCallback((payload: CheckoutPayload) => {
    const { method, cash, payRef, cart, total } = payload;

    // Guard: empty cart
    if (!cart.length) {
      toast('Cart is empty!', 'error');
      return;
    }

    // Guard: cash validation
    if (method === 'cash') {
      if (cash <= 0) {
        toast('Please enter the cash amount received.', 'error');
        return;
      }
      if (cash < total) {
        toast(`₱${cash.toFixed(2)} received is less than the total of ₱${total.toFixed(2)}.`, 'error');
        return;
      }
    } else {
      // Guard: reference number required for cashless
      if (!payRef.trim()) {
        toast('A reference / transaction number is required for cashless payment.', 'error');
        return;
      }
    }

    // All good — open confirmation modal
    setConfirmPayload(payload);
  }, []);

  /** Called when staff clicks "Confirm & Complete" inside the modal. */
  const handleConfirm = useCallback(() => {
    setConfirmPayload(null);
    // Signal POSView to actually commit the order.
    // POSView should expose an `onConfirmCheckout` prop or you can call a shared
    // processCheckout() utility here — adapt as needed for your architecture.
    (window as Window & { processCheckout?: () => void }).processCheckout?.();
  }, []);

  const handleBack = useCallback(() => {
    setConfirmPayload(null);
  }, []);

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
        {/* Top bar */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 700 }}>
            Point of Sale
          </div>
          <span className="badge">Staff</span>
        </div>

        {/* POS content */}
        <div style={{ flex: 1, overflow: 'hidden', padding: 24, display: 'flex', flexDirection: 'column' }}>
          {/*
            Pass `onRequestCheckout` to POSView so it can trigger the two-step flow.
            POSView should call this instead of directly calling processCheckout().
            Example POSView button:
              <button onClick={() => onRequestCheckout(buildPayload())}>
                Review & Confirm Payment
              </button>
          */}
          <POSView
            username={user?.username || ''}
            onRequestCheckout={handleRequestCheckout}
          />
        </div>
      </div>

      {/* ── Payment Confirmation Modal (two-step safety gate) ── */}
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

// ── Inline styles (mirrors PHP CSS vars) ─────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.55)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: 'var(--surface)',
    borderRadius: 16,
    padding: 28,
    width: 420,
    maxWidth: '95vw',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
  },
  header: {
    textAlign: 'center',
    paddingBottom: 20,
    borderBottom: '1px solid var(--border)',
    marginBottom: 20,
  },
  methodIcon:  { fontSize: 48, marginBottom: 8 },
  methodLabel: { fontSize: 12, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 600 },
  totalAmt:    { fontFamily: "'Syne',sans-serif", fontSize: 36, fontWeight: 800, color: 'var(--accent)', margin: '4px 0' },
  tableTag:    { display: 'inline-block', background: 'var(--surface3)', color: 'var(--text2)', fontSize: 12, padding: '4px 12px', borderRadius: 20, marginTop: 4 },

  itemsList: {
    background: 'var(--surface2)',
    borderRadius: 10,
    padding: '12px 14px',
    margin: '14px 0',
    maxHeight: 140,
    overflowY: 'auto',
  },
  itemRow: {
    display: 'flex', justifyContent: 'space-between',
    fontSize: 12, padding: '3px 0', color: 'var(--text2)',
  },

  detailRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 0', borderBottom: '1px solid var(--border)',
  },

  refBox: {
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '12px 14px',
    margin: '14px 0',
  },
  refLabel: { fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  refValue: { fontSize: 14, fontWeight: 600, color: 'var(--accent)', wordBreak: 'break-all' },

  cashlessInfo: {
    background: 'rgba(91,191,138,0.08)',
    border: '1px solid rgba(91,191,138,0.2)',
    borderRadius: 10,
    padding: '12px 14px',
    margin: '14px 0',
    fontSize: 12,
    color: 'var(--green)',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
  },

  actions: { display: 'flex', gap: 10, marginTop: 20 },
  btn: {
    flex: 1, padding: '13px 0',
    fontSize: 14, fontWeight: 600,
    border: 'none', borderRadius: 10,
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  btnGhost:  { background: 'var(--surface2)', color: 'var(--text)' },
  btnAccent: { background: 'var(--accent)',   color: '#fff' },
};
