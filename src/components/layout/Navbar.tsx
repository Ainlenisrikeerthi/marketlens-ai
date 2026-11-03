'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  TrendingUp,
  LayoutDashboard,
  LineChart,
  Newspaper,
  FlaskConical,
  Bookmark,
  User,
  Menu,
  X,
  LogOut,
  Bell,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Check Supabase is configured before creating client
  const isSupabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const supabase = createClient();

    // Get initial session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [isSupabaseConfigured]);

  const handleSignOut = async () => {
    if (!isSupabaseConfigured) return;
    setIsSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    router.push('/');
    router.refresh();
    setIsSigningOut(false);
  };

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/stocks/NSE_EQ|INE002A01018', label: 'Analyze', icon: LineChart },
    { href: '/news', label: 'News Radar', icon: Newspaper },
    { href: '/strategy', label: 'Strategy Lab', icon: FlaskConical },
    { href: '/watchlist', label: 'Watchlist', icon: Bookmark },
    { href: '/alerts', label: 'Alerts', icon: Bell },
  ];

  const isActive = (path: string) => {
    if (path.startsWith('/stocks/')) {
      return pathname.startsWith('/stocks');
    }
    return pathname === path;
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-[#090d16]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-400 group-hover:border-teal-400 transition-colors">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold tracking-tight text-white flex items-center gap-1.5 text-base">
                MarketLens{' '}
                <span className="text-teal-400 font-extrabold text-xs uppercase px-1.5 py-0.5 rounded bg-teal-950/60 border border-teal-800">
                  AI
                </span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono tracking-wider">
                INDIAN MARKETS
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    active
                      ? 'bg-slate-800 text-teal-300 border border-slate-700/80'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right side: auth */}
        <div className="hidden sm:flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 hidden lg:block">
                {user.email}
              </span>
              <button
                id="navbar-signout-btn"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="flex items-center gap-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 px-3.5 py-1.5 text-xs font-medium text-slate-200 transition hover:border-slate-600"
              >
                <LogOut className="h-3.5 w-3.5 text-rose-400" />
                <span>{isSigningOut ? 'Signing out...' : 'Sign Out'}</span>
              </button>
            </div>
          ) : (
            <Link
              href="/auth"
              id="navbar-signin-btn"
              className="flex items-center gap-2 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 px-3.5 py-1.5 text-xs font-medium text-teal-300 transition"
            >
              <User className="h-3.5 w-3.5" />
              <span>Sign In</span>
            </Link>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation"
            className="p-2 rounded-lg bg-slate-800/80 text-slate-300 hover:text-white border border-slate-700"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-800 bg-[#0e1424] px-4 pt-2 pb-6 space-y-3">
          {user && (
            <div className="text-xs text-slate-400 pb-2 border-b border-slate-800">
              Signed in as <span className="text-teal-300">{user.email}</span>
            </div>
          )}

          <div className="space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                    active
                      ? 'bg-slate-800 text-teal-300 border border-slate-700'
                      : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-800">
            {user ? (
              <button
                onClick={() => { handleSignOut(); setMobileMenuOpen(false); }}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-800 border border-slate-700 py-2 text-sm font-medium text-slate-300"
              >
                <LogOut className="h-4 w-4 text-rose-400" />
                <span>Sign Out</span>
              </button>
            ) : (
              <Link
                href="/auth"
                onClick={() => setMobileMenuOpen(false)}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-500/10 border border-teal-500/30 py-2 text-sm font-medium text-teal-300"
              >
                <User className="h-4 w-4" />
                <span>Sign In</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
