'use client';
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import POSView from '@/components/POSView';
import { ToastContainer } from '@/components/Toast';

const NAV = [
  { page: 'pos', label: 'Point of Sale', icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg> },
];

export default function StaffPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  if (status === 'loading') return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text3)' }}>Loading...</div>;

  const user = session?.user as { username: string; role: string } | undefined;

  return (
    <div className="app">
      <Sidebar items={NAV} activePage="pos" onNavigate={() => {}} username={user?.username || ''} role="Staff" />
      <div className="main">
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 700 }}>Point of Sale</div>
          <span className="badge">Staff</span>
        </div>
        <div style={{ flex: 1, overflow: 'hidden', padding: 24, display: 'flex', flexDirection: 'column' }}>
          <POSView username={user?.username || ''} />
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}
