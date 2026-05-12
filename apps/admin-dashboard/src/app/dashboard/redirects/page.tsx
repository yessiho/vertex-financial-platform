'use client';
import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';

const PORTAL_TYPES = ['payroll', 'payment', 'tax', 'banking', 'custom'];
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Redirect {
  id: string;
  entity_id: string;
  entity_name: string;
  portal_type: string;
  label: string;
  target_url: string;
  is_active: boolean;
  version: number;
  updated_at: string;
}

interface Entity {
  id: string;
  name: string;
}

export default function RedirectsPage() {
  const [redirects, setRedirects] = useState<Redirect[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editUrl, setEditUrl] = useState('');
  const [form, setForm] = useState({ entity_id: '', portal_type: 'payroll', label: '', target_url: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_access_token') : null;
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const fetchData = async () => {
    try {
      const [rRes, eRes] = await Promise.all([
        fetch(`${API}/api/v1/redirects`, { headers }),
        fetch(`${API}/api/v1/entities`, { headers }),
      ]);
      const [rData, eData] = await Promise.all([rRes.json(), eRes.json()]);
      setRedirects(rData.data || []);
      setEntities(eData.data || []);
      if (eData.data?.length > 0) setForm(f => ({ ...f, entity_id: eData.data[0].id }));
    } catch { setError('Failed to load data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const res = await fetch(`${API}/api/v1/redirects`, {
        method: 'POST', headers,
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create');
      await fetchData();
      setShowForm(false);
      setForm(f => ({ ...f, portal_type: 'payroll', label: '', target_url: '' }));
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleUpdate = async (id: string) => {
    try {
      await fetch(`${API}/api/v1/redirects/${id}`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ target_url: editUrl }),
      });
      await fetchData();
      setEditingId(null);
    } catch { setError('Failed to update'); }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Deactivate this redirect rule?')) return;
    try {
      await fetch(`${API}/api/v1/redirects/${id}`, { method: 'DELETE', headers });
      await fetchData();
    } catch { setError('Failed to deactivate'); }
  };

  const copyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-semibold text-white">URL Redirect Manager</h1>
            <p className="text-zinc-400 text-sm mt-1">
              {redirects.filter(r => r.is_active).length} active rules — manage portal URL routing per entity
            </p>
          </div>
          <button onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-zinc-100 transition-colors">
            + New Rule
          </button>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6 flex gap-3">
          <div className="text-blue-400 text-lg mt-0.5">ℹ</div>
          <div>
            <p className="text-sm text-zinc-300 font-medium">How redirect rules work</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              Each rule maps an entity + portal type to a target URL. Clients resolve via
              <code className="text-zinc-400 bg-zinc-800 px-1 mx-1 rounded">GET /api/v1/redirects/:entityId/:portalType</code>
              — the raw URL is never exposed to the frontend.
            </p>
          </div>
        </div>

        {error && <div className="mb-4 p-3 rounded-lg bg-red-950 border border-red-800 text-red-400 text-sm">{error}</div>}

        {showForm && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
            <h2 className="text-sm font-medium text-white mb-4">Create Redirect Rule</h2>
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Entity *</label>
                <select value={form.entity_id} onChange={e => setForm(p => ({ ...p, entity_id: e.target.value }))}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20">
                  {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Portal Type *</label>
                <select value={form.portal_type} onChange={e => setForm(p => ({ ...p, portal_type: e.target.value }))}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20">
                  {PORTAL_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Label *</label>
                <input type="text" value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))}
                  required placeholder="ADP Payroll Portal"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Target URL *</label>
                <input type="url" value={form.target_url} onChange={e => setForm(p => ({ ...p, target_url: e.target.value }))}
                  required placeholder="https://workforcenow.adp.com"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20" />
              </div>
              <div className="md:col-span-2 flex gap-3">
                <button type="submit" disabled={saving}
                  className="px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-zinc-100 disabled:opacity-50 transition-colors">
                  {saving ? 'Creating...' : 'Create Rule'}
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
                <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Entity</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Type</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Label</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Target URL</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Ver</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="px-5 py-8 text-center text-sm text-zinc-600">Loading...</td></tr>}
              {!loading && redirects.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-sm text-zinc-600">
                  No redirect rules yet. Create your first one above.
                </td></tr>
              )}
              {redirects.map((r, i) => (
                <tr key={r.id} className={i < redirects.length - 1 ? 'border-b border-zinc-800/50' : ''}>
                  <td className="px-5 py-3.5 text-sm text-white">{r.entity_name}</td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 capitalize">{r.portal_type}</span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-zinc-300">{r.label}</td>
                  <td className="px-5 py-3.5">
                    {editingId === r.id ? (
                      <div className="flex items-center gap-2">
                        <input type="url" value={editUrl} onChange={e => setEditUrl(e.target.value)}
                          className="px-2 py-1 bg-zinc-800 border border-zinc-600 rounded text-xs text-white w-48 focus:outline-none" autoFocus />
                        <button onClick={() => handleUpdate(r.id)} className="text-xs text-green-400 hover:text-green-300">Save</button>
                        <button onClick={() => setEditingId(null)} className="text-xs text-zinc-500 hover:text-white">✕</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-400 font-mono truncate max-w-[160px]">{r.target_url}</span>
                        <button onClick={() => copyUrl(r.target_url, r.id)} className="text-xs text-zinc-600 hover:text-zinc-300">
                          {copied === r.id ? '✓' : '⎘'}
                        </button>
                        <button onClick={() => { setEditingId(r.id); setEditUrl(r.target_url); }}
                          className="text-xs text-zinc-600 hover:text-blue-400">Edit</button>
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-zinc-500">v{r.version}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${r.is_active ? 'bg-green-950 text-green-400 border-green-900' : 'bg-zinc-800 text-zinc-500 border-zinc-700'}`}>
                      {r.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {r.is_active && (
                      <button onClick={() => handleDeactivate(r.id)} className="text-xs text-zinc-500 hover:text-red-400 transition-colors">
                        Deactivate
                      </button>
                    )}
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
