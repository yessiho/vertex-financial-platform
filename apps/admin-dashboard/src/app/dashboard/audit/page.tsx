'use client';
import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface AuditLog {
  id: number;
  action: string;
  resource_type: string;
  resource_id: string;
  entity_id: string;
  user_id: string;
  ip_address: string;
  created_at: string;
  before: any;
  after: any;
}

const ACTION_COLOR: Record<string, string> = {
  'entity.create':    'bg-green-950 text-green-400 border-green-900',
  'entity.update':    'bg-blue-950 text-blue-400 border-blue-900',
  'entity.deactivate':'bg-red-950 text-red-400 border-red-900',
  'entity.switch':    'bg-purple-950 text-purple-400 border-purple-900',
  'document.upload':  'bg-amber-950 text-amber-400 border-amber-900',
  'redirect.create':  'bg-teal-950 text-teal-400 border-teal-900',
  'redirect.update':  'bg-teal-950 text-teal-400 border-teal-900',
  'user.invite':      'bg-indigo-950 text-indigo-400 border-indigo-900',
};

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AuditLog | null>(null);
  const [error, setError] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_access_token') : null;

  useEffect(() => {
    fetch(`${API}/api/v1/audit`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => setLogs(d.data || []))
      .catch(() => setError('Failed to load audit logs'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-white">Audit Log</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Immutable record of all platform actions
          </p>
        </div>

        {error && <div className="mb-4 p-3 rounded-lg bg-red-950 border border-red-800 text-red-400 text-sm">{error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Log list */}
          <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Action</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Resource</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Time</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={3} className="px-5 py-8 text-center text-sm text-zinc-600">Loading...</td></tr>}
                {!loading && logs.length === 0 && (
                  <tr><td colSpan={3} className="px-5 py-8 text-center text-sm text-zinc-600">No audit logs yet.</td></tr>
                )}
                {logs.map((log, i) => (
                  <tr key={log.id}
                    onClick={() => setSelected(log)}
                    className={`cursor-pointer hover:bg-zinc-800/50 transition-colors ${
                      selected?.id === log.id ? 'bg-zinc-800' : ''
                    } ${i < logs.length - 1 ? 'border-b border-zinc-800/50' : ''}`}>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${ACTION_COLOR[log.action] || 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-zinc-400 capitalize">
                      {log.resource_type || '—'}
                    </td>
                    <td className="px-5 py-3 text-xs text-zinc-500">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Detail panel */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            {!selected ? (
              <div className="text-center py-8">
                <p className="text-zinc-600 text-sm">Click a log entry to see details</p>
              </div>
            ) : (
              <div>
                <h3 className="text-sm font-medium text-white mb-4">Log Details</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Action', value: selected.action },
                    { label: 'Resource', value: selected.resource_type },
                    { label: 'Resource ID', value: selected.resource_id?.slice(0,16) + '...' },
                    { label: 'User ID', value: selected.user_id?.slice(0,16) + '...' },
                    { label: 'IP', value: selected.ip_address || '—' },
                    { label: 'Time', value: new Date(selected.created_at).toLocaleString() },
                  ].map(item => (
                    <div key={item.label}>
                      <p className="text-xs text-zinc-500">{item.label}</p>
                      <p className="text-sm text-zinc-300 font-mono">{item.value}</p>
                    </div>
                  ))}
                </div>

                {selected.after && Object.keys(selected.after).length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs text-zinc-500 mb-2">Changes</p>
                    <pre className="text-xs text-zinc-400 bg-zinc-800 rounded p-3 overflow-auto max-h-48">
                      {JSON.stringify(selected.after, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
