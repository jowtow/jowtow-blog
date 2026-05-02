'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuthStore, logoutFromNetlify } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import PostEditor from '@/components/PostEditor/PostEditor';
import SeriesManager from '@/components/SeriesManager/SeriesManager';
import CollectionsManager from '@/components/CollectionsManager/CollectionsManager';
import ImagesManager from '@/components/ImagesManager/ImagesManager';

type AdminPost = {
  title: string;
  slug: string;
  markdown: string;
  image: string;
  author?: string;
  date?: string;
};

type AdminTabKey = 'dashboard' | 'create' | 'series' | 'collections' | 'images';
type AdminLayoutMode = 'constrained' | 'wide';

const tabs: Array<{ key: AdminTabKey; label: string; mode: AdminLayoutMode }> = [
  { key: 'dashboard', label: 'Dashboard', mode: 'constrained' },
  { key: 'create', label: 'Create', mode: 'constrained' },
  { key: 'series', label: 'Series', mode: 'wide' },
  { key: 'collections', label: 'Collections', mode: 'wide' },
  { key: 'images', label: 'Images', mode: 'wide' },
];

export default function AdminPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [activeTab, setActiveTab] = useState<AdminTabKey>('dashboard');
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<AdminPost | null>(null);

  const activeTabConfig = useMemo(
    () => tabs.find((tab) => tab.key === activeTab) ?? tabs[0],
    [activeTab],
  );

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
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--color-dark)] text-[var(--text-light)]">
      <nav className="border-b border-[var(--color-secondary)]/30 bg-[var(--color-dark)]/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1680px] items-center justify-between gap-4 px-4 py-4 lg:px-6">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-[var(--color-secondary)]/80">Control Panel</p>
            <h1 className="text-2xl font-semibold text-[var(--color-primary)]">Admin</h1>
          </div>
          <button
            onClick={async () => {
              await logoutFromNetlify();
              router.push('/');
            }}
            className="cursor-pointer rounded-md border border-red-400/50 bg-red-500/20 px-4 py-2 font-semibold text-red-200 transition-colors hover:bg-red-500/35"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="mx-auto w-full max-w-[1680px] px-4 py-6 lg:px-6 lg:py-8">
        <div className="overflow-hidden rounded-2xl border border-[var(--color-secondary)]/35 bg-black/25 shadow-[0_20px_70px_rgba(0,0,0,0.35)]">
          <div className="border-b border-[var(--color-secondary)]/25 bg-black/30 px-3 py-3 lg:px-4">
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => {
                const isActive = tab.key === activeTab;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`min-w-[120px] rounded-lg px-4 py-3 text-left font-medium transition-colors ${
                      isActive
                        ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/50'
                        : 'text-[var(--text-light)]/70 hover:bg-white/5 hover:text-[var(--text-light)]'
                    }`}
                  >
                    {tab.key === 'create' && editingPost ? 'Edit Post' : tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className={
              activeTabConfig.mode === 'wide'
                ? 'w-full px-4 py-4 lg:px-5 lg:py-5'
                : 'mx-auto w-full max-w-6xl px-4 py-6'
            }
          >
            {activeTab === 'dashboard' && (
              <div>
                <h2 className="mb-4 text-xl font-semibold text-[var(--color-primary)]">Admin Dashboard</h2>

                <div className="mb-6 rounded-md border border-[var(--color-primary)]/35 bg-[var(--color-primary)]/10 p-4">
                  <p className="text-[var(--color-primary)]">
                    <strong>Welcome!</strong> You are logged in successfully.
                  </p>
                </div>

                <div className="mb-6">
                  <h3 className="mb-2 text-lg font-semibold text-[var(--color-secondary)]">User Information</h3>
                  <div className="rounded-md border border-[var(--color-secondary)]/25 bg-black/20 p-4">
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
                  <h3 className="mb-2 text-lg font-semibold text-[var(--color-secondary)]">Quick Actions</h3>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => {
                        setEditingPost(null);
                        setActiveTab('create');
                      }}
                      className="cursor-pointer rounded-md bg-[var(--color-primary)] px-4 py-2 font-semibold text-[var(--text-color-dark)] transition hover:brightness-95"
                    >
                      Create New Post
                    </button>
                    <button
                      onClick={() => loadPosts()}
                      className="cursor-pointer rounded-md border border-[var(--color-secondary)]/45 bg-black/25 px-4 py-2 text-[var(--text-light)] transition hover:bg-black/40"
                    >
                      Refresh Posts
                    </button>
                    <button
                      onClick={() => setActiveTab('series')}
                      className="cursor-pointer rounded-md border border-[var(--color-secondary)]/45 bg-black/25 px-4 py-2 text-[var(--text-light)] transition hover:bg-black/40"
                    >
                      Manage Series
                    </button>
                    <button
                      onClick={() => setActiveTab('collections')}
                      className="cursor-pointer rounded-md border border-[var(--color-secondary)]/45 bg-black/25 px-4 py-2 text-[var(--text-light)] transition hover:bg-black/40"
                    >
                      Manage Collections
                    </button>
                    <button
                      onClick={() => setActiveTab('images')}
                      className="cursor-pointer rounded-md border border-[var(--color-secondary)]/45 bg-black/25 px-4 py-2 text-[var(--text-light)] transition hover:bg-black/40"
                    >
                      Manage Images
                    </button>
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between gap-4">
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
                          className="flex flex-col gap-4 rounded-lg border border-[var(--color-secondary)]/25 bg-black/20 px-4 py-4 md:flex-row md:items-center md:justify-between"
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
                              className="cursor-pointer rounded-md bg-[var(--color-primary)] px-4 py-2 font-semibold text-[var(--text-color-dark)] transition hover:brightness-95"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => window.open(`/post/${post.slug}`, '_blank', 'noopener,noreferrer')}
                              className="cursor-pointer rounded-md border border-[var(--color-secondary)]/45 bg-black/25 px-4 py-2 text-[var(--text-light)] transition hover:bg-black/40"
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

            {activeTab === 'collections' && <CollectionsManager />}

            {activeTab === 'images' && <ImagesManager />}
          </div>
        </div>
      </div>
    </div>
  );
}
