import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft, TrendingUp } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="space-y-6 max-w-md">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-500/10 border border-teal-500/20 mx-auto">
          <TrendingUp className="h-8 w-8 text-teal-400" />
        </div>
        <div className="text-8xl font-black text-slate-800 select-none">404</div>
        <h1 className="text-2xl font-bold text-white">Page Not Found</h1>
        <p className="text-slate-400 text-sm leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has been moved. Use the navigation to find what you need.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold px-5 py-2.5 text-sm transition"
          >
            <Home className="h-4 w-4" />
            <span>Go Home</span>
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium px-5 py-2.5 text-sm transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Go Back</span>
          </button>
        </div>
      </div>
    </div>
  );
}

