'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type Step = 'idle' | 'setup' | 'confirm' | 'done';

export default function MfaSetup() {
  const { user, token } = useAuth();
  const [step, setStep] = useState<Step>('idle');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const startSetup = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/api/v1/auth/mfa/setup`, { method: 'POST', headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start MFA setup');
      setQrCode(data.qr_code);
      setSecret(data.secret);
      setStep('setup');
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const confirmSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/api/v1/auth/mfa/confirm`, {
        method: 'POST', headers,
        body: JSON.stringify({ totp_code: code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid code');
      setStep('done');
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  if (step === 'done') {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
            <span className="text-green-600 text-xl">✓</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">MFA Enabled</h3>
          <p className="text-sm text-gray-500">Your account is now protected with two-factor authentication.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Two-Factor Authentication</h3>
          <p className="text-sm text-gray-500 mt-0.5">Add an extra layer of security with Google Authenticator</p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full border ${
          user?.mfa_verified
            ? 'bg-green-50 text-green-700 border-green-200'
            : 'bg-amber-50 text-amber-700 border-amber-200'
        }`}>
          {user?.mfa_verified ? 'Enabled' : 'Not enabled'}
        </span>
      </div>

      {error && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

      {step === 'idle' && (
        <div>
          <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2">
            <p className="text-sm font-medium text-gray-700">Setup steps:</p>
            {[
              'Install Google Authenticator or Authy on your phone',
              'Click the button below to generate your QR code',
              'Scan the QR code with your authenticator app',
              'Enter the 6-digit code to confirm setup',
            ].map((s, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-black text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                <p className="text-sm text-gray-600">{s}</p>
              </div>
            ))}
          </div>
          <button onClick={startSetup} disabled={loading}
            className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors">
            {loading ? 'Generating...' : 'Set up MFA'}
          </button>
        </div>
      )}

      {step === 'setup' && (
        <div>
          <p className="text-sm text-gray-600 mb-4">Scan this QR code with <strong>Google Authenticator</strong> or <strong>Authy</strong>:</p>
          <div className="flex justify-center mb-4">
            <img src={qrCode} alt="MFA QR Code" width={200} height={200} className="border-4 border-white shadow-lg rounded-lg" />
          </div>
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <p className="text-xs text-gray-500 mb-1">Or enter this code manually:</p>
            <code className="text-sm font-mono text-gray-800 break-all">{secret}</code>
          </div>
          <button onClick={() => setStep('confirm')}
            className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors">
            I've scanned the QR code →
          </button>
        </div>
      )}

      {step === 'confirm' && (
        <form onSubmit={confirmSetup} className="space-y-4">
          <p className="text-sm text-gray-600">Enter the <strong>6-digit code</strong> from your authenticator app:</p>
          <input type="text" value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            required maxLength={6} placeholder="000000"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-2xl text-center tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-black"
            autoFocus />
          <div className="flex gap-3">
            <button type="submit" disabled={loading || code.length !== 6}
              className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors">
              {loading ? 'Verifying...' : 'Confirm & Enable MFA'}
            </button>
            <button type="button" onClick={() => { setStep('setup'); setCode(''); setError(''); }}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">← Back</button>
          </div>
        </form>
      )}
    </div>
  );
}
