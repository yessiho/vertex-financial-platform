'use client';
import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Team {
  id: string;
  name: string;
  email: string;
  member_user_ids: string[];
  created_at: string;
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_access_token') : null;
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const fetchTeams = async () => {
    try {
      const res = await fetch(`${API}/api/v1/teams`, { headers });
      const data = await res.json();
      setTeams(data.data || []);
    } catch { setError('Failed to load teams'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTeams(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const res = await fetch(`${API}/api/v1/teams`, {
        method: 'POST', headers,
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create team');
      await fetchTeams();
      setShowForm(false);
      setForm({ name: '', email: '' });
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-semibold text-white">Accountant Teams</h1>
            <p className="text-zinc-400 text-sm mt-1">
              Manage teams and their entity assignments for talk2cc routing
            </p>
          </div>
          <button onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-zinc-100 transition-colors">
            + New Team
          </button>
        </div>

        {error && <div className="mb-4 p-3 rounded-lg bg-red-950 border border-red-800 text-red-400 text-sm">{error}</div>}

        {showForm && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
            <h2 className="text-sm font-medium text-white mb-4">Create Team</h2>
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Team Name *</label>
                <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  required placeholder="Tax & Accounting Team"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Team Inbox Email *</label>
                <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  required placeholder="tax-team@vertexfinancial.com"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20" />
              </div>
              <div className="md:col-span-2 flex gap-3">
                <button type="submit" disabled={saving}
                  className="px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-zinc-100 disabled:opacity-50 transition-colors">
                  {saving ? 'Creating...' : 'Create Team'}
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
                <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Team Name</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Inbox Email</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Members</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Created</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={4} className="px-5 py-8 text-center text-sm text-zinc-600">Loading...</td></tr>}
              {!loading && teams.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-sm text-zinc-600">
                  No teams yet. Create your first accountant team above.
                </td></tr>
              )}
              {teams.map((team, i) => (
                <tr key={team.id} className={i < teams.length - 1 ? 'border-b border-zinc-800/50' : ''}>
                  <td className="px-5 py-3.5 text-sm text-white font-medium">{team.name}</td>
                  <td className="px-5 py-3.5 text-sm text-zinc-400">{team.email}</td>
                  <td className="px-5 py-3.5 text-sm text-zinc-400">
                    {team.member_user_ids?.length || 0} members
                  </td>
                  <td className="px-5 py-3.5 text-sm text-zinc-500">
                    {new Date(team.created_at).toLocaleDateString()}
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
