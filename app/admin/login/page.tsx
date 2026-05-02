'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, loginWithNetlify } from '@/lib/auth';

export default function AdminLoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/admin');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    const timer = setTimeout(() => setShowMessage(true), 500);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="w-full max-w-lg rounded-[22px] border border-[var(--color-secondary)]/30 bg-black/25 px-6 py-8 text-center shadow-[0_20px_70px_rgba(0,0,0,0.32)]">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-secondary)]/70">Admin access</p>
        <p className="mt-3 text-lg text-[var(--text-light)]/80">Initializing authentication...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg rounded-[22px] border border-[var(--color-secondary)]/30 bg-black/25 px-6 py-8 shadow-[0_20px_70px_rgba(0,0,0,0.32)]">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-secondary)]/70">Admin access</p>
      <h1 className="mt-2 text-2xl font-semibold text-[var(--color-primary)]">Sign in</h1>
      <p className="mt-2 text-sm text-[var(--text-light)]/65">
        Use Netlify Identity to enter the compact admin workspace.
      </p>

      {showMessage && (
        <div className="mt-5 rounded-xl border border-[var(--color-secondary)]/20 bg-black/20 p-4">
          <p className="mb-4 text-sm text-[var(--text-light)]/75">
            Continue with the site&apos;s Netlify Identity flow.
          </p>
          <button
            onClick={loginWithNetlify}
            className="cursor-pointer rounded-md bg-[var(--color-primary)] px-4 py-2 font-semibold text-[var(--text-color-dark)] transition hover:brightness-95"
          >
            Login with Netlify Identity
          </button>
        </div>
      )}
    </div>
  );
}
