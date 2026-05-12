'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function LoginPage() {
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
      login(data.access_token);
    } catch (err: any) {
      setError(err.message);
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
      login(data.access_token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-black mb-4">
            <span className="text-white font-bold text-lg">V</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">Vertex Financial</h1>
          <p className="text-sm text-gray-500 mt-1">
            {step === 'login' ? 'Sign in to your account' : 'Enter your MFA code'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
        )}

        {step === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                required placeholder="you@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                required placeholder="••••••••"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-2.5 px-4 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors">
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        )}

        {step === 'mfa' && (
          <form onSubmit={handleMfa} className="space-y-4">
            <p className="text-sm text-gray-600 text-center">
              Enter the <strong>6-digit code</strong> from your authenticator app
            </p>
            <input type="text" value={totpCode}
              onChange={e => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required maxLength={6} placeholder="000000" autoFocus
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-2xl text-center tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent" />
            <button type="submit" disabled={loading || totpCode.length !== 6}
              className="w-full py-2.5 px-4 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors">
              {loading ? 'Verifying...' : 'Verify'}
            </button>
            <button type="button" onClick={() => { setStep('login'); setTotpCode(''); setError(''); }}
              className="w-full py-2 text-sm text-gray-500 hover:text-gray-700">
              ← Back to login
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
