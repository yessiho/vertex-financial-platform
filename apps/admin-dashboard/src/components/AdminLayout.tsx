'use client';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

const NAV = [
  { label: 'Overview',   href: '/dashboard' },
  { label: 'Entities',   href: '/dashboard/entities' },
  { label: 'Redirects',  href: '/dashboard/redirects' },
  { label: 'Users',      href: '/dashboard/users' },
  { label: 'Audit Log',   href: '/dashboard/audit' },
  { label: 'Teams',        href: '/dashboard/teams' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
  }, [user, isLoading, router]);

  if (isLoading) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-zinc-500 text-sm">Loading...</div>
    </div>
  );

  if (!user) return null;

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-zinc-900 border-r border-zinc-800 flex flex-col">
        <div className="p-5 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center">
              <span className="text-black font-bold text-xs">V</span>
            </div>
            <div>
              <p className="text-white text-sm font-semibold">Vertex</p>
              <p className="text-zinc-500 text-xs">Admin Panel</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                  active
                    ? 'bg-white text-black font-medium'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-zinc-800">
          <div className="px-3 py-2 mb-1">
            <p className="text-xs text-zinc-400 truncate">{user.sub.slice(0, 16)}...</p>
            <p className="text-xs text-zinc-500 capitalize">{user.role}</p>
          </div>
          <button
            onClick={logout}
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
