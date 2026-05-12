'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

interface Entity {
  id: string;
  name: string;
  type: string;
  is_primary: boolean;
}

export default function DashboardPage() {
  const { user, logout, isLoading, login } = useAuth();
  const router = useRouter();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user) {
      apiFetch('/api/v1/entities').then(res => setEntities(res.data || [])).catch(() => {});
    }
  }, [user]);

  const switchEntity = async (entityId: string) => {
    setSwitching(true);
    try {
      const res = await apiFetch('/api/v1/auth/entity-switch', {
        method: 'POST',
        body: JSON.stringify({ entity_id: entityId }),
      });
      login(res.access_token);
    } catch (err: any) {
      console.error(err);
    } finally { setSwitching(false); }
  };

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-gray-500">Loading...</div>
    </div>
  );

  if (!user) return null;

  const QUICK_LINKS = [
    { label: 'Documents', icon: '📄', href: '/dashboard/documents', desc: 'View and upload files' },
    { label: 'Messages', icon: '💬', href: '/dashboard/messages', desc: 'Message your accountant' },
    { label: 'Settings', icon: '⚙️', href: '/dashboard/settings', desc: 'MFA and profile' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center">
            <span className="text-white font-bold text-sm">V</span>
          </div>
          <span className="font-semibold text-gray-900">Vertex Financial</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500 capitalize">{user.role}</span>
          <button onClick={logout}
            className="text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg px-3 py-1.5 transition-colors">
            Sign out
          </button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">Welcome back. Here's your financial overview.</p>
          </div>
        </div>

        {/* Entity switcher */}
        {entities.length > 1 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Switch Entity</p>
            <div className="flex flex-wrap gap-2">
              {entities.map(e => (
                <button key={e.id} onClick={() => switchEntity(e.id)} disabled={switching || e.id === user.entity_id}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                    e.id === user.entity_id
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                  }`}>
                  {e.name}
                  {e.is_primary && e.id !== user.entity_id && <span className="ml-1 text-xs text-gray-400">(primary)</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Active Entity', value: entities.find(e => e.id === user.entity_id)?.name || user.entity_id?.slice(0, 8) + '...', sub: 'Current context' },
            { label: 'Role', value: user.role, sub: 'Access level' },
            { label: 'MFA Status', value: user.mfa_verified ? 'Verified' : 'Not verified', sub: 'Security' },
          ].map((card) => (
            <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{card.label}</p>
              <p className="text-lg font-semibold text-gray-900 capitalize">{card.value}</p>
              <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
            </div>
          ))}
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {QUICK_LINKS.map(link => (
            <button key={link.label} onClick={() => router.push(link.href)}
              className="bg-white rounded-xl border border-gray-200 p-5 text-left hover:border-gray-300 hover:shadow-sm transition-all">
              <div className="text-2xl mb-2">{link.icon}</div>
              <p className="text-sm font-semibold text-gray-900">{link.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{link.desc}</p>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
