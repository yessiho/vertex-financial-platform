'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import MfaSetup from './MfaSetup';

export default function SettingsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user) {
      apiFetch('/api/v1/users/me')
        .then(res => setProfile(res.data))
        .catch(() => {})
        .finally(() => setProfileLoading(false));
    }
  }, [user]);

  if (isLoading || !user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')}
            className="text-gray-400 hover:text-gray-600 text-lg">←</button>
          <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center">
            <span className="text-white font-bold text-sm">V</span>
          </div>
          <span className="font-semibold text-gray-900">Settings</span>
        </div>
        <span className="text-sm text-gray-500 capitalize">{user.role}</span>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Account Settings</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your profile and security preferences</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Profile</h3>
          {profileLoading ? (
            <p className="text-sm text-gray-400">Loading...</p>
          ) : (
            <div className="space-y-3">
              {[
                { label: 'Email',        value: profile?.email },
                { label: 'Name',         value: profile ? `${profile.first_name} ${profile.last_name}` : null },
                { label: 'Role',         value: profile?.role },
                { label: 'Member since', value: profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : null },
              ].map(item => (
                <div key={item.label} className="flex justify-between py-2 border-b border-gray-100 last:border-0">
                  <span className="text-sm text-gray-500">{item.label}</span>
                  <span className="text-sm text-gray-900 font-medium capitalize">{item.value || '—'}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <MfaSetup />

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-2">Active Entity</h3>
          <p className="text-sm text-gray-500 mb-3">Your current entity context embedded in your session token.</p>
          <code className="text-xs bg-gray-50 border border-gray-200 rounded px-3 py-2 block text-gray-700 break-all">
            {user.entity_id}
          </code>
        </div>
      </main>
    </div>
  );
}
