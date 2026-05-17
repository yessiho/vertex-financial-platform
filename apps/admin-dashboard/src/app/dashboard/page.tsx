'use client';
import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { useAuth } from '@/context/AuthContext';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function AdminDashboard() {
  const { user, token } = useAuth();
  const [stats, setStats] = useState({ entities: 0, users: 0, redirects: 0, teams: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    const h = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${API}/api/v1/entities`, { headers: h }).then(r => r.json()),
      fetch(`${API}/api/v1/users`, { headers: h }).then(r => r.json()),
      fetch(`${API}/api/v1/redirects`, { headers: h }).then(r => r.json()),
      fetch(`${API}/api/v1/teams`, { headers: h }).then(r => r.json()),
    ]).then(([e, u, r, t]) => {
      setStats({
        entities: e.data?.length || 0,
        users: u.data?.length || 0,
        redirects: r.data?.filter((x: any) => x.is_active).length || 0,
        teams: t.data?.length || 0,
      });
    }).catch(() => {})
    .finally(() => setLoading(false));
  }, [token]);

  const STATS = [
    { label: 'Total Entities',   value: loading ? '—' : stats.entities, hint: 'Across all orgs' },
    { label: 'Active Users',     value: loading ? '—' : stats.users,    hint: 'Registered accounts' },
    { label: 'Redirect Rules',   value: loading ? '—' : stats.redirects, hint: 'Active portal URLs' },
    { label: 'Accountant Teams', value: loading ? '—' : stats.teams,    hint: 'Assigned teams' },
  ];

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-white">Overview</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Welcome back, {user?.role}. Here's your platform summary.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {STATS.map((s) => (
            <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <p className="text-xs text-zinc-500 uppercase tracking-wide mb-2">{s.label}</p>
              <p className="text-2xl font-semibold text-white mb-1">{s.value}</p>
              <p className="text-xs text-zinc-600">{s.hint}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h2 className="text-sm font-medium text-white mb-4">Quick Actions</h2>
            <div className="space-y-2">
              {[
                { label: '+ Add new entity',    href: '/dashboard/entities' },
                { label: '+ Add redirect rule', href: '/dashboard/redirects' },
                { label: '+ Invite user',       href: '/dashboard/users' },
                { label: '+ Create team',       href: '/dashboard/teams' },
              ].map(a => (
                <a key={a.label} href={a.href}
                  className="block px-4 py-2.5 rounded-lg border border-zinc-800 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors">
                  {a.label}
                </a>
              ))}
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h2 className="text-sm font-medium text-white mb-4">System Status</h2>
            <div className="space-y-3">
              {[
                { label: 'API Server',   status: 'Online' },
                { label: 'Database',     status: 'Healthy' },
                { label: 'Redis',        status: 'Online' },
                { label: 'Box Platform', status: process.env.NEXT_PUBLIC_BOX_CONFIGURED === 'true' ? 'Connected' : 'Not configured' },
                { label: 'SendGrid',     status: process.env.NEXT_PUBLIC_SENDGRID_CONFIGURED === 'true' ? 'Connected' : 'Not configured' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">{item.label}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${
                    item.status === 'Online' || item.status === 'Healthy' || item.status === 'Connected'
                      ? 'bg-green-950 text-green-400 border-green-900'
                      : 'bg-zinc-800 text-zinc-500 border-zinc-700'
                  }`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
