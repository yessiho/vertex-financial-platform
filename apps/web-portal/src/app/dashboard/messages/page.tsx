'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Message {
  id: string;
  subject: string;
  body: string;
  status: string;
  priority: string;
  sender_name: string;
  created_at: string;
}

export default function MessagesPage() {
  const { user, isLoading, token } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ subject: '', body: '', priority: 'normal' });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
  }, [user, isLoading, router]);

  const fetchMessages = async () => {
    if (!token) return;
    setError('');
    try {
      const res = await fetch(`${API}/api/v1/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setMessages(data.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && token) fetchMessages();
  }, [user, token]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSending(true); setError(''); setSuccess('');
    try {
      const res = await fetch(`${API}/api/v1/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send');
      setSuccess('Message sent to your accountant team');
      setShowForm(false);
      setForm({ subject: '', body: '', priority: 'normal' });
      await fetchMessages();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const priorityColor: Record<string, string> = {
    normal: 'bg-gray-100 text-gray-600',
    high: 'bg-amber-100 text-amber-700',
    urgent: 'bg-red-100 text-red-700',
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
          <span className="font-semibold text-gray-900">Messages</span>
        </div>
        <button onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors">
          + New Message
        </button>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {error && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
        {success && <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">✓ {success}</div>}

        {showForm && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">New Message</h2>
              <button onClick={() => { setShowForm(false); setError(''); }} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleSend} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                <input type="text" value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                  required placeholder="Question about Q2 tax filing"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
                <textarea value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
                  required rows={5} placeholder="Write your message here..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black">
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={sending}
                  className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors">
                  {sending ? 'Sending...' : 'Send Message'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setError(''); }}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div className="space-y-3">
          {loading && <div className="text-center py-8 text-gray-400 text-sm">Loading...</div>}
          {!loading && messages.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <p className="text-2xl mb-2">💬</p>
              <p className="text-sm font-medium text-gray-700">No messages yet</p>
              <p className="text-sm text-gray-500 mt-1">Send a message to your accountant team to get started</p>
              <button onClick={() => setShowForm(true)}
                className="mt-4 px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors">
                Send first message
              </button>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={msg.id} className={`bg-white rounded-xl border p-5 ${
              msg.status === 'unread' ? 'border-black' : 'border-gray-200'
            }`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {msg.status === 'unread' && <div className="w-2 h-2 rounded-full bg-black flex-shrink-0" />}
                  <p className={`text-sm text-gray-900 ${msg.status === 'unread' ? 'font-semibold' : 'font-medium'}`}>
                    {msg.subject}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${priorityColor[msg.priority]}`}>
                    {msg.priority}
                  </span>
                  <span className="text-xs text-gray-400">{new Date(msg.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <p className="text-sm text-gray-500 line-clamp-2">{msg.body}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
