'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function parseJwt(token: string) {
  try { return JSON.parse(atob(token.split('.')[1])); }
  catch { return null; }
}

export default function AdminLoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [step, setStep] = useState<'login' | 'mfa'>('login');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      if (data.mfa_required) {
        setTempToken(data.temp_token);
        setStep('mfa');
        return;
      }

      if (!data.access_token) throw new Error('Login failed');
      const payload = parseJwt(data.access_token);
      const allowed = ['superadmin', 'admin'];
      if (!payload || !allowed.includes(payload.role)) {
        throw new Error('Admin access required');
      }
      login(data.access_token);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/auth/mfa/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ temp_token: tempToken, totp_code: totpCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid MFA code');

      const payload = parseJwt(data.access_token);
      const allowed = ['superadmin', 'admin'];
      if (!payload || !allowed.includes(payload.role)) {
        throw new Error('Admin access required');
      }
      login(data.access_token);
    } catch (err: any) {
      setError(err.message || 'Invalid MFA code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white mb-4">
            <span className="text-black font-bold text-lg">V</span>
          </div>
          <h1 className="text-2xl font-semibold text-white">Vertex Admin</h1>
          <p className="text-sm text-zinc-400 mt-1">
            {step === 'login' ? 'Internal dashboard — authorized access only' : 'Enter your MFA code'}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-950 border border-red-800 text-red-400 text-sm">{error}</div>
          )}

          {step === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  required placeholder="admin@vertex.local"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  required placeholder="••••••••"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-2.5 px-4 bg-white text-black rounded-lg text-sm font-medium hover:bg-zinc-100 disabled:opacity-50 transition-colors">
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          )}

          {step === 'mfa' && (
            <form onSubmit={handleMfa} className="space-y-4">
              <p className="text-sm text-zinc-400">Enter the 6-digit code from your authenticator app:</p>
              <input type="text" value={totpCode}
                onChange={e => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required maxLength={6} placeholder="000000" autoFocus
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-2xl text-center tracking-widest font-mono text-white focus:outline-none focus:ring-2 focus:ring-white/20" />
              <button type="submit" disabled={loading || totpCode.length !== 6}
                className="w-full py-2.5 px-4 bg-white text-black rounded-lg text-sm font-medium hover:bg-zinc-100 disabled:opacity-50 transition-colors">
                {loading ? 'Verifying...' : 'Verify'}
              </button>
              <button type="button" onClick={() => { setStep('login'); setTotpCode(''); setError(''); }}
                className="w-full py-2 text-sm text-zinc-500 hover:text-zinc-300">
                ← Back to login
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
