import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Mail,
  Key,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  UserCheck,
  Sparkles,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectedFrom = searchParams.get('redirectedFrom') || '/dashboard';

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!isSupabaseConfigured() || !supabase) {
      setError('Supabase is not configured yet. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      return;
    }

    setIsLoading(true);

    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName || email.split('@')[0] },
          },
        });

        if (signUpError) {
          setError(signUpError.message);
          return;
        }

        if (data.session) {
          setSuccessMessage('Account created and verified! Redirecting to dashboard...');
          setTimeout(() => {
            navigate(redirectedFrom);
          }, 800);
        } else {
          setSuccessMessage(
            'Account created! If email confirmation is enabled on your Supabase project, please check your inbox to confirm your address before signing in.'
          );
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          setError(signInError.message);
          return;
        }

        navigate(redirectedFrom);
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestAccess = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400 mb-2">
            <TrendingUp className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            {isSignUp ? 'Create your MarketLens Account' : 'Sign in to MarketLens AI'}
          </h1>
          <p className="text-xs text-slate-400">
            Access private watchlists, threshold alerts, and paper trading simulations.
          </p>
        </div>

        {/* Guest Fast Track Callout */}
        <div className="rounded-xl border border-teal-800/40 bg-teal-950/20 p-4 space-y-3">
          <div className="flex items-center gap-2 text-teal-300 text-xs font-semibold">
            <Sparkles className="h-4 w-4 text-teal-400" />
            <span>Explore Without an Account</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Market data, real-time charts, backtesting, and AI research are fully accessible as a guest.
            Sign in or register to sync your private watchlists and price alerts across devices.
          </p>
          <button
            onClick={handleGuestAccess}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-3 text-xs transition cursor-pointer"
          >
            <span>Continue as Guest</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Form Container */}
        <div className="rounded-xl border border-slate-800 bg-[#0e1424] p-6 shadow-md space-y-5">
          {error && (
            <div className="rounded-lg bg-rose-950/80 border border-rose-800 p-3 text-xs text-rose-300 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="rounded-lg bg-teal-950/80 border border-teal-800 p-3 text-xs text-teal-300 text-center">
              {successMessage}
            </div>
          )}

          {!isSupabaseConfigured() && (
            <div className="rounded-lg bg-amber-950/80 border border-amber-800 p-3 text-[11px] text-amber-300 leading-relaxed">
              <strong>Supabase not configured.</strong> Authentication requires{' '}
              <code className="text-amber-200">VITE_SUPABASE_URL</code> and{' '}
              <code className="text-amber-200">VITE_SUPABASE_PUBLISHABLE_KEY</code> in environment variables.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {isSignUp && (
              <div>
                <label htmlFor="display-name" className="block text-slate-400 font-medium mb-1">
                  Display Name (optional)
                </label>
                <input
                  id="display-name"
                  type="text"
                  placeholder="e.g. Priya Sharma"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-2 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none"
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-slate-400 font-medium mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/90 pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-slate-400 font-medium mb-1">
                Password {isSignUp && <span className="text-slate-500">(min. 8 characters)</span>}
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={isSignUp ? 8 : 1}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/90 pl-9 pr-10 py-2 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              id="auth-submit-btn"
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-teal-500 hover:bg-teal-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 py-2.5 text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserCheck className="h-4 w-4" />
              )}
              <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
            </button>
          </form>

          <div className="text-center pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setSuccessMessage(null);
              }}
              className="text-xs text-teal-400 hover:underline cursor-pointer"
            >
              {isSignUp
                ? 'Already have an account? Sign in'
                : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>

        <div className="text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-teal-500" />
          <span>Secured by Supabase Auth with Row Level Security</span>
        </div>
      </div>
    </div>
  );
}
