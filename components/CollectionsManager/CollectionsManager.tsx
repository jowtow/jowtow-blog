'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/lib/auth';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type AdminCollectionMetadata = {
  slug: string;
  name: string;
  description: string;
  date: string;
  image: string;
};

type AdminCollectionItem = {
  collectionSlug: string;
  slug: string;
  title: string;
  markdown: string;
  image: string;
  date: string;
};

type AdminCollection = {
  metadata: AdminCollectionMetadata;
  items: AdminCollectionItem[];
};

const emptyCollectionForm: AdminCollectionMetadata = {
  slug: '',
  name: '',
  description: '',
  date: new Date().toISOString().split('T')[0],
  image: '',
};

const emptyItemForm: AdminCollectionItem = {
  collectionSlug: '',
  slug: '',
  title: '',
  markdown: '',
  image: '',
  date: new Date().toISOString().split('T')[0],
};

export default function CollectionsManager() {
  const { user } = useAuthStore();
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [collectionsList, setCollectionsList] = useState<AdminCollection[]>([]);
  const [loadingCollections, setLoadingCollections] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedCollectionSlug, setSelectedCollectionSlug] = useState<string | null>(null);
  const [collectionForm, setCollectionForm] = useState<AdminCollectionMetadata>(emptyCollectionForm);
  const [collectionSubmitting, setCollectionSubmitting] = useState(false);
  const [collectionDeleting, setCollectionDeleting] = useState(false);
  const [itemForm, setItemForm] = useState<AdminCollectionItem>(emptyItemForm);
  const [itemSubmitting, setItemSubmitting] = useState(false);
  const [itemDeleting, setItemDeleting] = useState(false);
  const [itemPreview, setItemPreview] = useState(false);
  const [selectedItemSlug, setSelectedItemSlug] = useState<string | null>(null);
  const [uploadingCollectionImage, setUploadingCollectionImage] = useState(false);
  const [uploadingItemImage, setUploadingItemImage] = useState(false);
  const [uploadingInlineImage, setUploadingInlineImage] = useState(false);
  const collectionCoverInputRef = useRef<HTMLInputElement>(null);
  const itemCoverInputRef = useRef<HTMLInputElement>(null);
  const inlineImageInputRef = useRef<HTMLInputElement>(null);
  const itemTextAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const getToken = () => {
      const netlifyIdentity = (window as Window & { netlifyIdentity?: { currentUser?: () => { token: { access_token: string } } } }).netlifyIdentity;
      if (netlifyIdentity?.currentUser?.()) {
        try {
          const token = netlifyIdentity.currentUser().token.access_token;
          setAuthToken(token);
        } catch (err) {
          console.error('Failed to get token:', err);
        }
      }
    };

    getToken();
  }, [user]);

  const loadCollections = async (preferredSlug?: string | null) => {
    setLoadingCollections(true);
    setError(null);

    try {
      const response = await fetch('/api/collections');
      if (!response.ok) {
        throw new Error('Failed to load collections');
      }

      const data = (await response.json()) as AdminCollection[];
      const sorted = data.sort((a, b) => Date.parse(b.metadata.date) - Date.parse(a.metadata.date));

      setCollectionsList(sorted);

      const nextSlug = preferredSlug ?? selectedCollectionSlug;
      if (!nextSlug) {
        return;
      }

      const matched = sorted.find((c) => c.metadata.slug === nextSlug);
      if (matched) {
        selectCollection(matched);
      } else {
        startNewCollection();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load collections');
    } finally {
      setLoadingCollections(false);
    }
  };

  useEffect(() => {
    loadCollections();
  }, []);

  const generateSlug = (value: string) =>
    value
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

  const uploadImageFile = async (file: File) => {
    if (!authToken) {
      throw new Error('Authentication token not available. Please refresh the page.');
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to upload image');
    }

    const data = await response.json();
    return data.url as string;
  };

  const selectCollection = (collection: AdminCollection) => {
    setSelectedCollectionSlug(collection.metadata.slug);
    setCollectionForm(collection.metadata);
    setSelectedItemSlug(null);
    setItemForm({
      ...emptyItemForm,
      collectionSlug: collection.metadata.slug,
    });
    setItemPreview(false);
    setError(null);
    setSuccess(null);
  };

  const startNewCollection = () => {
    setSelectedCollectionSlug(null);
    setCollectionForm(emptyCollectionForm);
    setSelectedItemSlug(null);
    setItemForm(emptyItemForm);
    setItemPreview(false);
    setError(null);
    setSuccess(null);
  };

  const startNewItem = () => {
    if (!selectedCollectionSlug && !collectionForm.slug) {
      setError('Save the collection before adding items to it.');
      return;
    }

    setSelectedItemSlug(null);
    setItemForm({
      ...emptyItemForm,
      collectionSlug: selectedCollectionSlug || collectionForm.slug,
    });
    setItemPreview(false);
    setError(null);
    setSuccess(null);
  };

  const selectItem = (item: AdminCollectionItem) => {
    setSelectedItemSlug(item.slug);
    setItemForm(item);
    setItemPreview(false);
    setError(null);
    setSuccess(null);
  };

  const insertInlineImage = (insertion: string) => {
    const textarea = itemTextAreaRef.current;

    if (!textarea) {
      setItemForm((prev) => ({ ...prev, markdown: `${prev.markdown}${insertion}` }));
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nextMarkdown = itemForm.markdown.slice(0, start) + insertion + itemForm.markdown.slice(end);

    setItemForm((prev) => ({ ...prev, markdown: nextMarkdown }));

    requestAnimationFrame(() => {
      textarea.focus();
      const nextCaret = start + insertion.length;
      textarea.setSelectionRange(nextCaret, nextCaret);
    });
  };

  const handleCollectionImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingCollectionImage(true);
    setError(null);

    try {
      const url = await uploadImageFile(file);
      setCollectionForm((prev) => ({ ...prev, image: url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setUploadingCollectionImage(false);
      if (collectionCoverInputRef.current) collectionCoverInputRef.current.value = '';
    }
  };

  const handleItemImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingItemImage(true);
    setError(null);

    try {
      const url = await uploadImageFile(file);
      setItemForm((prev) => ({ ...prev, image: url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setUploadingItemImage(false);
      if (itemCoverInputRef.current) itemCoverInputRef.current.value = '';
    }
  };

  const handleInlineImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingInlineImage(true);
    setError(null);

    try {
      const url = await uploadImageFile(file);
      const altText = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
      insertInlineImage(`\n![${altText}](${url})\n`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setUploadingInlineImage(false);
      if (inlineImageInputRef.current) inlineImageInputRef.current.value = '';
    }
  };

  const currentCollection = selectedCollectionSlug
    ? collectionsList.find((c) => c.metadata.slug === selectedCollectionSlug) ?? null
    : null;

  const handleCollectionSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!authToken) {
      setError('Authentication token not available. Please refresh the page.');
      return;
    }

    setCollectionSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      if (!collectionForm.name || !collectionForm.slug || !collectionForm.description || !collectionForm.date) {
        throw new Error('Please fill in all required collection fields');
      }

      const response = await fetch('/api/collections', {
        method: selectedCollectionSlug ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          ...collectionForm,
          originalSlug: selectedCollectionSlug,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save collection');
      }

      const payload = await response.json();
      const savedSlug = payload.data.slug as string;
      setSuccess(selectedCollectionSlug ? 'Collection updated successfully.' : 'Collection created successfully.');
      setSelectedCollectionSlug(savedSlug);
      await loadCollections(savedSlug);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save collection');
    } finally {
      setCollectionSubmitting(false);
    }
  };

  const handleCollectionDelete = async () => {
    if (!selectedCollectionSlug) {
      setError('Select a collection to delete.');
      return;
    }

    if (!authToken) {
      setError('Authentication token not available. Please refresh the page.');
      return;
    }

    const confirmed = window.confirm(`Delete collection "${collectionForm.name}" and all its items? This cannot be undone.`);
    if (!confirmed) {
      return;
    }

    setCollectionDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/collections?slug=${encodeURIComponent(selectedCollectionSlug)}`, {
        method: 'DELETE',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete collection');
      }

      startNewCollection();
      await loadCollections(null);
      setSuccess('Collection deleted successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete collection');
    } finally {
      setCollectionDeleting(false);
    }
  };

  const handleItemSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const collectionSlug = selectedCollectionSlug || collectionForm.slug;
    if (!collectionSlug) {
      setError('Save the collection before adding items to it.');
      return;
    }

    if (!authToken) {
      setError('Authentication token not available. Please refresh the page.');
      return;
    }

    setItemSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      if (!itemForm.title || !itemForm.slug || !itemForm.date) {
        throw new Error('Please fill in all required item fields (title, slug, date)');
      }

      const response = await fetch(`/api/collections/${encodeURIComponent(collectionSlug)}/items`, {
        method: selectedItemSlug ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          ...itemForm,
          collectionSlug,
          originalSlug: selectedItemSlug,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save collection item');
      }

      const payload = await response.json();
      const savedItem = payload.data as AdminCollectionItem;
      setSuccess(selectedItemSlug ? 'Item updated successfully.' : 'Item created successfully.');
      await loadCollections(collectionSlug);
      setSelectedItemSlug(savedItem.slug);
      setItemForm(savedItem);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save collection item');
    } finally {
      setItemSubmitting(false);
    }
  };

  const handleItemDelete = async () => {
    const collectionSlug = selectedCollectionSlug || collectionForm.slug;
    if (!collectionSlug || !selectedItemSlug) {
      setError('Select an item to delete.');
      return;
    }

    if (!authToken) {
      setError('Authentication token not available. Please refresh the page.');
      return;
    }

    const confirmed = window.confirm(`Delete item "${itemForm.title}"? This cannot be undone.`);
    if (!confirmed) {
      return;
    }

    setItemDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        `/api/collections/${encodeURIComponent(collectionSlug)}/items?slug=${encodeURIComponent(selectedItemSlug)}`,
        {
          method: 'DELETE',
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete item');
      }

      await loadCollections(collectionSlug);
      startNewItem();
      setSuccess('Item deleted successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete item');
    } finally {
      setItemDeleting(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)] text-[var(--text-light)]">
      <aside className="rounded-xl border border-[var(--color-secondary)]/35 bg-black/25 p-4">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-semibold text-[var(--color-primary)]">Collections</h2>
            <p className="text-sm text-[var(--text-light)]/60">Manage your collections</p>
          </div>
          <button
            type="button"
            onClick={startNewCollection}
            className="px-3 py-2 bg-[var(--color-primary)] text-[var(--text-color-dark)] rounded-md font-semibold cursor-pointer"
          >
            New
          </button>
        </div>

        {loadingCollections ? (
          <div className="rounded-md border border-[var(--color-secondary)]/20 bg-black/20 px-4 py-6 text-[var(--text-light)]/70">
            Loading collections...
          </div>
        ) : collectionsList.length === 0 ? (
          <div className="rounded-md border border-[var(--color-secondary)]/20 bg-black/20 px-4 py-6 text-[var(--text-light)]/70">
            No collections yet.
          </div>
        ) : (
          <div className="grid gap-3">
            {collectionsList.map((collection) => {
              const isActive = collection.metadata.slug === selectedCollectionSlug;
              return (
                <button
                  key={collection.metadata.slug}
                  type="button"
                  onClick={() => selectCollection(collection)}
                  className={`rounded-lg border px-4 py-3 text-left transition ${
                    isActive
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                      : 'border-[var(--color-secondary)]/20 bg-black/20 hover:bg-black/35'
                  }`}
                >
                  <p className="font-semibold text-[var(--color-primary)]">{collection.metadata.name}</p>
                  <p className="text-sm text-[var(--text-light)]/60">/{collection.metadata.slug}</p>
                  <p className="text-sm text-[var(--text-light)]/60">{collection.items.length} items</p>
                </button>
              );
            })}
          </div>
        )}
      </aside>

      <div className="grid gap-6">
        {(error || success) && (
          <div
            className={`rounded-md border px-4 py-3 ${
              error
                ? 'border-red-400/35 bg-red-500/10 text-red-200'
                : 'border-[var(--color-primary)]/35 bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
            }`}
          >
            {error || success}
          </div>
        )}

        <form
          onSubmit={handleCollectionSubmit}
          className="rounded-xl border border-[var(--color-secondary)]/35 bg-black/25 p-5 space-y-5"
        >
          <div>
            <h3 className="text-xl font-semibold text-[var(--color-primary)]">
              {selectedCollectionSlug ? 'Edit Collection' : 'Create Collection'}
            </h3>
            <p className="text-sm text-[var(--text-light)]/60 mt-1">
              Collections display items in a vinyl-style carousel you can flip through.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--color-secondary)]">Collection Name</label>
              <input
                type="text"
                value={collectionForm.name}
                onChange={(event) => {
                  const name = event.target.value;
                  setCollectionForm((prev) => ({
                    ...prev,
                    name,
                    slug: !selectedCollectionSlug || prev.slug === generateSlug(prev.name) ? generateSlug(name) : prev.slug,
                  }));
                }}
                className="w-full px-4 py-2 border border-[var(--color-secondary)]/40 bg-black/35 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--color-secondary)]">Slug</label>
              <input
                type="text"
                value={collectionForm.slug}
                onChange={(event) => setCollectionForm((prev) => ({ ...prev, slug: event.target.value }))}
                className="w-full px-4 py-2 border border-[var(--color-secondary)]/40 bg-black/35 rounded-lg"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2 text-[var(--color-secondary)]">Description</label>
              <textarea
                value={collectionForm.description}
                onChange={(event) => setCollectionForm((prev) => ({ ...prev, description: event.target.value }))}
                className="w-full min-h-28 px-4 py-2 border border-[var(--color-secondary)]/40 bg-black/35 rounded-lg resize-y"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--color-secondary)]">Date</label>
              <input
                type="date"
                value={collectionForm.date}
                onChange={(event) => setCollectionForm((prev) => ({ ...prev, date: event.target.value }))}
                className="w-full px-4 py-2 border border-[var(--color-secondary)]/40 bg-black/35 rounded-lg"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--color-secondary)]">Collection Cover Image</label>
            <input
              type="file"
              ref={collectionCoverInputRef}
              onChange={handleCollectionImageUpload}
              accept="image/*"
              disabled={uploadingCollectionImage}
              className="w-full px-4 py-2 border border-[var(--color-secondary)]/40 bg-black/35 rounded-lg cursor-pointer"
            />
            <p className="text-sm text-[var(--text-light)]/60 mt-2">
              {uploadingCollectionImage ? 'Uploading image...' : 'Upload a cover image for the collection.'}
            </p>
            {collectionForm.image && (
              <img
                src={collectionForm.image}
                alt="Collection cover preview"
                className="mt-4 max-h-48 rounded border border-[var(--color-secondary)]/40"
              />
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={collectionSubmitting}
              className="px-5 py-2 bg-[var(--color-primary)] text-[var(--text-color-dark)] font-semibold rounded-md cursor-pointer disabled:opacity-60"
            >
              {collectionSubmitting ? 'Saving...' : selectedCollectionSlug ? 'Save Collection' : 'Create Collection'}
            </button>
            <button
              type="button"
              onClick={() => {
                if (currentCollection) {
                  selectCollection(currentCollection);
                } else {
                  startNewCollection();
                }
              }}
              className="px-5 py-2 border border-[var(--color-secondary)]/40 bg-black/35 rounded-md cursor-pointer"
            >
              {selectedCollectionSlug ? 'Reset' : 'Clear'}
            </button>
            {selectedCollectionSlug && (
              <button
                type="button"
                onClick={handleCollectionDelete}
                disabled={collectionDeleting}
                className="px-5 py-2 border border-red-400/50 bg-red-500/15 text-red-200 rounded-md cursor-pointer disabled:opacity-60"
              >
                {collectionDeleting ? 'Deleting...' : 'Delete Collection'}
              </button>
            )}
          </div>
        </form>

        <div className="rounded-xl border border-[var(--color-secondary)]/35 bg-black/25 p-5 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-[var(--color-primary)]">Collection Items</h3>
              <p className="text-sm text-[var(--text-light)]/60">
                {selectedCollectionSlug ? `Managing items in /${selectedCollectionSlug}` : 'Save a collection before adding items.'}
              </p>
            </div>
            <button
              type="button"
              onClick={startNewItem}
              disabled={!selectedCollectionSlug && !collectionForm.slug}
              className="px-4 py-2 bg-[var(--color-primary)] text-[var(--text-color-dark)] font-semibold rounded-md cursor-pointer disabled:opacity-50"
            >
              New Item
            </button>
          </div>

          {currentCollection && currentCollection.items.length > 0 ? (
            <div className="grid gap-3">
              {currentCollection.items
                .slice()
                .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
                .map((item) => {
                  const isActive = item.slug === selectedItemSlug;
                  return (
                    <button
                      key={item.slug}
                      type="button"
                      onClick={() => selectItem(item)}
                      className={`rounded-lg border px-4 py-3 text-left transition flex items-center gap-3 ${
                        isActive
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                          : 'border-[var(--color-secondary)]/20 bg-black/20 hover:bg-black/35'
                      }`}
                    >
                      {item.image && (
                        <img src={item.image} alt={item.title} className="w-12 h-12 object-cover rounded" />
                      )}
                      <div>
                        <p className="font-semibold text-[var(--color-primary)]">{item.title}</p>
                        <p className="text-sm text-[var(--text-light)]/60">/{item.slug} &middot; {item.date}</p>
                      </div>
                    </button>
                  );
                })}
            </div>
          ) : (
            <div className="rounded-md border border-[var(--color-secondary)]/20 bg-black/20 px-4 py-6 text-[var(--text-light)]/70">
              {selectedCollectionSlug ? 'No items in this collection yet.' : 'Create a collection first to start adding items.'}
            </div>
          )}

          <form onSubmit={handleItemSubmit} className="grid gap-5 border-t border-[var(--color-secondary)]/20 pt-5">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-lg font-semibold text-[var(--color-secondary)]">
                {selectedItemSlug ? 'Edit Item' : 'Create Item'}
              </h4>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => inlineImageInputRef.current?.click()}
                  disabled={uploadingInlineImage || !selectedCollectionSlug}
                  className="px-3 py-1 border border-[var(--color-secondary)]/40 bg-black/35 rounded cursor-pointer disabled:opacity-50"
                >
                  {uploadingInlineImage ? 'Uploading...' : 'Insert Photo'}
                </button>
                <button
                  type="button"
                  onClick={() => setItemPreview((prev) => !prev)}
                  className="px-3 py-1 bg-[var(--color-primary)] text-[var(--text-color-dark)] rounded font-medium cursor-pointer"
                >
                  {itemPreview ? 'Edit' : 'Preview'}
                </button>
              </div>
            </div>

            <input
              type="file"
              ref={inlineImageInputRef}
              onChange={handleInlineImageUpload}
              accept="image/*"
              className="hidden"
            />

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-2 text-[var(--color-secondary)]">Title</label>
                <input
                  type="text"
                  value={itemForm.title}
                  onChange={(event) => {
                    const title = event.target.value;
                    setItemForm((prev) => ({
                      ...prev,
                      title,
                      slug: !selectedItemSlug || prev.slug === generateSlug(prev.title) ? generateSlug(title) : prev.slug,
                    }));
                  }}
                  className="w-full px-4 py-2 border border-[var(--color-secondary)]/40 bg-black/35 rounded-lg"
                  required
                  disabled={!selectedCollectionSlug}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-[var(--color-secondary)]">Slug</label>
                <input
                  type="text"
                  value={itemForm.slug}
                  onChange={(event) => setItemForm((prev) => ({ ...prev, slug: event.target.value }))}
                  className="w-full px-4 py-2 border border-[var(--color-secondary)]/40 bg-black/35 rounded-lg"
                  required
                  disabled={!selectedCollectionSlug}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-[var(--color-secondary)]">Date</label>
                <input
                  type="date"
                  value={itemForm.date}
                  onChange={(event) => setItemForm((prev) => ({ ...prev, date: event.target.value }))}
                  className="w-full px-4 py-2 border border-[var(--color-secondary)]/40 bg-black/35 rounded-lg"
                  required
                  disabled={!selectedCollectionSlug}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--color-secondary)]">Item Image (square cover)</label>
              <input
                type="file"
                ref={itemCoverInputRef}
                onChange={handleItemImageUpload}
                accept="image/*"
                disabled={uploadingItemImage || !selectedCollectionSlug}
                className="w-full px-4 py-2 border border-[var(--color-secondary)]/40 bg-black/35 rounded-lg cursor-pointer"
              />
              <p className="text-sm text-[var(--text-light)]/60 mt-2">
                {uploadingItemImage ? 'Uploading image...' : 'Upload the main square cover image for this item (like album art).'}
              </p>
              {itemForm.image && (
                <img
                  src={itemForm.image}
                  alt="Item cover preview"
                  className="mt-4 w-48 h-48 object-cover rounded border border-[var(--color-secondary)]/40"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--color-secondary)]">Description (Markdown)</label>
              {!itemPreview ? (
                <textarea
                  ref={itemTextAreaRef}
                  value={itemForm.markdown}
                  onChange={(event) => setItemForm((prev) => ({ ...prev, markdown: event.target.value }))}
                  className="w-full min-h-48 px-4 py-2 border border-[var(--color-secondary)]/40 bg-black/35 rounded-lg font-mono text-sm resize-y"
                  disabled={!selectedCollectionSlug}
                  placeholder="Optional notes or description for this item..."
                />
              ) : (
                <div className="min-h-48 px-4 py-3 border border-[var(--color-secondary)]/40 bg-black/40 rounded-lg overflow-auto leading-7">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      img: (props) => (
                        <img
                          {...props}
                          loading="lazy"
                          className="max-h-[40vh] rounded border border-[var(--color-secondary)]/50 block my-3 mx-auto max-w-[min(100%,70vw)]"
                        />
                      ),
                    }}
                  >
                    {itemForm.markdown}
                  </ReactMarkdown>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={itemSubmitting || !selectedCollectionSlug}
                className="px-5 py-2 bg-[var(--color-primary)] text-[var(--text-color-dark)] font-semibold rounded-md cursor-pointer disabled:opacity-50"
              >
                {itemSubmitting ? 'Saving...' : selectedItemSlug ? 'Save Item' : 'Create Item'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const matchedItem = currentCollection?.items.find((item) => item.slug === selectedItemSlug);
                  if (matchedItem) {
                    selectItem(matchedItem);
                  } else {
                    startNewItem();
                  }
                }}
                className="px-5 py-2 border border-[var(--color-secondary)]/40 bg-black/35 rounded-md cursor-pointer"
              >
                {selectedItemSlug ? 'Reset' : 'Clear'}
              </button>
              {selectedItemSlug && (
                <button
                  type="button"
                  onClick={handleItemDelete}
                  disabled={itemDeleting}
                  className="px-5 py-2 border border-red-400/50 bg-red-500/15 text-red-200 rounded-md cursor-pointer disabled:opacity-60"
                >
                  {itemDeleting ? 'Deleting...' : 'Delete Item'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
