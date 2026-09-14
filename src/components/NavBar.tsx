'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';

export function NavBar() {
  const { session, logout, switchAccount, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [showSwitch, setShowSwitch] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const handleSwitch = async (email: string) => {
    setShowSwitch(false);
    await switchAccount(email);
  };

  const navLink = (href: string, label: string) => {
    const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
    return (
      <Link
        href={href}
        className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
          isActive
            ? 'bg-blue-600 text-white shadow-sm'
            : 'text-slate-300 hover:text-white hover:bg-slate-800'
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <nav className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-base shadow-sm group-hover:bg-blue-500 transition-colors">
              🏡
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white block leading-none">Ivy Homes</span>
              <span className="text-[11px] text-blue-400 font-medium tracking-wide uppercase">Mumbai Market</span>
            </div>
          </Link>
        </div>

        {/* Links */}
        <div className="hidden md:flex items-center gap-1.5 bg-slate-800/60 p-1 rounded-xl border border-slate-700/50">
          {navLink('/', 'Listings')}
          {navLink('/rentals', 'Rentals')}
          {navLink('/projects', 'Projects')}
          {session && navLink('/saved', 'Saved')}
          {navLink('/insights', 'Insights')}
        </div>

        {/* Auth Section */}
        <div className="flex items-center gap-3">
          {isLoading ? (
            <div className="w-24 h-8 bg-slate-800 rounded-lg animate-pulse" />
          ) : session ? (
            <div className="relative flex items-center gap-2">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs text-slate-400 font-medium">Logged in</span>
                <span className="text-xs text-white font-semibold">{session.email}</span>
              </div>

              {/* Account Switcher Button */}
              <div className="relative">
                <button
                  onClick={() => setShowSwitch(!showSwitch)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1.5"
                >
                  <span>Switch</span>
                  <span className="text-[10px]">▼</span>
                </button>

                {showSwitch && (
                  <div className="absolute right-0 mt-2 w-48 bg-white text-slate-900 rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs animate-in fade-in">
                    <p className="px-3 py-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider">Demo Accounts</p>
                    {['demo1@ivy.homes', 'demo2@ivy.homes', 'demo3@ivy.homes'].map(email => (
                      <button
                        key={email}
                        onClick={() => handleSwitch(email)}
                        className={`w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center justify-between ${session.email === email ? 'font-bold text-blue-600 bg-blue-50/50' : 'text-slate-700'}`}
                      >
                        <span>{email}</span>
                        {session.email === email && <span>✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={handleLogout}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg text-sm font-semibold shadow-sm transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>

      {/* Mobile nav bar */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-800 px-2 py-1.5 text-xs bg-slate-900/90">
        <Link href="/" className={`px-2 py-1 ${pathname === '/' ? 'text-blue-400 font-bold' : 'text-slate-400'}`}>Listings</Link>
        <Link href="/rentals" className={`px-2 py-1 ${pathname.startsWith('/rentals') ? 'text-blue-400 font-bold' : 'text-slate-400'}`}>Rentals</Link>
        <Link href="/projects" className={`px-2 py-1 ${pathname.startsWith('/projects') ? 'text-blue-400 font-bold' : 'text-slate-400'}`}>Projects</Link>
        {session && <Link href="/saved" className={`px-2 py-1 ${pathname.startsWith('/saved') ? 'text-blue-400 font-bold' : 'text-slate-400'}`}>Saved</Link>}
        <Link href="/insights" className={`px-2 py-1 ${pathname.startsWith('/insights') ? 'text-blue-400 font-bold' : 'text-slate-400'}`}>Insights</Link>
      </div>
    </nav>
  );
}
