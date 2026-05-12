const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const auth = {
  login: (email: string, password: string) =>
    apiFetch('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  verifyMfa: (temp_token: string, totp_code: string) =>
    apiFetch('/api/v1/auth/mfa/verify', {
      method: 'POST',
      body: JSON.stringify({ temp_token, totp_code }),
    }),

  logout: () => apiFetch('/api/v1/auth/logout', { method: 'POST' }),
};
