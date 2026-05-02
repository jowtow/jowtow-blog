'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RecoveryPage() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash;
    const netlifyIdentity = (window as Window & {
      netlifyIdentity?: {
        on: (event: string, callback: (user: unknown) => void) => void;
        init: () => void;
        open: (view: string) => void;
      };
    }).netlifyIdentity;

    if (!netlifyIdentity) {
      setError('Netlify Identity not loaded');
      setIsProcessing(false);
      return;
    }

    if (hash.includes('recovery_token')) {
      netlifyIdentity.on('login', () => {
        setIsProcessing(false);
        router.push('/admin');
      });

      netlifyIdentity.init();
      netlifyIdentity.open('recovery');
      return;
    }

    setError('No recovery token found');
    setIsProcessing(false);
  }, [router]);

  if (isProcessing) {
    return (
      <div className="w-full max-w-lg rounded-[22px] border border-[var(--color-secondary)]/30 bg-black/25 px-6 py-8 text-center shadow-[0_20px_70px_rgba(0,0,0,0.32)]">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-secondary)]/70">Account recovery</p>
        <p className="mt-3 text-lg text-[var(--text-light)]/80">Processing password recovery...</p>
        <p className="mt-2 text-sm text-[var(--text-light)]/55">The Netlify Identity widget should open above.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-lg rounded-[22px] border border-red-400/30 bg-red-500/8 px-6 py-8 text-center shadow-[0_20px_70px_rgba(0,0,0,0.28)]">
        <p className="text-sm text-red-200">{error}</p>
        <button
          onClick={() => router.push('/admin/login')}
          className="mt-5 cursor-pointer rounded-md border border-[var(--color-secondary)]/35 bg-black/30 px-4 py-2 text-sm text-[var(--text-light)] transition hover:bg-black/45"
        >
          Back to login
        </button>
      </div>
    );
  }

  return null;
}
