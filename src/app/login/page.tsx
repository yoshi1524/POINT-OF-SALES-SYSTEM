'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await signIn('credentials', { username, password, redirect: false });
    setLoading(false);
    if (!res?.ok) { setError(res?.error || 'Invalid credentials.'); return; }
    const sessionRes = await fetch('/api/me');
    const session = await sessionRes.json();
    const role = session?.role;
    if (role === 'admin') router.push('/admin');
    else if (role === 'manager') router.push('/manager');
    else router.push('/staff');
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div className="card" style={{ padding: 40, borderRadius: 16 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <Image src="/cside-v2.png" alt="Countryside" width={160} height={160} style={{ objectFit: 'contain', marginBottom: 8 }} />
            <div style={{ fontSize: 12, color: 'var(--text3)', letterSpacing: 2, textTransform: 'uppercase' }}>Point of Sale System</div>
          </div>
          {error && <div className="notice error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input className="form-input" type="text" placeholder="Enter username" value={username} onChange={e => setUsername(e.target.value)} required autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" placeholder="Enter password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <button className="btn btn-accent" type="submit" disabled={loading} style={{ width: '100%', marginTop: 12, justifyContent: 'center', padding: '13px 18px' }}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text3)', textAlign: 'center' }}>
          </div>
        </div>
      </div>
    </div>
  );
}
