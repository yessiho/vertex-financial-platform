'use client';
import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';

const ROLES = ['client', 'accountant', 'admin', 'superadmin'];
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  mfa_enabled: boolean;
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
}

interface Entity { id: string; name: string; }

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: '', first_name: '', last_name: '', role: 'client', entity_id: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [inviteResult, setInviteResult] = useState<{email: string; temp_password: string} | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_access_token') : null;
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const fetchData = async () => {
    try {
      const [uRes, eRes] = await Promise.all([
        fetch(`${API}/api/v1/users`, { headers }),
        fetch(`${API}/api/v1/entities`, { headers }),
      ]);
      const [uData, eData] = await Promise.all([uRes.json(), eRes.json()]);
      setUsers(uData.data || []);
      setEntities(eData.data || []);
      if (eData.data?.length > 0) setForm(f => ({ ...f, entity_id: eData.data[0].id }));
    } catch { setError('Failed to load users'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const res = await fetch(`${API}/api/v1/users`, {
        method: 'POST', headers,
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to invite user');
      setInviteResult({ email: data.data.email, temp_password: data.temp_password });
      await fetchData();
      setShowForm(false);
      setForm(f => ({ ...f, email: '', first_name: '', last_name: '', role: 'client' }));
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const roleColor: Record<string, string> = {
    superadmin: 'bg-purple-950 text-purple-400 border-purple-900',
    admin:      'bg-blue-950 text-blue-400 border-blue-900',
    accountant: 'bg-amber-950 text-amber-400 border-amber-900',
    client:     'bg-zinc-800 text-zinc-400 border-zinc-700',
  };

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-semibold text-white">Users</h1>
            <p className="text-zinc-400 text-sm mt-1">{users.length} registered {users.length === 1 ? 'user' : 'users'}</p>
          </div>
          <button onClick={() => { setShowForm(true); setInviteResult(null); }}
            className="px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-zinc-100 transition-colors">
            + Invite User
          </button>
        </div>

        {error && <div className="mb-4 p-3 rounded-lg bg-red-950 border border-red-800 text-red-400 text-sm">{error}</div>}

        {inviteResult && (
          <div className="mb-6 p-4 rounded-xl bg-green-950 border border-green-800">
            <p className="text-green-400 text-sm font-medium mb-1">✅ User invited successfully</p>
            <p className="text-green-300 text-xs">Email: {inviteResult.email}</p>
            <p className="text-green-300 text-xs font-mono">Temp password: {inviteResult.temp_password}</p>
            <p className="text-green-600 text-xs mt-1">Share this password securely — it will not be shown again.</p>
          </div>
        )}

        {showForm && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
            <h2 className="text-sm font-medium text-white mb-4">Invite New User</h2>
            <form onSubmit={handleInvite} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">First Name *</label>
                <input type="text" value={form.first_name} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))}
                  required placeholder="John"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Last Name *</label>
                <input type="text" value={form.last_name} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))}
                  required placeholder="Doe"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Email *</label>
                <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  required placeholder="john@example.com"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Role *</label>
                <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20">
                  {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Assign to Entity</label>
                <select value={form.entity_id} onChange={e => setForm(p => ({ ...p, entity_id: e.target.value }))}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20">
                  {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div className="md:col-span-2 flex gap-3">
                <button type="submit" disabled={saving}
                  className="px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-zinc-100 disabled:opacity-50 transition-colors">
                  {saving ? 'Inviting...' : 'Send Invite'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setError(''); }}
                  className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors">Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Name</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Email</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Role</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">MFA</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Last Login</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Joined</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-zinc-600">Loading...</td></tr>}
              {!loading && users.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-zinc-600">No users yet.</td></tr>
              )}
              {users.map((user, i) => (
                <tr key={user.id} className={i < users.length - 1 ? 'border-b border-zinc-800/50' : ''}>
                  <td className="px-5 py-3.5 text-sm text-white font-medium">{user.first_name} {user.last_name}</td>
                  <td className="px-5 py-3.5 text-sm text-zinc-400">{user.email}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${roleColor[user.role] || roleColor.client}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${user.mfa_enabled ? 'bg-green-950 text-green-400 border-green-900' : 'bg-zinc-800 text-zinc-500 border-zinc-700'}`}>
                      {user.mfa_enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-zinc-500">
                    {user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-zinc-500">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
