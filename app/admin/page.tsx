'use client';

import { useEffect, useState } from 'react';
import { useAuthStore, logoutFromNetlify } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import PostEditor from '@/components/PostEditor/PostEditor';

export default function AdminPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'create'>('dashboard');

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
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Admin</h1>
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
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex-1 px-4 py-3 font-medium text-left ${
                activeTab === 'dashboard'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`flex-1 px-4 py-3 font-medium text-left ${
                activeTab === 'create'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Create Post
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'dashboard' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Admin Dashboard</h2>

                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded">
                  <p className="text-green-800">
                    <strong>Welcome!</strong> You are logged in successfully.
                  </p>
                </div>

                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">User Information</h3>
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
                  <h3 className="text-lg font-semibold mb-2">Quick Actions</h3>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
                  >
                    Create New Post
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'create' && (
              <PostEditor
                onSuccess={() => {
                  setTimeout(() => setActiveTab('dashboard'), 2000);
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
