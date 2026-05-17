'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Entity {
  id: string; name: string; type: string; status: string;
  tax_id?: string; metadata: any; created_at: string;
  box_root_folder_id?: string; box_documents_folder_id?: string;
}
interface Team { id: string; name: string; email: string; }

export default function EntitiesPage() {
  const { user, isLoading, token, login } = useAuth();
  const router = useRouter();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [teams, setTeams] = useState<Record<string, Team>>({});
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState<string | null>(null);

  const h = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user || !token) return;
    fetch(`${API}/api/v1/entities`, { headers: h })
      .then(r => r.json())
      .then(async d => {
        const ents = d.data || [];
        setEntities(ents);
        // Fetch team for each entity
        const teamMap: Record<string, Team> = {};
        await Promise.all(ents.map(async (e: Entity) => {
          try {
            const tr = await fetch(`${API}/api/v1/entities/${e.id}/team`, { headers: h });
            const td = await tr.json();
            if (td.data) teamMap[e.id] = td.data;
          } catch {}
        }));
        setTeams(teamMap);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, token]);

  const switchEntity = async (entityId: string) => {
    if (!token) return;
    setSwitching(entityId);
    try {
      const res = await fetch(`${API}/api/v1/auth/entity-switch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ entity_id: entityId }),
      });
      const data = await res.json();
      if (data.access_token) login(data.access_token);
    } catch {} finally { setSwitching(null); }
  };

  if (isLoading || !user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="text-gray-400 hover:text-gray-600 text-lg">←</button>
          <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center">
            <span className="text-white font-bold text-sm">V</span>
          </div>
          <span className="font-semibold text-gray-900">My Entities</span>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Business Entities</h1>
          <p className="text-gray-500 text-sm mt-1">Your assigned business entities and their details</p>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading...</div>
        ) : (
          <div className="space-y-4">
            {entities.map(entity => (
              <div key={entity.id} className={`bg-white rounded-xl border-2 p-6 transition-colors ${
                entity.id === user.entity_id ? 'border-black' : 'border-gray-200'
              }`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-lg font-semibold text-gray-900">{entity.name}</h2>
                      {entity.id === user.entity_id && (
                        <span className="text-xs px-2 py-0.5 bg-black text-white rounded-full">Active</span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${
                        entity.status === 'active'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-gray-50 text-gray-500 border-gray-200'
                      }`}>{entity.status}</span>
                    </div>
                    <p className="text-sm text-gray-500 capitalize">{entity.type.replace(/_/g, ' ')}</p>
                  </div>
                  {entity.id !== user.entity_id && (
                    <button onClick={() => switchEntity(entity.id)}
                      disabled={switching === entity.id}
                      className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg hover:border-black transition-colors disabled:opacity-50">
                      {switching === entity.id ? 'Switching...' : 'Switch to'}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Tax ID</p>
                    <p className="text-sm text-gray-900 font-mono">{entity.tax_id || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Created</p>
                    <p className="text-sm text-gray-900">{new Date(entity.created_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Box Storage</p>
                    <p className="text-sm">
                      {entity.box_root_folder_id
                        ? <span className="text-green-600">✓ Connected</span>
                        : <span className="text-gray-400">Not configured</span>
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Accountant Team</p>
                    <p className="text-sm text-gray-900">
                      {teams[entity.id]
                        ? <span className="text-green-600">✓ {teams[entity.id].name}</span>
                        : <span className="text-gray-400">Not assigned</span>
                      }
                    </p>
                  </div>
                </div>

                {teams[entity.id] && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500">Team contact: <span className="text-gray-700">{teams[entity.id].email}</span></p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
