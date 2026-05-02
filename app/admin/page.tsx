'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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

type LoadPostsResult = {
  posts: AdminPost[];
  selectedPost: AdminPost | null;
};

type AdminTabKey = 'dashboard' | 'create' | 'series' | 'collections' | 'images';
type AdminLayoutMode = 'constrained' | 'wide';

const tabs: Array<{ key: AdminTabKey; label: string; mode: AdminLayoutMode; shortLabel: string }> = [
  { key: 'dashboard', label: 'Dashboard', shortLabel: 'Home', mode: 'constrained' },
  { key: 'create', label: 'Create', shortLabel: 'Write', mode: 'constrained' },
  { key: 'series', label: 'Series', shortLabel: 'Series', mode: 'wide' },
  { key: 'collections', label: 'Collections', shortLabel: 'Collections', mode: 'wide' },
  { key: 'images', label: 'Images', shortLabel: 'Images', mode: 'wide' },
];

export default function AdminPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [activeTab, setActiveTab] = useState<AdminTabKey>('dashboard');
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<AdminPost | null>(null);
  const tabRefs = useRef<Partial<Record<AdminTabKey, HTMLButtonElement | null>>>({});

  const activeTabConfig = useMemo(
    () => tabs.find((tab) => tab.key === activeTab) ?? tabs[0],
    [activeTab],
  );

  const loadPosts = async ({
    preferredSlug,
  }: { preferredSlug?: string | null } = {}): Promise<LoadPostsResult> => {
    setPostsLoading(true);
    setPostsError(null);

    try {
      const response = await fetch('/api/posts', { cache: 'no-store' });
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
      const selectedPost =
        preferredSlug
          ? sortedPosts.find((post) => post.slug === preferredSlug) ?? null
          : null;

      if (preferredSlug) {
        setEditingPost(selectedPost);
      }

      return {
        posts: sortedPosts,
        selectedPost,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load posts';
      setPostsError(message);
      throw new Error(message);
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
      void loadPosts().catch(() => undefined);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    tabRefs.current[activeTab]?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }, [activeTab]);

  if (isLoading) {
    return <div className="flex h-full min-h-[40vh] items-center justify-center text-[var(--text-light)]/75">Loading admin workspace...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-[1900px] flex-1 flex-col md:h-full md:min-h-0">
      <section className="flex flex-1 flex-col rounded-[22px] border border-[var(--color-secondary)]/30 bg-black/20 shadow-[0_20px_80px_rgba(0,0,0,0.32)] md:min-h-0 md:overflow-hidden">
        <div className="shrink-0 border-b border-[var(--color-secondary)]/20 bg-black/25 px-4 py-3 md:px-5 md:py-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-secondary)]/70">Control panel</p>
              <h1 className="mt-1 text-xl font-semibold text-[var(--color-primary)] md:text-2xl">Admin workspace</h1>
              <p className="mt-1 text-sm text-[var(--text-light)]/60">
                Signed in as {user?.user_metadata?.full_name || user?.email || 'admin'}.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 md:flex md:flex-wrap">
              <button
                onClick={() => {
                  setEditingPost(null);
                  setActiveTab('create');
                }}
                className="cursor-pointer rounded-lg bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-[var(--text-color-dark)] transition hover:brightness-95"
              >
                New post
              </button>
              <button
                onClick={() => void loadPosts().catch(() => undefined)}
                className="cursor-pointer rounded-lg border border-[var(--color-secondary)]/35 bg-black/30 px-4 py-3 text-sm text-[var(--text-light)] transition hover:bg-black/45"
              >
                Refresh posts
              </button>
            </div>
          </div>
        </div>

        <div className="sticky top-2 z-20 shrink-0 border-b border-[var(--color-secondary)]/20 bg-[var(--color-dark)]/95 px-3 py-2 backdrop-blur md:top-0 md:px-4">
          <div className="mb-2 flex items-center justify-between gap-3 md:hidden">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-secondary)]/65">Current tab</p>
              <p className="text-sm font-medium text-[var(--color-primary)]">
                {activeTab === 'create' && editingPost ? 'Edit Post' : activeTabConfig.label}
              </p>
            </div>
            <span className="text-xs text-[var(--text-light)]/50">Swipe for more</span>
          </div>
          <div className="-mx-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex min-w-max gap-2 px-1 md:flex-wrap md:gap-2.5 md:px-0">
              {tabs.map((tab) => {
                const isActive = tab.key === activeTab;
                return (
                  <button
                    key={tab.key}
                    ref={(element) => {
                      tabRefs.current[tab.key] = element;
                    }}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex min-h-11 flex-none items-center rounded-xl border px-3.5 py-2 text-left text-sm font-medium transition-colors md:min-w-[124px] md:flex-1 md:justify-center ${
                      isActive
                        ? 'border-[var(--color-primary)]/45 bg-[var(--color-primary)]/12 text-[var(--color-primary)] shadow-[0_0_0_1px_rgba(127,255,0,0.12)]'
                        : 'border-transparent text-[var(--text-light)]/72 hover:border-[var(--color-secondary)]/20 hover:bg-white/5 hover:text-[var(--text-light)]'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span className="md:hidden">{tab.shortLabel}</span>
                    <span className="hidden md:inline">{tab.key === 'create' && editingPost ? 'Edit Post' : tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex-1 md:min-h-0 md:overflow-y-auto md:overscroll-contain">
          <div
            className={
              activeTabConfig.mode === 'wide'
                ? 'w-full px-3 py-4 md:px-4 md:py-4'
                : 'mx-auto w-full max-w-7xl px-3 py-4 md:px-4 md:py-4'
            }
          >
            {activeTab === 'dashboard' && (
              <div className="grid gap-4">
                <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="rounded-xl border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/8 px-4 py-3">
                    <p className="text-sm font-medium text-[var(--color-primary)]">
                      Desktop keeps the viewport-locked workspace shell. Mobile now falls back to natural page scrolling.
                    </p>
                  </div>
                  <div className="rounded-xl border border-[var(--color-secondary)]/20 bg-black/20 px-4 py-3 text-sm text-[var(--text-light)]/75">
                    <p><strong className="text-[var(--color-secondary)]">User:</strong> {user?.email}</p>
                    {user?.user_metadata?.full_name && (
                      <p className="mt-1"><strong className="text-[var(--color-secondary)]">Name:</strong> {user.user_metadata.full_name}</p>
                    )}
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <h2 className="text-lg font-semibold text-[var(--color-secondary)]">Manage existing posts</h2>
                    <span className="text-xs uppercase tracking-[0.18em] text-[var(--text-light)]/45">Dynamic posts</span>
                  </div>

                  {postsError && (
                    <div className="mb-3 rounded-xl border border-red-400/35 bg-red-500/10 px-4 py-3 text-red-200">
                      {postsError}
                    </div>
                  )}

                  {postsLoading ? (
                    <div className="rounded-xl border border-[var(--color-secondary)]/20 bg-black/20 px-4 py-5 text-[var(--text-light)]/70">
                      Loading posts...
                    </div>
                  ) : posts.length === 0 ? (
                    <div className="rounded-xl border border-[var(--color-secondary)]/20 bg-black/20 px-4 py-5 text-[var(--text-light)]/70">
                      No admin-created posts yet.
                    </div>
                  ) : (
                    <div className="grid gap-2.5">
                      {posts.map((post) => (
                        <div
                          key={post.slug}
                          className="flex flex-col gap-3 rounded-xl border border-[var(--color-secondary)]/22 bg-black/20 px-4 py-3 md:flex-row md:items-center md:justify-between"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-base font-semibold text-[var(--color-primary)]">{post.title}</p>
                            <p className="truncate text-sm text-[var(--text-light)]/62">/{post.slug}</p>
                            <p className="text-sm text-[var(--text-light)]/58">
                              {post.date || 'No date'}
                              {post.author ? ` • ${post.author}` : ''}
                            </p>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2 md:flex md:flex-wrap">
                            <button
                              onClick={() => {
                                setEditingPost(post);
                                setActiveTab('create');
                              }}
                              className="cursor-pointer rounded-lg bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-[var(--text-color-dark)] transition hover:brightness-95"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => window.open(`/post/${post.slug}`, '_blank', 'noopener,noreferrer')}
                              className="cursor-pointer rounded-lg border border-[var(--color-secondary)]/40 bg-black/25 px-4 py-3 text-sm text-[var(--text-light)] transition hover:bg-black/40"
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
                onSuccess={async (savedSlug) => {
                  const { selectedPost } = await loadPosts({ preferredSlug: savedSlug });

                  if (!selectedPost) {
                    setEditingPost(null);
                    setActiveTab('dashboard');
                    return null;
                  }

                  setEditingPost(selectedPost);
                  setActiveTab('create');
                  return selectedPost;
                }}
                onDelete={async () => {
                  await loadPosts();
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
