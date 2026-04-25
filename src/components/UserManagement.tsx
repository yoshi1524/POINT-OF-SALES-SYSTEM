'use client';
import { useState, useEffect, useCallback } from 'react';
import { User } from '@/types';
import { toast } from './Toast';

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', role: 'staff' });

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch('/api/users');
    const d = await r.json();
    if (d.success) setUsers(d.users);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function createUser() {
    if (!form.username || !form.password) { toast('All fields required', 'error'); return; }
    const r = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', ...form }),
    });
    const d = await r.json();
    if (d.success) { toast('✅ User created!', 'success'); setShowModal(false); setForm({ username: '', password: '', role: 'staff' }); load(); }
    else { toast(d.message || 'Failed', 'error'); }
  }

  async function archiveUser(id: number, username: string) {
    if (!confirm(`Archive user "${username}"? They will no longer be able to log in.`)) return;
    const r = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'archive', user_id: id }),
    });
    const d = await r.json();
    if (d.success) { toast('User archived.', 'info'); load(); }
    else { toast(d.message || 'Failed', 'error'); }
  }

  return (
    <div className="card">
      <div className="section-header">
        <div className="section-title">User Management</div>
        <button className="btn btn-accent" onClick={() => setShowModal(true)}>+ Add User</button>
      </div>
      {loading ? <div className="empty-state">Loading...</div> : (
        <table className="user-table">
          <thead>
            <tr><th>Username</th><th>Role</th><th>Status</th><th>Created</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {!users.length && <tr><td colSpan={5} className="empty-state">No active users found.</td></tr>}
            {users.map(u => (
              <tr key={u.id}>
                <td style={{ fontWeight: 500 }}>{u.username}</td>
                <td><span className={`tag ${u.role === 'admin' ? 'tag-yellow' : u.role === 'manager' ? 'tag-green' : 'tag-red'}`}>{u.role}</span></td>
                <td><span className="tag tag-green">{u.status}</span></td>
                <td style={{ color: 'var(--text3)', fontSize: 12 }}>{new Date(u.created_at).toLocaleDateString('en-PH')}</td>
                <td>
                  <button className="btn btn-danger btn-sm" onClick={() => archiveUser(u.id, u.username)}>Archive</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showModal && (
        <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-title">Add New User</div>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input className="form-input" placeholder="Enter username" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" placeholder="Enter password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="form-input" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                <option value="staff">Staff</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-accent" onClick={createUser}>Create User</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
