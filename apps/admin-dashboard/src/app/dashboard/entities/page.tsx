'use client';
import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';

const ENTITY_TYPES = ['llc', 'corporation', 'sole_proprietor', 'partnership', 'trust'];
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Entity {
  id: string;
  name: string;
  type: string;
  status: string;
  tax_id?: string;
  is_primary?: boolean;
  created_at: string;
}

export default function EntitiesPage() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'llc', tax_id: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_access_token') : null;

  const fetchEntities = async () => {
    try {
      const res = await fetch(`${API}/api/v1/entities`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setEntities(data.data || []);
    } catch {
      setError('Failed to load entities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEntities(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/v1/entities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create entity');
      await fetchEntities();
      setShowForm(false);
      setForm({ name: '', type: 'llc', tax_id: '' });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Deactivate this entity?')) return;
    try {
      await fetch(`${API}/api/v1/entities/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchEntities();
    } catch {
      setError('Failed to deactivate entity');
    }
  };

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-semibold text-white">Entities</h1>
            <p className="text-zinc-400 text-sm mt-1">
              {entities.length} active {entities.length === 1 ? 'entity' : 'entities'} — manage business units and Box folder provisioning
            </p>
          </div>
          <button onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-zinc-100 transition-colors">
            + New Entity
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-950 border border-red-800 text-red-400 text-sm">{error}</div>
        )}

        {showForm && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
            <h2 className="text-sm font-medium text-white mb-4">Create New Entity</h2>
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Entity Name *</label>
                <input type="text" value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  required placeholder="Acme LLC"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Entity Type *</label>
                <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20">
                  {ENTITY_TYPES.map(t => (
                    <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Tax ID (EIN)</label>
                <input type="text" value={form.tax_id}
                  onChange={e => setForm(p => ({ ...p, tax_id: e.target.value }))}
                  placeholder="XX-XXXXXXX"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20" />
              </div>
              <div className="md:col-span-3 flex gap-3">
                <button type="submit" disabled={saving}
                  className="px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-zinc-100 disabled:opacity-50 transition-colors">
                  {saving ? 'Creating...' : 'Create Entity'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setError(''); }}
                  className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Name</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Type</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Tax ID</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Created</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-zinc-600">Loading...</td></tr>
              )}
              {!loading && entities.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-zinc-600">No entities yet.</td></tr>
              )}
              {entities.map((entity, i) => (
                <tr key={entity.id} className={i < entities.length - 1 ? 'border-b border-zinc-800/50' : ''}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white font-medium">{entity.name}</span>
                      {entity.is_primary && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-300">Primary</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-zinc-400 capitalize">{entity.type.replace(/_/g, ' ')}</td>
                  <td className="px-5 py-3.5 text-sm text-zinc-400">{entity.tax_id || '—'}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${
                      entity.status === 'active'
                        ? 'bg-green-950 text-green-400 border-green-900'
                        : 'bg-zinc-800 text-zinc-500 border-zinc-700'
                    }`}>{entity.status}</span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-zinc-500">
                    {new Date(entity.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button onClick={() => handleDeactivate(entity.id)}
                      className="text-xs text-zinc-500 hover:text-red-400 transition-colors">
                      Deactivate
                    </button>
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
