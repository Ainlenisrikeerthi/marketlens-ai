import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import './globals.css';

export const metadata: Metadata = {
  title: 'MarketLens AI | Indian Stock Market Intelligence & Paper Trading',
  description:
    'Professional Indian equity intelligence, deterministic technical indicators, explainable AI research, and zero-capital strategy backtesting.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full">
      <body className="min-h-full flex flex-col bg-[#090d16] text-slate-100 antialiased selection:bg-teal-500/30 selection:text-teal-200">
        <Suspense fallback={<div className="h-16 w-full border-b border-slate-800/80 bg-[#090d16]" />}>
          <Navbar />
        </Suspense>
        <main className="flex-1 w-full">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
