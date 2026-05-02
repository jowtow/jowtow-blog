'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/lib/auth';
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
      void loadPosts();
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return <div className="flex h-full min-h-[40vh] items-center justify-center text-[var(--text-light)]/75">Loading admin workspace...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-[1900px] flex-1 flex-col">
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[22px] border border-[var(--color-secondary)]/30 bg-black/20 shadow-[0_20px_80px_rgba(0,0,0,0.32)]">
        <div className="shrink-0 border-b border-[var(--color-secondary)]/20 bg-black/25 px-4 py-3 md:px-5 md:py-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-secondary)]/70">Control panel</p>
              <h1 className="mt-1 text-xl font-semibold text-[var(--color-primary)] md:text-2xl">Admin workspace</h1>
              <p className="mt-1 text-sm text-[var(--text-light)]/60">
                Signed in as {user?.user_metadata?.full_name || user?.email || 'admin'}.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setEditingPost(null);
                  setActiveTab('create');
                }}
                className="cursor-pointer rounded-md bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-[var(--text-color-dark)] transition hover:brightness-95"
              >
                New post
              </button>
              <button
                onClick={() => void loadPosts()}
                className="cursor-pointer rounded-md border border-[var(--color-secondary)]/35 bg-black/30 px-3 py-2 text-sm text-[var(--text-light)] transition hover:bg-black/45"
              >
                Refresh posts
              </button>
            </div>
          </div>
        </div>

        <div className="shrink-0 border-b border-[var(--color-secondary)]/20 bg-[var(--color-dark)]/92 px-3 py-2 backdrop-blur md:sticky md:top-0 md:z-20 md:px-4">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const isActive = tab.key === activeTab;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`min-w-[112px] rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[var(--color-primary)]/12 text-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/45'
                      : 'text-[var(--text-light)]/70 hover:bg-white/5 hover:text-[var(--text-light)]'
                  }`}
                >
                  {tab.key === 'create' && editingPost ? 'Edit Post' : tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div
            className={
              activeTabConfig.mode === 'wide'
                ? 'w-full px-3 py-3 md:px-4 md:py-4'
                : 'mx-auto w-full max-w-7xl px-3 py-3 md:px-4 md:py-4'
            }
          >
            {activeTab === 'dashboard' && (
              <div className="grid gap-4">
                <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="rounded-xl border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/8 px-4 py-3">
                    <p className="text-sm font-medium text-[var(--color-primary)]">Welcome back — the admin shell is locked to the viewport on larger screens.</p>
                  </div>
                  <div className="rounded-xl border border-[var(--color-secondary)]/20 bg-black/20 px-4 py-3 text-sm text-[var(--text-light)]/75">
                    <p><strong className="text-[var(--color-secondary)]">User:</strong> {user?.email}</p>
                    {user?.user_metadata?.full_name && (
                      <p className="mt-1"><strong className="text-[var(--color-secondary)]">Name:</strong> {user.user_metadata.full_name}</p>
                    )}
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between gap-4">
                    <h2 className="text-lg font-semibold text-[var(--color-secondary)]">Manage existing posts</h2>
                    <span className="text-xs uppercase tracking-[0.18em] text-[var(--text-light)]/45">Dynamic posts</span>
                  </div>

                  {postsError && (
                    <div className="mb-3 rounded-md border border-red-400/35 bg-red-500/10 px-4 py-3 text-red-200">
                      {postsError}
                    </div>
                  )}

                  {postsLoading ? (
                    <div className="rounded-md border border-[var(--color-secondary)]/20 bg-black/20 px-4 py-5 text-[var(--text-light)]/70">
                      Loading posts...
                    </div>
                  ) : posts.length === 0 ? (
                    <div className="rounded-md border border-[var(--color-secondary)]/20 bg-black/20 px-4 py-5 text-[var(--text-light)]/70">
                      No admin-created posts yet.
                    </div>
                  ) : (
                    <div className="grid gap-2.5">
                      {posts.map((post) => (
                        <div
                          key={post.slug}
                          className="flex flex-col gap-3 rounded-lg border border-[var(--color-secondary)]/22 bg-black/20 px-4 py-3 md:flex-row md:items-center md:justify-between"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-base font-semibold text-[var(--color-primary)]">{post.title}</p>
                            <p className="truncate text-sm text-[var(--text-light)]/62">/{post.slug}</p>
                            <p className="text-sm text-[var(--text-light)]/58">
                              {post.date || 'No date'}
                              {post.author ? ` • ${post.author}` : ''}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => {
                                setEditingPost(post);
                                setActiveTab('create');
                              }}
                              className="cursor-pointer rounded-md bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-[var(--text-color-dark)] transition hover:brightness-95"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => window.open(`/post/${post.slug}`, '_blank', 'noopener,noreferrer')}
                              className="cursor-pointer rounded-md border border-[var(--color-secondary)]/40 bg-black/25 px-3 py-2 text-sm text-[var(--text-light)] transition hover:bg-black/40"
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
                  void loadPosts();
                  setTimeout(() => {
                    setEditingPost(null);
                    setActiveTab('dashboard');
                  }, 1200);
                }}
                onDelete={() => {
                  void loadPosts();
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
      </section>
    </div>
  );
}
