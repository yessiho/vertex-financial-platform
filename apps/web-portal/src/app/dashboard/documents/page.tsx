'use client';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

const CATEGORIES = ['all','invoice','tax_filing','payroll','bank_statement','report','contract','other'];
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Doc {
  id: string; name: string; category: string;
  mime_type: string; size_bytes: number;
  uploaded_by_name: string; created_at: string;
}

function formatBytes(bytes: number) {
  if (!bytes) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function categoryColor(cat: string) {
  const map: Record<string, string> = {
    invoice: 'bg-blue-50 text-blue-700 border-blue-200',
    tax_filing: 'bg-red-50 text-red-700 border-red-200',
    payroll: 'bg-green-50 text-green-700 border-green-200',
    bank_statement: 'bg-purple-50 text-purple-700 border-purple-200',
    report: 'bg-amber-50 text-amber-700 border-amber-200',
    contract: 'bg-gray-50 text-gray-700 border-gray-200',
    other: 'bg-gray-50 text-gray-500 border-gray-200',
  };
  return map[cat] || map.other;
}

export default function DocumentsPage() {
  const { user, isLoading, token } = useAuth();
  const router = useRouter();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [filtered, setFiltered] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState('other');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
  }, [user, isLoading, router]);

  const fetchDocs = async () => {
    if (!token) return;
    setLoading(true); setError('');
    try {
      const url = activeCategory === 'all'
        ? `${API}/api/v1/documents`
        : `${API}/api/v1/documents?category=${activeCategory}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setDocs(data.data || []);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (user && token) fetchDocs(); }, [user, token, activeCategory]);

  // Filter by search
  useEffect(() => {
    if (!search) { setFiltered(docs); return; }
    setFiltered(docs.filter(d =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.category.toLowerCase().includes(search.toLowerCase())
    ));
  }, [search, docs]);

  const handleUpload = async () => {
    if (!selectedFile || !token) return;
    setUploading(true); setError(''); setSuccess('');
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('category', uploadCategory);
      const res = await fetch(`${API}/api/v1/documents/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setSuccess(`"${selectedFile.name}" uploaded successfully`);
      setSelectedFile(null); setShowUpload(false);
      await fetchDocs();
    } catch (err: any) { setError(err.message); }
    finally { setUploading(false); }
  };

  const handleDownload = async (doc: Doc) => {
    if (!token) return;
    setDownloading(doc.id);
    try {
      const res = await fetch(`${API}/api/v1/documents/${doc.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.data?.download_url) {
        window.open(data.data.download_url, '_blank');
      } else {
        // Fallback: create a placeholder download notification
        setSuccess(`Download requested for "${doc.name}" — Box integration will provide the link`);
      }
    } catch { setError('Download failed'); }
    finally { setDownloading(null); }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) { setSelectedFile(file); setShowUpload(true); }
  };

  if (isLoading || !user) return null;

  const displayDocs = search ? filtered : docs;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="text-gray-400 hover:text-gray-600 text-lg">←</button>
          <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center">
            <span className="text-white font-bold text-sm">V</span>
          </div>
          <span className="font-semibold text-gray-900">Documents</span>
        </div>
        <button onClick={() => setShowUpload(true)}
          className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors">
          + Upload
        </button>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {error && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
        {success && <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">✓ {success}</div>}

        {showUpload && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">Upload Document</h2>
              <button onClick={() => { setShowUpload(false); setSelectedFile(null); }} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>
            <div onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)} onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors mb-4 ${
                dragOver ? 'border-black bg-gray-50' : 'border-gray-300 hover:border-gray-400'
              }`}>
              <input ref={fileRef} type="file" className="hidden"
                onChange={e => e.target.files?.[0] && setSelectedFile(e.target.files[0])} />
              {selectedFile ? (
                <div>
                  <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{formatBytes(selectedFile.size)}</p>
                </div>
              ) : (
                <div>
                  <p className="text-2xl mb-2">📄</p>
                  <p className="text-sm text-gray-600">Drop a file here or <span className="text-black font-medium">browse</span></p>
                  <p className="text-xs text-gray-400 mt-1">Max 50MB</p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                <select value={uploadCategory} onChange={e => setUploadCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black">
                  {CATEGORIES.filter(c => c !== 'all').map(c => (
                    <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <button onClick={handleUpload} disabled={uploading || !selectedFile}
                className="px-6 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors mt-5">
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        )}

        {/* Search + filters */}
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search documents..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black" />
          </div>
        </div>

        <div className="flex gap-2 flex-wrap mb-6">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors capitalize ${
                activeCategory === cat
                  ? 'bg-black text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
              }`}>
              {cat.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Name</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Category</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Size</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Uploaded by</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-gray-400">Loading...</td></tr>}
              {!loading && displayDocs.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-gray-400">
                  {search ? `No documents matching "${search}"` : 'No documents yet. Upload your first document above.'}
                </td></tr>
              )}
              {displayDocs.map((doc, i) => (
                <tr key={doc.id} className={`hover:bg-gray-50 ${i < displayDocs.length - 1 ? 'border-b border-gray-100' : ''}`}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {doc.mime_type?.includes('pdf') ? '📄' :
                         doc.mime_type?.includes('image') ? '🖼️' :
                         doc.mime_type?.includes('sheet') ? '📊' : '📎'}
                      </span>
                      <span className="text-sm text-gray-900 font-medium">{doc.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${categoryColor(doc.category)}`}>
                      {doc.category.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-500">{formatBytes(doc.size_bytes)}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-500">{doc.uploaded_by_name}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-500">{new Date(doc.created_at).toLocaleDateString()}</td>
                  <td className="px-5 py-3.5 text-right">
                    <button onClick={() => handleDownload(doc)}
                      disabled={downloading === doc.id}
                      className="text-xs text-gray-500 hover:text-black border border-gray-200 hover:border-gray-400 rounded px-2 py-1 transition-colors disabled:opacity-50">
                      {downloading === doc.id ? '...' : '⬇ Download'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
