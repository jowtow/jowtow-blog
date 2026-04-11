'use client';

import { useEffect, useState } from 'react';
import { useAuthStore, logoutFromNetlify } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import PostEditor from '@/components/PostEditor/PostEditor';
import SeriesManager from '@/components/SeriesManager/SeriesManager';

type AdminPost = {
  title: string;
  slug: string;
  markdown: string;
  image: string;
  author?: string;
  date?: string;
};

export default function AdminPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'create' | 'series'>('dashboard');
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<AdminPost | null>(null);

  const loadPosts = async () => {
    setPostsLoading(true);
    setPostsError(null);

    try {
      const response = await fetch('/api/posts');
      if (!response.ok) {
        throw new Error('Failed to load posts');
      }

      const data = (await response.json()) as AdminPost[];
      const sortedPosts = data.sort((a, b) => {
        const left = a.date ? Date.parse(a.date) : 0;
        const right = b.date ? Date.parse(b.date) : 0;
        return right - left;
      });

      setPosts(sortedPosts);
    } catch (error) {
      setPostsError(error instanceof Error ? error.message : 'Failed to load posts');
    } finally {
      setPostsLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/admin/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadPosts();
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--color-dark)] text-[var(--text-light)]">
      <nav className="border-b border-[var(--color-secondary)]/30 bg-[var(--color-dark)]/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-[var(--color-secondary)]/80">Control Panel</p>
            <h1 className="text-2xl font-semibold text-[var(--color-primary)]">Admin</h1>
          </div>
          <button
            onClick={async () => {
              await logoutFromNetlify();
              router.push('/');
            }}
            className="border border-red-400/50 bg-red-500/20 hover:bg-red-500/35 text-red-200 font-semibold py-2 px-4 rounded-md cursor-pointer transition-colors"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="rounded-xl border border-[var(--color-secondary)]/35 bg-black/25 shadow-[0_20px_70px_rgba(0,0,0,0.35)] mb-6 overflow-hidden">
          <div className="flex border-b border-[var(--color-secondary)]/25 bg-black/30">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex-1 px-4 py-3 font-medium text-left transition-colors ${
                activeTab === 'dashboard'
                  ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary)]/10'
                  : 'text-[var(--text-light)]/70 hover:text-[var(--text-light)] hover:bg-white/5'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`flex-1 px-4 py-3 font-medium text-left transition-colors ${
                activeTab === 'create'
                  ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary)]/10'
                  : 'text-[var(--text-light)]/70 hover:text-[var(--text-light)] hover:bg-white/5'
              }`}
            >
              {editingPost ? 'Edit Post' : 'Create Post'}
            </button>
            <button
              onClick={() => setActiveTab('series')}
              className={`flex-1 px-4 py-3 font-medium text-left transition-colors ${
                activeTab === 'series'
                  ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary)]/10'
                  : 'text-[var(--text-light)]/70 hover:text-[var(--text-light)] hover:bg-white/5'
              }`}
            >
              Series
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'dashboard' && (
              <div>
                <h2 className="text-xl font-semibold mb-4 text-[var(--color-primary)]">Admin Dashboard</h2>

                <div className="mb-6 p-4 bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/35 rounded-md">
                  <p className="text-[var(--color-primary)]">
                    <strong>Welcome!</strong> You are logged in successfully.
                  </p>
                </div>

                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2 text-[var(--color-secondary)]">User Information</h3>
                  <div className="bg-black/20 border border-[var(--color-secondary)]/25 p-4 rounded-md">
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
                  <h3 className="text-lg font-semibold mb-2 text-[var(--color-secondary)]">Quick Actions</h3>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => {
                        setEditingPost(null);
                        setActiveTab('create');
                      }}
                      className="px-4 py-2 bg-[var(--color-primary)] text-[var(--text-color-dark)] hover:brightness-95 font-semibold rounded-md cursor-pointer transition"
                    >
                      Create New Post
                    </button>
                    <button
                      onClick={() => loadPosts()}
                      className="px-4 py-2 border border-[var(--color-secondary)]/45 bg-black/25 hover:bg-black/40 text-[var(--text-light)] rounded-md cursor-pointer transition"
                    >
                      Refresh Posts
                    </button>
                    <button
                      onClick={() => setActiveTab('series')}
                      className="px-4 py-2 border border-[var(--color-secondary)]/45 bg-black/25 hover:bg-black/40 text-[var(--text-light)] rounded-md cursor-pointer transition"
                    >
                      Manage Series
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <h3 className="text-lg font-semibold text-[var(--color-secondary)]">Manage Existing Posts</h3>
                    <span className="text-sm text-[var(--text-light)]/60">Dynamic admin posts only</span>
                  </div>

                  {postsError && (
                    <div className="mb-4 rounded-md border border-red-400/35 bg-red-500/10 px-4 py-3 text-red-200">
                      {postsError}
                    </div>
                  )}

                  {postsLoading ? (
                    <div className="rounded-md border border-[var(--color-secondary)]/20 bg-black/20 px-4 py-6 text-[var(--text-light)]/70">
                      Loading posts...
                    </div>
                  ) : posts.length === 0 ? (
                    <div className="rounded-md border border-[var(--color-secondary)]/20 bg-black/20 px-4 py-6 text-[var(--text-light)]/70">
                      No admin-created posts yet.
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {posts.map((post) => (
                        <div
                          key={post.slug}
                          className="rounded-lg border border-[var(--color-secondary)]/25 bg-black/20 px-4 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                        >
                          <div>
                            <p className="text-lg font-semibold text-[var(--color-primary)]">{post.title}</p>
                            <p className="text-sm text-[var(--text-light)]/65">/{post.slug}</p>
                            <p className="text-sm text-[var(--text-light)]/65">
                              {post.date || 'No date'}
                              {post.author ? ` • ${post.author}` : ''}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-3">
                            <button
                              onClick={() => {
                                setEditingPost(post);
                                setActiveTab('create');
                              }}
                              className="px-4 py-2 bg-[var(--color-primary)] text-[var(--text-color-dark)] hover:brightness-95 font-semibold rounded-md cursor-pointer transition"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => window.open(`/post/${post.slug}`, '_blank', 'noopener,noreferrer')}
                              className="px-4 py-2 border border-[var(--color-secondary)]/45 bg-black/25 hover:bg-black/40 text-[var(--text-light)] rounded-md cursor-pointer transition"
                            >
                              View
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'create' && (
              <PostEditor
                mode={editingPost ? 'edit' : 'create'}
                initialPost={editingPost}
                onSuccess={() => {
                  loadPosts();
                  setTimeout(() => {
                    setEditingPost(null);
                    setActiveTab('dashboard');
                  }, 1200);
                }}
                onDelete={() => {
                  loadPosts();
                  setEditingPost(null);
                  setActiveTab('dashboard');
                }}
                onCancel={() => {
                  setEditingPost(null);
                  setActiveTab('dashboard');
                }}
              />
            )}

            {activeTab === 'series' && <SeriesManager />}
          </div>
        </div>
      </div>
    </div>
  );
}
