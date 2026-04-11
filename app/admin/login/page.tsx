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
    // Show message after a short delay
    const timer = setTimeout(() => setShowMessage(true), 500);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-xl mb-4">Initializing authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center max-w-md">
        <h1 className="text-3xl font-bold mb-6">Admin Login</h1>
        {showMessage && (
          <div className="mb-6 p-4 bg-blue-100 text-blue-800 rounded">
            <p className="mb-4">Click the button below to log in with Netlify Identity</p>
            <button
              onClick={loginWithNetlify}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded cursor-pointer"
            >
              Login with Netlify Identity
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
