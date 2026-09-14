'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export function NavBar() {
  const { session, logout, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const navLink = (href: string, label: string) => (
    <Link
      href={href}
      className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
        pathname === href || pathname.startsWith(href + '/')
          ? 'bg-blue-700 text-white'
          : 'text-blue-100 hover:text-white hover:bg-blue-700'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <nav className="bg-blue-900 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-bold tracking-tight text-white">
            🏠 Ivy Homes
          </Link>
          <span className="text-blue-300 text-sm">Mumbai</span>
        </div>
        <div className="flex items-center gap-1">
          {navLink('/', 'Listings')}
          {navLink('/rentals', 'Rentals')}
          {navLink('/projects', 'Projects')}
          {session && navLink('/saved', 'Saved')}
          {navLink('/insights', 'Insights')}
        </div>
        <div className="flex items-center gap-3">
          {isLoading ? null : session ? (
            <>
              <span className="text-blue-300 text-sm">{session.email}</span>
              <button
                onClick={handleLogout}
                className="bg-blue-700 hover:bg-blue-600 px-3 py-1.5 rounded text-sm font-medium transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="bg-white text-blue-900 hover:bg-blue-50 px-4 py-1.5 rounded text-sm font-semibold transition-colors"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
