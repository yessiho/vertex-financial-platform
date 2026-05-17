'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Message {
  id: string; subject: string; body: string;
  status: string; priority: string;
  sender_name: string; created_at: string;
  replies?: Reply[];
}
interface Reply {
  id: string; body: string; sender_name: string;
  is_from_team: boolean; created_at: string;
}

export default function MessagesPage() {
  const { user, isLoading, token } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [selected, setSelected] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ subject: '', body: '', priority: 'normal' });
  const [replyBody, setReplyBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
  }, [user, isLoading, router]);

  const h = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const fetchMessages = async () => {
    if (!token) return;
    setError('');
    try {
      const res = await fetch(`${API}/api/v1/messages`, { headers: h });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessages(data.data || []);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (user && token) fetchMessages(); }, [user, token]);

  const openThread = async (msg: Message) => {
    try {
      const res = await fetch(`${API}/api/v1/messages/${msg.id}`, { headers: h });
      const data = await res.json();
      setSelected(data.data);
      fetchMessages(); // refresh unread count
    } catch { setSelected(msg); }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true); setError(''); setSuccess('');
    try {
      const res = await fetch(`${API}/api/v1/messages`, { method: 'POST', headers: h, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess('Message sent to your accountant team');
      setShowForm(false);
      setForm({ subject: '', body: '', priority: 'normal' });
      await fetchMessages();
    } catch (err: any) { setError(err.message); }
    finally { setSending(false); }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !replyBody.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`${API}/api/v1/messages/${selected.id}/reply`, {
        method: 'POST', headers: h, body: JSON.stringify({ body: replyBody }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setReplyBody('');
      await openThread(selected);
    } catch (err: any) { setError(err.message); }
    finally { setSending(false); }
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
        <button onClick={() => { setShowForm(true); setSelected(null); }}
          className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors">
          + New Message
        </button>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {error && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
        {success && <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">✓ {success}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Message list */}
          <div>
            {showForm && (
              <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-gray-900">New Message</h2>
                  <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>
                <form onSubmit={handleSend} className="space-y-3">
                  <input type="text" value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                    required placeholder="Subject"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black" />
                  <textarea value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
                    required rows={4} placeholder="Write your message..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none" />
                  <div className="flex gap-2">
                    <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black">
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                    <button type="submit" disabled={sending}
                      className="flex-1 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors">
                      {sending ? 'Sending...' : 'Send'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="space-y-2">
              {loading && <div className="text-center py-8 text-gray-400 text-sm">Loading...</div>}
              {!loading && messages.length === 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                  <p className="text-2xl mb-2">💬</p>
                  <p className="text-sm font-medium text-gray-700">No messages yet</p>
                  <button onClick={() => setShowForm(true)}
                    className="mt-3 px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors">
                    Send first message
                  </button>
                </div>
              )}
              {messages.map(msg => (
                <div key={msg.id} onClick={() => openThread(msg)}
                  className={`bg-white rounded-xl border p-4 cursor-pointer hover:shadow-sm transition-all ${
                    selected?.id === msg.id ? 'border-black' : msg.status === 'unread' ? 'border-gray-400' : 'border-gray-200'
                  }`}>
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {msg.status === 'unread' && <div className="w-2 h-2 rounded-full bg-black flex-shrink-0" />}
                      <p className={`text-sm text-gray-900 ${msg.status === 'unread' ? 'font-semibold' : 'font-medium'}`}>
                        {msg.subject}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize flex-shrink-0 ml-2 ${priorityColor[msg.priority]}`}>
                      {msg.priority}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{new Date(msg.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Thread view */}
          <div>
            {!selected ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <p className="text-2xl mb-2">💬</p>
                <p className="text-sm text-gray-400">Select a message to view the thread</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-900">{selected.subject}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(selected.created_at).toLocaleString()}</p>
                </div>
                <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                  {/* Original message */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs font-medium text-gray-500 mb-1">You</p>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{selected.body}</p>
                  </div>
                  {/* Replies */}
                  {selected.replies?.map(reply => (
                    <div key={reply.id} className={`rounded-lg p-3 ${reply.is_from_team ? 'bg-black text-white ml-4' : 'bg-gray-50 mr-4'}`}>
                      <p className={`text-xs font-medium mb-1 ${reply.is_from_team ? 'text-gray-300' : 'text-gray-500'}`}>
                        {reply.is_from_team ? '🏢 Accountant Team' : 'You'}
                      </p>
                      <p className={`text-sm whitespace-pre-wrap ${reply.is_from_team ? 'text-white' : 'text-gray-800'}`}>
                        {reply.body}
                      </p>
                      <p className={`text-xs mt-1 ${reply.is_from_team ? 'text-gray-400' : 'text-gray-400'}`}>
                        {new Date(reply.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
                {/* Reply box */}
                <div className="p-4 border-t border-gray-100">
                  <form onSubmit={handleReply} className="flex gap-2">
                    <input type="text" value={replyBody} onChange={e => setReplyBody(e.target.value)}
                      placeholder="Type a reply..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black" />
                    <button type="submit" disabled={sending || !replyBody.trim()}
                      className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors">
                      {sending ? '...' : 'Send'}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
