'use client';

import { useEffect } from 'react';
import { useAuthStore, logoutFromNetlify } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/admin/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="bg-white rounded-lg shadow p-8">
        <h1 className="text-3xl font-bold mb-4">Admin Dashboard</h1>
        
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded">
          <p className="text-green-800">
            <strong>Welcome!</strong> You are logged in successfully.
          </p>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">User Information</h2>
          <div className="bg-gray-50 p-4 rounded">
            <p className="mb-2">
              <strong>Email:</strong> {user?.email}
            </p>
            {user?.user_metadata?.full_name && (
              <p>
                <strong>Name:</strong> {user.user_metadata.full_name}
              </p>
            )}
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Admin Features</h2>
          <p className="text-gray-600 mb-4">This is your admin dashboard. You can add custom admin features here.</p>
        </div>

        <button
          onClick={async () => {
            await logoutFromNetlify();
            router.push('/');
          }}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded cursor-pointer"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
