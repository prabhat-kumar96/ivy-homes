'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('demo1@ivy.homes');
  const [password, setPassword] = useState('fc3a4005e1');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login, switchAccount, session } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (session) router.push('/');
  }, [session, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await login(email, password);
      router.push('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string) => {
    setError(null);
    setIsLoading(true);
    try {
      await switchAccount(demoEmail);
      router.push('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8 sm:p-10 w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white text-2xl flex items-center justify-center mx-auto shadow-sm">
            🏡
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Sign In to Ivy Homes</h1>
          <p className="text-xs text-slate-500">Access verified Mumbai real estate datasets & intelligence</p>
        </div>

        {/* 1-Click Demo Login Cards */}
        <div className="space-y-2 pt-2">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quick Sign-In (Demo Accounts)</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {[
              { email: 'demo1@ivy.homes', label: 'Demo 1', role: 'Reviewer' },
              { email: 'demo2@ivy.homes', label: 'Demo 2', role: 'Auditor' },
              { email: 'demo3@ivy.homes', label: 'Demo 3', role: 'QA' },
            ].map(d => (
              <button
                key={d.email}
                type="button"
                onClick={() => handleQuickLogin(d.email)}
                disabled={isLoading}
                className="p-3 bg-slate-50 hover:bg-blue-50/60 border border-slate-200 hover:border-blue-300 rounded-xl text-left transition-all group"
              >
                <p className="text-xs font-bold text-slate-800 group-hover:text-blue-600">{d.label}</p>
                <p className="text-[10px] text-slate-400 font-mono truncate">{d.email}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-slate-200 w-full" />
          <span className="bg-white px-3 text-xs text-slate-400 uppercase font-bold">Or enter credentials</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="demo1@ivy.homes"
              required
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3.5 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3.5 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 text-xs text-red-700 font-medium">
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold text-sm shadow-sm hover:shadow transition-all disabled:opacity-50"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-xs text-slate-500 space-y-1">
          <p className="font-semibold text-slate-700">📌 Authentication Notes:</p>
          <p>• Bearer token expires in 15 minutes (auto-refreshes in background via <code>/auth/refresh</code>).</p>
          <p>• All 3 demo accounts share the password: <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">fc3a4005e1</code></p>
        </div>
      </div>
    </div>
  );
}
