'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RecoveryPage() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash;
    const netlifyIdentity = (window as any).netlifyIdentity;

    if (!netlifyIdentity) {
      setError('Netlify Identity not loaded');
      setIsProcessing(false);
      return;
    }

    // Check if there's a recovery token in the URL
    if (hash.includes('recovery_token')) {
      // The widget should automatically detect the token
      // This page just needs to exist and let the widget handle it
      netlifyIdentity.on('login', (user: any) => {
        // After recovery/password change, redirect to admin
        setIsProcessing(false);
        router.push('/admin');
      });

      netlifyIdentity.init();
      netlifyIdentity.open('recovery');
    } else {
      setError('No recovery token found');
      setIsProcessing(false);
    }
  }, [router]);

  if (isProcessing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-xl mb-4">Processing password recovery...</p>
          <p className="text-gray-600">The Netlify Identity widget should open above.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/admin/login')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded cursor-pointer"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return null;
}
