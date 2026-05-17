'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Entity { id: string; name: string; type: string; is_primary: boolean; }
interface Stats { total_documents: number; total_messages: number; active_entities: number; unread_messages: number; }
interface Portal { id: string; portal_type: string; label: string; }

export default function DashboardPage() {
  const { user, logout, isLoading, login, token } = useAuth();
  const router = useRouter();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [portals, setPortals] = useState<Portal[]>([]);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user || !token) return;
    const h = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch(`${API}/api/v1/entities`, { headers: h }).then(r => r.json()),
      fetch(`${API}/api/v1/stats`, { headers: h }).then(r => r.json()),
      fetch(`${API}/api/v1/mobile/portals`, { headers: h }).then(r => r.json()),
    ]).then(([e, s, p]) => {
      setEntities(e.data || []);
      setStats(s.data || null);
      setPortals(p.data || []);
    }).catch(() => {});
  }, [user, token]);

  const switchEntity = async (entityId: string) => {
    if (!token) return;
    setSwitching(true);
    try {
      const res = await fetch(`${API}/api/v1/auth/entity-switch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ entity_id: entityId }),
      });
      const data = await res.json();
      if (data.access_token) login(data.access_token);
    } catch {} finally { setSwitching(false); }
  };

  if (isLoading || !user) return null;

  const QUICK_LINKS = [
    { label: 'Documents', icon: '📄', href: '/dashboard/documents', desc: 'View and upload files', badge: stats?.total_documents },
    { label: 'Messages', icon: '💬', href: '/dashboard/messages', desc: 'Message your accountant', badge: stats?.unread_messages, badgeRed: true },
    { label: 'Settings', icon: '⚙️', href: '/dashboard/settings', desc: 'MFA and profile' },
    { label: 'Entities', icon: '🏢', href: '/dashboard/entities', desc: 'View entity details' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center">
            <span className="text-white font-bold text-sm">V</span>
          </div>
          <span className="font-semibold text-gray-900">Vertex Financial</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Notification bell */}
          <button onClick={() => router.push('/dashboard/messages')}
            className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <span className="text-lg">🔔</span>
            {(stats?.unread_messages ?? 0) > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                {stats?.unread_messages}
              </span>
            )}
          </button>
          <span className="text-sm text-gray-500 capitalize">{user.role}</span>
          <button onClick={logout}
            className="text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg px-3 py-1.5 transition-colors">
            Sign out
          </button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Welcome back. Here's your financial overview.</p>
        </div>

        {/* Entity switcher */}
        {entities.length > 1 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Switch Entity</p>
            <div className="flex flex-wrap gap-2">
              {entities.map(e => (
                <button key={e.id} onClick={() => switchEntity(e.id)}
                  disabled={switching || e.id === user.entity_id}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                    e.id === user.entity_id
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                  }`}>
                  {e.name}
                  {e.is_primary && e.id !== user.entity_id && (
                    <span className="ml-1 text-xs text-gray-400">(primary)</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Active Entity', value: entities.find(e => e.id === user.entity_id)?.name || '—', sub: 'Current context' },
            { label: 'Documents', value: stats?.total_documents ?? '—', sub: 'Total files' },
            { label: 'Messages', value: stats?.total_messages ?? '—', sub: `${stats?.unread_messages ?? 0} unread` },
            { label: 'Entities', value: stats?.active_entities ?? '—', sub: 'Access granted' },
          ].map(card => (
            <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{card.label}</p>
              <p className="text-xl font-semibold text-gray-900 capitalize">{card.value}</p>
              <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
            </div>
          ))}
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {QUICK_LINKS.map(link => (
            <button key={link.label} onClick={() => router.push(link.href)}
              className="bg-white rounded-xl border border-gray-200 p-5 text-left hover:border-gray-300 hover:shadow-sm transition-all relative">
              <div className="text-2xl mb-2">{link.icon}</div>
              <p className="text-sm font-semibold text-gray-900">{link.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{link.desc}</p>
              {link.badge !== undefined && link.badge > 0 && (
                <span className={`absolute top-3 right-3 text-xs px-2 py-0.5 rounded-full font-medium ${
                  link.badgeRed ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {link.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Payroll portal quick links */}
        {portals.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-medium text-gray-900 mb-3">Portal Links</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {portals.map(portal => (
                <button key={portal.id}
                  onClick={async () => {
                    const res = await fetch(
                      `${API}/api/v1/redirects/${user.entity_id}/${portal.portal_type}`,
                      { headers: { Authorization: `Bearer ${token}` } }
                    );
                    const data = await res.json();
                    if (data.data?.target_url) window.open(data.data.target_url, '_blank');
                  }}
                  className="p-3 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors text-left capitalize">
                  <span className="text-lg mr-1">
                    {portal.portal_type === 'payroll' ? '💰' :
                     portal.portal_type === 'payment' ? '💳' :
                     portal.portal_type === 'tax' ? '📋' : '🔗'}
                  </span>
                  {portal.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
