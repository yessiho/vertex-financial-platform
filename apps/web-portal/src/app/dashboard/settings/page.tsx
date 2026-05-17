'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import MfaSetup from './MfaSetup';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function SettingsPage() {
  const { user, isLoading, token } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [nameForm, setNameForm] = useState({ first_name: '', last_name: '' });
  const [nameLoading, setNameLoading] = useState(false);
  const [nameSuccess, setNameSuccess] = useState('');

  const h = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user || !token) return;
    fetch(`${API}/api/v1/users/me`, { headers: h })
      .then(r => r.json())
      .then(d => {
        setProfile(d.data);
        setNameForm({ first_name: d.data.first_name, last_name: d.data.last_name });
      })
      .catch(() => {})
      .finally(() => setProfileLoading(false));
  }, [user, token]);

  const handleNameUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameLoading(true); setNameSuccess('');
    try {
      const res = await fetch(`${API}/api/v1/users/me`, {
        method: 'PATCH', headers: h, body: JSON.stringify(nameForm),
      });
      if (res.ok) setNameSuccess('Profile updated successfully');
    } catch {} finally { setNameLoading(false); }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(''); setPwSuccess('');
    if (pwForm.new_password !== pwForm.confirm_password) {
      setPwError('New passwords do not match'); return;
    }
    if (pwForm.new_password.length < 8) {
      setPwError('Password must be at least 8 characters'); return;
    }
    setPwLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/users/me/password`, {
        method: 'PATCH', headers: h,
        body: JSON.stringify({ current_password: pwForm.current_password, new_password: pwForm.new_password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change password');
      setPwSuccess('Password changed successfully');
      setPwForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err: any) { setPwError(err.message); }
    finally { setPwLoading(false); }
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
          <span className="font-semibold text-gray-900">Settings</span>
        </div>
        <span className="text-sm text-gray-500 capitalize">{user.role}</span>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Account Settings</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your profile and security preferences</p>
        </div>

        {/* Profile */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Profile</h3>
          {profileLoading ? <p className="text-sm text-gray-400">Loading...</p> : (
            <form onSubmit={handleNameUpdate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">First Name</label>
                  <input type="text" value={nameForm.first_name}
                    onChange={e => setNameForm(p => ({ ...p, first_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Last Name</label>
                  <input type="text" value={nameForm.last_name}
                    onChange={e => setNameForm(p => ({ ...p, last_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black" />
                </div>
              </div>
              <div className="flex items-center justify-between py-2 border-t border-gray-100">
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm text-gray-900">{profile?.email}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Role</p>
                  <p className="text-sm text-gray-900 capitalize">{profile?.role}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Member since</p>
                  <p className="text-sm text-gray-900">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '—'}</p>
                </div>
              </div>
              {nameSuccess && <p className="text-sm text-green-600">✓ {nameSuccess}</p>}
              <button type="submit" disabled={nameLoading}
                className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors">
                {nameLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          )}
        </div>

        {/* Password change */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Change Password</h3>
          {pwError && <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{pwError}</div>}
          {pwSuccess && <div className="mb-3 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">✓ {pwSuccess}</div>}
          <form onSubmit={handlePasswordChange} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Current Password</label>
              <input type="password" value={pwForm.current_password}
                onChange={e => setPwForm(p => ({ ...p, current_password: e.target.value }))}
                required placeholder="••••••••"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">New Password</label>
              <input type="password" value={pwForm.new_password}
                onChange={e => setPwForm(p => ({ ...p, new_password: e.target.value }))}
                required placeholder="••••••••" minLength={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Confirm New Password</label>
              <input type="password" value={pwForm.confirm_password}
                onChange={e => setPwForm(p => ({ ...p, confirm_password: e.target.value }))}
                required placeholder="••••••••"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black" />
            </div>
            <button type="submit" disabled={pwLoading}
              className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors">
              {pwLoading ? 'Changing...' : 'Change Password'}
            </button>
          </form>
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
