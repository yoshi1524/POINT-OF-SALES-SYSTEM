'use client';
import Image from 'next/image';
import Clock from './Clock';
import { signOut } from 'next-auth/react';

interface NavItem { label: string; page: string; icon: React.ReactNode; }
interface Props { items: NavItem[]; activePage: string; onNavigate: (p: string) => void; username: string; role: string; }

export default function Sidebar({ items, activePage, onNavigate, username, role }: Props) {
  return (
    <div className="sidebar">
      <div className="logo">
        <div className="logo-text">Countryside</div>
        <div className="logo-sub">POS System</div>
      </div>
      <nav className="nav">
        {items.map(item => (
          <button key={item.page} className={`nav-item${activePage === item.page ? ' active' : ''}`} onClick={() => onNavigate(item.page)}>
            {item.icon}{item.label}
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <Clock />
        <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text2)', fontWeight: 500 }}>{username}</div>
        <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1 }}>{role}</div>
        <button className="btn btn-ghost btn-sm" style={{ marginTop: 10, width: '100%', justifyContent: 'center' }}
          onClick={() => signOut({ callbackUrl: '/login' })}>Logout</button>
      </div>
    </div>
  );
}
