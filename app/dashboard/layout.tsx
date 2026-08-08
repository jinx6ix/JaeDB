'use client';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import AgentChatPanel from '@/components/AgentChatPanel';
import GlobalSearch from '@/components/GlobalSearch';
import {
  LayoutDashboard, Users2, Bot, Users, BookOpen, Ticket,
  FileText, Map, Compass, Calculator, Table2, BarChart3,
  Building2, PenLine, UserCog, LogOut, Menu, X,
  CalendarDays, ShieldCheck,
} from 'lucide-react';

const nav = [
  { label: 'Dashboard',      href: '/dashboard',                  icon: LayoutDashboard, adminOnly: false },
  { label: 'Agents',         href: '/dashboard/agents',           icon: Users2,          adminOnly: false },
  { label: 'AI Agents',      href: '/dashboard/ai-agents',        icon: Bot,             adminOnly: false },
  { label: 'Clients',        href: '/dashboard/clients',          icon: Users,           adminOnly: false },
  { label: 'Bookings',       href: '/dashboard/bookings',         icon: BookOpen,        adminOnly: false },
  { label: 'Vouchers',       href: '/dashboard/vouchers',         icon: Ticket,          adminOnly: false },
  { label: 'Invoices',       href: '/dashboard/invoices',         icon: FileText,        adminOnly: false },
  { label: 'Itineraries',    href: '/dashboard/itineraries',      icon: Map,             adminOnly: false },
  { label: 'Tours',          href: '/dashboard/tours',            icon: Compass,         adminOnly: false },
  { label: 'Costing',        href: '/dashboard/costing',          icon: Calculator,      adminOnly: false },
  { label: 'Cost Sheets',    href: '/dashboard/cost-sheets',      icon: Table2,          adminOnly: false },
  { label: 'Reports',        href: '/dashboard/reports',          icon: BarChart3,       adminOnly: false },
  { label: 'Contract Rates', href: '/dashboard/safari-rates',     icon: Building2,       adminOnly: false },
  { label: 'Amend Voucher',  href: '/dashboard/vouchers/amend',   icon: PenLine,         adminOnly: false },
  { label: 'Users',          href: '/dashboard/admin/users',      icon: UserCog,         adminOnly: true  },
];

function NavItem({
  item,
  active,
  collapsed,
}: {
  item: typeof nav[0];
  active: boolean;
  collapsed: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={`
        flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group
        ${active
          ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30'
          : 'text-gray-400 hover:bg-white/8 hover:text-white'
        }
      `}
    >
      <Icon
        size={16}
        strokeWidth={active ? 2.5 : 1.8}
        className="flex-shrink-0"
      />
      {!collapsed && <span className="leading-none truncate">{item.label}</span>}
    </Link>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile menu on navigation
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Collapse sidebar on small desktops by default
  useEffect(() => {
    const check = () => { if (window.innerWidth < 1100) setCollapsed(true); };
    check();
  }, []);

  if (status === 'loading') return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-[3px] border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-gray-400 text-sm">Loading…</p>
      </div>
    </div>
  );

  if (status === 'unauthenticated') {
    if (typeof window !== 'undefined') window.location.href = '/login';
    return null;
  }

  const isAdmin = (session?.user as any)?.role === 'ADMIN';
  const userName = session?.user?.name || 'User';
  const userInitial = userName.charAt(0).toUpperCase();
  const filteredNav = nav.filter(n => !n.adminOnly || isAdmin);

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <aside
      className={`
        ${mobile ? 'w-64' : collapsed ? 'w-[68px]' : 'w-60'}
        bg-[#0f172a] text-white flex flex-col
        ${mobile ? '' : 'transition-[width] duration-300 ease-in-out'}
        flex-shrink-0 h-full overflow-hidden
      `}
    >
      {/* Brand */}
      <div className={`flex items-center gap-3 border-b border-white/8 flex-shrink-0 ${collapsed && !mobile ? 'px-[14px] py-4 justify-center' : 'px-4 py-4'}`}>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-lg shadow-orange-500/20">
          JT
        </div>
        {(!collapsed || mobile) && (
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[13px] leading-tight text-white">Jae Travel</p>
            <p className="text-orange-400 text-[11px] tracking-wider font-medium">Expeditions</p>
          </div>
        )}
        {mobile && (
          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto scrollbar-none">
        {filteredNav.map((item) => {
          const active = pathname === item.href
            || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));
          return (
            <NavItem key={item.href} item={item} active={active} collapsed={collapsed && !mobile} />
          );
        })}
      </nav>

      {/* User footer */}
      <div className={`border-t border-white/8 flex-shrink-0 ${collapsed && !mobile ? 'p-2' : 'p-3'}`}>
        {(!collapsed || mobile) ? (
          <>
            <div className="flex items-center gap-2.5 px-1 mb-2">
              <div className="w-8 h-8 rounded-full bg-orange-500/15 border border-orange-500/25 flex items-center justify-center text-orange-400 font-bold text-xs flex-shrink-0">
                {userInitial}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-white truncate">{userName}</p>
                <p className="text-[11px] text-gray-500">{isAdmin ? 'Admin' : 'Employee'}</p>
              </div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="w-full flex items-center gap-2 text-[12px] text-gray-500 hover:text-red-400 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <LogOut size={13} />
              Sign out
            </button>
          </>
        ) : (
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            title="Sign out"
            className="w-full flex justify-center py-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-white/5 transition-colors"
          >
            <LogOut size={16} />
          </button>
        )}
      </div>
    </aside>
  );

  return (
    <div className="h-screen flex bg-gray-50 overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:block flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile: overlay + drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 md:hidden">
            <Sidebar mobile />
          </div>
        </>
      )}

      {/* Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 md:px-5 py-3 flex items-center gap-3 flex-shrink-0">
          {/* Mobile: hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-2 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          {/* Desktop: collapse toggle */}
          <button
            onClick={() => setCollapsed(v => !v)}
            className="hidden md:flex p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Toggle sidebar"
          >
            <Menu size={18} />
          </button>

          <div className="flex-1 min-w-0">
            <GlobalSearch />
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="hidden lg:flex items-center gap-1.5 text-xs text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
              <CalendarDays size={12} />
              {new Date().toLocaleDateString('en-KE', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
            {isAdmin && (
              <span className="flex items-center gap-1.5 bg-orange-50 text-orange-700 border border-orange-200 px-2.5 py-1.5 rounded-full text-xs font-semibold">
                <ShieldCheck size={11} />
                <span className="hidden sm:inline">Admin</span>
              </span>
            )}
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>

      <AgentChatPanel />
    </div>
  );
}
