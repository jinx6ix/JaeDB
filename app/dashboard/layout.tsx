'use client';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { redirect } from 'next/navigation';

const nav = [
  { label: 'Dashboard', href: '/dashboard', icon: '⊞', adminOnly: false },
  { label: 'Agents', href: '/dashboard/agents', icon: '🤝', adminOnly: false },
  { label: 'Clients', href: '/dashboard/clients', icon: '👥', adminOnly: false },
  { label: 'Bookings', href: '/dashboard/bookings', icon: '📋', adminOnly: false },
  { label: 'Vouchers', href: '/dashboard/vouchers', icon: '🎫', adminOnly: false },
  { label: 'Itineraries', href: '/dashboard/itineraries', icon: '🗺️', adminOnly: false },
  { label: 'Tours', href: '/dashboard/tours', icon: '🦁', adminOnly: false },
  { label: 'Costing', href: '/dashboard/costing', icon: '💰', adminOnly: false },
  { label: 'Reports', href: '/dashboard/reports', icon: '📊', adminOnly: false },
  { label: 'Contract Rates', href: '/dashboard/safari-rates', icon: '🏨', adminOnly: false },
  { label: 'Amend Voucher', href: '/dashboard/vouchers/amend', icon: '✏️', adminOnly: false },
  { label: 'Users', href: '/dashboard/admin/users', icon: '🔑', adminOnly: true },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (status === 'loading') return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Loading…</p>
      </div>
    </div>
  );

  if (status === 'unauthenticated') {
    if (typeof window !== 'undefined') window.location.href = '/login';
    return null;
  }

  const isAdmin = (session?.user as any)?.role === 'ADMIN';
  const userName = session?.user?.name || 'User';

  const filteredNav = nav.filter(n => !n.adminOnly || isAdmin);

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-60' : 'w-16'} bg-[#1a1a2e] text-white flex flex-col transition-all duration-300 flex-shrink-0`}>
        {/* Logo */}
        <div className="p-4 border-b border-white/10 flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
            JT
          </div>
          {sidebarOpen && (
            <div>
              <p className="font-bold text-sm leading-none">Jae Travel</p>
              <p className="text-orange-400 text-xs">Expeditions</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
          {filteredNav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="text-base flex-shrink-0">{item.icon}</span>
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User info */}
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500/30 rounded-full flex items-center justify-center text-orange-400 font-bold text-xs flex-shrink-0">
              {userName.charAt(0).toUpperCase()}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">{userName}</p>
                <p className="text-xs text-gray-400">{isAdmin ? 'Admin' : 'Employee'}</p>
              </div>
            )}
          </div>
          {sidebarOpen && (
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="mt-2 w-full text-left text-xs text-gray-400 hover:text-red-400 px-2 py-1 rounded transition-colors"
            >
              Sign out →
            </button>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100"
          >
            ☰
          </button>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span>
              {new Date().toLocaleDateString('en-KE', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
              })}
            </span>
            {isAdmin && (
              <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs font-medium">
                Admin
              </span>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
