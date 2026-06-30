/**
 * AppShell.tsx — Main layout with custom branding + full responsiveness
 * FIXED: Route matching logic so "Feedback List" is NOT highlighted when on "/feedback/new".
 */
import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import clsx from 'clsx';
// Import your damco logo here
import damcoLogo from "../Assets/damco-logo.png.png";

interface NavItem {
  to:       string;
  icon:     string;   
  label:    string;
  roles?:   string[]; 
}

const ALL_NAV: NavItem[] = [
  { to: '/dashboard',      icon: 'fa-gauge-high',    label: 'Dashboard' },
  { to: '/feedback',       icon: 'fa-list-check',    label: 'Feedback List' },
  { to: '/user-management',icon: 'fa-users-gear', label: 'Users', roles: ['SuperAdmin'] },
  { to: '/category-management',icon: 'fa-tags', label: 'Category Management', roles: ['SuperAdmin'] },
];
export function AppShell() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate  = useNavigate();
  const location  = useLocation();

  const navItems = ALL_NAV.filter((item) =>
    !item.roles || (user?.role && item.roles.includes(user.role))
  );

  const roleLabel: Record<string, string> = {
    SuperAdmin: 'Super Admin',
    Admin:      'Admin',
    Assignee:   'Assignee',
  };

  const roleColor: Record<string, string> = {
    SuperAdmin: 'bg-damco-purple text-damco-white',
    Admin:      'bg-damco-red text-damco-white',
    Assignee:   'bg-damco-yellow text-damco-black', 
  };

  return (
    <div className="flex h-screen h-dvh overflow-hidden bg-[#F8F9FA]">

      {/* SIDEBAR */}
      <aside className={clsx(
        'fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-damco-black transition-transform duration-300',
        'lg:relative lg:translate-x-0 lg:shrink-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>

        {/* ── Brand Name (White Font, Left Aligned) ── */}
        <div className="flex items-center justify-between px-5 py-6 border-b border-white/10">
          <div className="flex flex-col">
            <span className="text-white font-bold text-lg leading-tight text-left">
              Feedback Management
            </span>
            <span className="text-white font-bold text-lg leading-tight text-left">
              System
            </span>
          </div>
          <button onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-damco-white/60 hover:text-damco-white p-1 rounded">
            <i className="fa-solid fa-xmark text-lg" />
          </button>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
          {navItems.map(({ to, icon, label }) => {
            // FIXED: Only highlight "Feedback List" if the exact path is "/feedback".
            // Do not highlight it for "/feedback/new".
            const isExactMatch = to === '/dashboard' || to === '/feedback';
            
            return (
              <NavLink
                key={to}
                to={to}
                end={isExactMatch} // Apply strict end matching to both Dashboard and Feedback
                className={({ isActive }) => clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold transition-all duration-150',
                  isActive
                    ? 'bg-damco-red text-damco-white' 
                    : 'text-damco-white/60 hover:bg-white/10 hover:text-damco-white'
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <i className={`fa-solid ${icon} w-4 text-center`} />
                {label}
              </NavLink>
            );
          })}
        </nav>

        {/* ── User info + Logout ── */}
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${roleColor[user?.role || 'Assignee']}`}>
              {user?.name?.charAt(0) || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-damco-white text-sm font-bold truncate">{user?.name}</p>
              <p className="text-damco-white/50 text-xs">{roleLabel[user?.role || ''] || user?.role}</p>
            </div>
          </div>
          <button onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-damco-white/60 text-sm hover:bg-white/10 hover:text-damco-white transition-colors">
            <i className="fa-solid fa-right-from-bracket text-sm" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Overlay (mobile) */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-damco-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── Top Bar ── */}
        <header className="flex items-center justify-between px-4 lg:px-6 py-3 bg-damco-white border-b border-gray-200 shrink-0 shadow-sm h-[68px]">
          
          {/* Logo container shifted to the left next to hamburger menu */}
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-damco-black/60 hover:bg-gray-100">
              <i className="fa-solid fa-bars text-lg" />
            </button>
            {/* Damco Logo Left Aligned and Increased Size */}
            <img src={damcoLogo} alt="Damco" className="h-12 w-auto object-contain" />
          </div>

          <div className="flex-1 flex justify-center">
            {/* Empty center */}
          </div>

          <div className="flex items-center gap-4">
            {user?.role && ['superadmin', 'admin', 'assignee'].includes(user.role.toLowerCase()) && location.pathname === '/dashboard' && (
              <button onClick={() => navigate('/feedback/new')}
                className="hidden sm:flex btn-primary text-sm py-1.5 px-4 rounded-md font-bold"
                style={{ backgroundColor: '#E32200', color: 'white' }}>
                Add New Feedback
              </button>
            )}

            <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${roleColor[user?.role || 'Assignee']}`}>
                {user?.name?.charAt(0) || '?'}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm text-damco-black font-bold leading-tight">{user?.name}</p>
                <p className="text-xs text-damco-black/50">{roleLabel[user?.role || '']}</p>
              </div>
            </div>
          </div>
        </header>

        {/* ── Page content ── */}
        <main className="flex-1 overflow-y-auto scrollbar-thin pb-16 lg:pb-0">
          <Outlet />
        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="bottom-nav">
        {navItems.slice(0, 4).map(({ to, icon, label }) => {
          // FIXED FOR MOBILE TOO: Ensure exact match logic applies to both dashboard and feedback list
          const isActive = (to === '/dashboard' || to === '/feedback')
            ? location.pathname === to
            : location.pathname.startsWith(to);

          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/dashboard' || to === '/feedback'}
              className={clsx('bottom-nav-item', isActive && 'text-damco-red')}
            >
              <i className={`fa-solid ${icon} text-lg`} />
              <span>{label}</span>
            </NavLink>
          );
        })}
        <button onClick={logout} className="bottom-nav-item text-damco-black/60">
          <i className="fa-solid fa-right-from-bracket text-lg" />
          <span>Sign Out</span>
        </button>
      </nav>
    </div>
  );
}