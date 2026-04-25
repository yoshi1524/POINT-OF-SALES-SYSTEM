'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import POSView from '@/components/POSView';
import MenuManagement from '@/components/MenuManagement';
import InventoryView from '@/components/InventoryView';
import ReportsView from '@/components/ReportsView';
import { ToastContainer } from '@/components/Toast';

const NAV = [
  { page: 'menu',      label: 'Menu Management', icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg> },
  { page: 'inventory', label: 'Inventory',       icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg> },
  { page: 'reports',   label: 'Sales Reports',   icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg> },
  //{ page: 'pos',       label: 'POS',             icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg> },
];

export default function ManagerPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [page, setPage] = useState('menu');

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    const u = session?.user as { role?: string } | undefined;
    if (status === 'authenticated' && u?.role !== 'manager') router.push('/login');
  }, [status, session, router]);

  if (status === 'loading') return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text3)' }}>Loading...</div>;

  const user = session?.user as { username: string; role: string } | undefined;

  return (
    <div className="app">
      <Sidebar items={NAV} activePage={page} onNavigate={setPage} username={user?.username || ''} role="Manager" />
      <div className="main">
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 700 }}>
            {NAV.find(n => n.page === page)?.label}
          </div>
          <span className="badge">Manager</span>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: 24, display: 'flex', flexDirection: 'column' }}>
          {page === 'menu'      && <MenuManagement />}
          {page === 'inventory' && <InventoryView />}
          {page === 'reports'   && <ReportsView isAdmin={false} />}
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}
