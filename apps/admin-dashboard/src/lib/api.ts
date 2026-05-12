const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_access_token') : null;

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
  logout: () => apiFetch('/api/v1/auth/logout', { method: 'POST' }),
};

export const entities = {
  list: () => apiFetch('/api/v1/entities'),
  create: (data: any) => apiFetch('/api/v1/entities', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => apiFetch(`/api/v1/entities/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deactivate: (id: string) => apiFetch(`/api/v1/entities/${id}`, { method: 'DELETE' }),
};

export const redirects = {
  list: () => apiFetch('/api/v1/redirects'),
  create: (data: any) => apiFetch('/api/v1/redirects', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => apiFetch(`/api/v1/redirects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deactivate: (id: string) => apiFetch(`/api/v1/redirects/${id}`, { method: 'DELETE' }),
};

export const users = {
  list: () => apiFetch('/api/v1/users'),
  invite: (data: any) => apiFetch('/api/v1/users', { method: 'POST', body: JSON.stringify(data) }),
  setRole: (id: string, role: string) => apiFetch(`/api/v1/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
};
