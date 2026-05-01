"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuthStore } from "@/lib/auth";
import MarkdownRenderer from "@/components/MarkdownRenderer/MarkdownRenderer";
import {
  type AdminCollection,
  type AdminCollectionItem,
  type AdminCollectionMetadata,
  filterCollectionItems,
  getItemSummary,
} from "./collectionsManagerUtils";

const emptyCollectionForm: AdminCollectionMetadata = {
  slug: "",
  name: "",
  description: "",
  date: new Date().toISOString().split("T")[0],
  image: "",
};

const emptyItemForm: AdminCollectionItem = {
  collectionSlug: "",
  slug: "",
  title: "",
  markdown: "",
  image: "",
  date: new Date().toISOString().split("T")[0],
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
  const [itemDrawerOpen, setItemDrawerOpen] = useState(false);
  const [itemSearch, setItemSearch] = useState("");
  const [uploadingCollectionImage, setUploadingCollectionImage] = useState(false);
  const [uploadingItemImage, setUploadingItemImage] = useState(false);
  const [uploadingInlineImage, setUploadingInlineImage] = useState(false);
  const collectionCoverInputRef = useRef<HTMLInputElement>(null);
  const itemCoverInputRef = useRef<HTMLInputElement>(null);
  const inlineImageInputRef = useRef<HTMLInputElement>(null);
  const itemTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const isLocalBypassEnabled =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") &&
    process.env.NEXT_PUBLIC_DEV_ADMIN_BYPASS !== "false";

  const getAuthHeaders = (): Record<string, string> => {
    if (authToken) {
      return {
        authorization: `Bearer ${authToken}`,
      };
    }

    return {};
  };

  useEffect(() => {
    const getToken = () => {
      const netlifyIdentity = (
        window as Window & {
          netlifyIdentity?: {
            currentUser?: () => { token: { access_token: string } };
          };
        }
      ).netlifyIdentity;
      if (netlifyIdentity?.currentUser?.()) {
        try {
          const token = netlifyIdentity.currentUser().token.access_token;
          setAuthToken(token);
        } catch (err) {
          console.error("Failed to get token:", err);
        }
      }
    };

    getToken();
  }, [user]);

  useEffect(() => {
    if (!itemDrawerOpen) {
      return;
    }

    const { body } = document;
    const previousOverflow = body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setItemDrawerOpen(false);
      }
    };

    body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [itemDrawerOpen]);

  const loadCollections = async (preferredSlug?: string | null) => {
    setLoadingCollections(true);
    setError(null);

    try {
      const response = await fetch("/api/collections");
      if (!response.ok) {
        throw new Error("Failed to load collections");
      }

      const data = (await response.json()) as AdminCollection[];
      const sorted = data.sort(
        (a, b) => Date.parse(b.metadata.date) - Date.parse(a.metadata.date),
      );

      setCollectionsList(sorted);

      const nextSlug = preferredSlug ?? selectedCollectionSlug;
      if (!nextSlug) {
        return;
      }

      const matched = sorted.find((collection) => collection.metadata.slug === nextSlug);
      if (matched) {
        selectCollection(matched);
      } else {
        startNewCollection();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load collections");
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
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

  const uploadImageFile = async (file: File) => {
    if (!authToken && !isLocalBypassEnabled) {
      throw new Error("Authentication token not available. Please refresh the page.");
    }

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/upload", {
      method: "POST",
      headers: getAuthHeaders(),
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to upload image");
    }

    const data = await response.json();
    return data.url as string;
  };

  const resetItemEditor = (collectionSlug: string | null) => {
    setSelectedItemSlug(null);
    setItemForm({
      ...emptyItemForm,
      collectionSlug: collectionSlug ?? "",
    });
    setItemPreview(false);
  };

  const closeItemDrawer = () => {
    setItemDrawerOpen(false);
  };

  const selectCollection = (collection: AdminCollection) => {
    setSelectedCollectionSlug(collection.metadata.slug);
    setCollectionForm(collection.metadata);
    resetItemEditor(collection.metadata.slug);
    setItemDrawerOpen(false);
    setItemSearch("");
    setError(null);
    setSuccess(null);
  };

  const startNewCollection = () => {
    setSelectedCollectionSlug(null);
    setCollectionForm(emptyCollectionForm);
    resetItemEditor(null);
    setItemDrawerOpen(false);
    setItemSearch("");
    setError(null);
    setSuccess(null);
  };

  const openNewItemDrawer = () => {
    if (!selectedCollectionSlug) {
      setError("Save the collection before adding items to it.");
      return;
    }

    resetItemEditor(selectedCollectionSlug);
    setItemDrawerOpen(true);
    setError(null);
    setSuccess(null);
  };

  const openItemDrawer = (item: AdminCollectionItem) => {
    setSelectedItemSlug(item.slug);
    setItemForm(item);
    setItemPreview(false);
    setItemDrawerOpen(true);
    setError(null);
    setSuccess(null);
  };

  const insertInlineImage = (insertion: string) => {
    const textarea = itemTextAreaRef.current;

    if (!textarea) {
      setItemForm((prev) => ({
        ...prev,
        markdown: `${prev.markdown}${insertion}`,
      }));
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nextMarkdown =
      itemForm.markdown.slice(0, start) + insertion + itemForm.markdown.slice(end);

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
      setError(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setUploadingCollectionImage(false);
      if (collectionCoverInputRef.current) {
        collectionCoverInputRef.current.value = "";
      }
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
      setError(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setUploadingItemImage(false);
      if (itemCoverInputRef.current) {
        itemCoverInputRef.current.value = "";
      }
    }
  };

  const handleInlineImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    setUploadingInlineImage(true);
    setError(null);

    try {
      const snippets = await Promise.all(
        files.map(async (file) => {
          const url = await uploadImageFile(file);
          const altText = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
          return `![${altText}](${url})`;
        }),
      );
      insertInlineImage(`\n${snippets.join("\n")}\n`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setUploadingInlineImage(false);
      if (inlineImageInputRef.current) {
        inlineImageInputRef.current.value = "";
      }
    }
  };

  const currentCollection = selectedCollectionSlug
    ? (collectionsList.find((collection) => collection.metadata.slug === selectedCollectionSlug) ?? null)
    : null;
  const canManageItems = Boolean(selectedCollectionSlug && currentCollection);
  const filteredItems = useMemo(
    () => filterCollectionItems(currentCollection?.items ?? [], itemSearch),
    [currentCollection?.items, itemSearch],
  );
  const activeItem = useMemo(
    () => currentCollection?.items.find((item) => item.slug === selectedItemSlug) ?? null,
    [currentCollection, selectedItemSlug],
  );

  const handleCollectionSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!authToken && !isLocalBypassEnabled) {
      setError("Authentication token not available. Please refresh the page.");
      return;
    }

    setCollectionSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      if (!collectionForm.name || !collectionForm.slug || !collectionForm.description || !collectionForm.date) {
        throw new Error("Please fill in all required collection fields");
      }

      const response = await fetch("/api/collections", {
        method: selectedCollectionSlug ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          ...collectionForm,
          originalSlug: selectedCollectionSlug,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save collection");
      }

      const payload = await response.json();
      const savedSlug = payload.data.slug as string;
      const successMessage = selectedCollectionSlug
        ? "Collection updated successfully."
        : "Collection created successfully.";
      setSuccess(successMessage);
      setSelectedCollectionSlug(savedSlug);
      await loadCollections(savedSlug);
      setSuccess(successMessage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save collection");
    } finally {
      setCollectionSubmitting(false);
    }
  };

  const handleCollectionDelete = async () => {
    if (!selectedCollectionSlug) {
      setError("Select a collection to delete.");
      return;
    }

    if (!authToken && !isLocalBypassEnabled) {
      setError("Authentication token not available. Please refresh the page.");
      return;
    }

    const confirmed = window.confirm(
      `Delete collection "${collectionForm.name}" and all its items? This cannot be undone.`,
    );
    if (!confirmed) {
      return;
    }

    setCollectionDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/collections?slug=${encodeURIComponent(selectedCollectionSlug)}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete collection");
      }

      startNewCollection();
      await loadCollections(null);
      setSuccess("Collection deleted successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete collection");
    } finally {
      setCollectionDeleting(false);
    }
  };

  const handleItemSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedCollectionSlug) {
      setError("Save the collection before adding items to it.");
      return;
    }

    if (!authToken && !isLocalBypassEnabled) {
      setError("Authentication token not available. Please refresh the page.");
      return;
    }

    setItemSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      if (!itemForm.title || !itemForm.slug || !itemForm.date) {
        throw new Error("Please fill in all required item fields (title, slug, date)");
      }

      const response = await fetch(`/api/collections/${encodeURIComponent(selectedCollectionSlug)}/items`, {
        method: selectedItemSlug ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          ...itemForm,
          collectionSlug: selectedCollectionSlug,
          originalSlug: selectedItemSlug,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save collection item");
      }

      const payload = await response.json();
      const savedItem = payload.data as AdminCollectionItem;
      const successMessage = selectedItemSlug
        ? "Item updated successfully."
        : "Item created successfully.";
      setSuccess(successMessage);
      await loadCollections(selectedCollectionSlug);
      setSelectedItemSlug(savedItem.slug);
      setItemForm(savedItem);
      setItemDrawerOpen(true);
      setSuccess(successMessage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save collection item");
    } finally {
      setItemSubmitting(false);
    }
  };

  const handleItemDelete = async () => {
    if (!selectedCollectionSlug || !selectedItemSlug) {
      setError("Select an item to delete.");
      return;
    }

    if (!authToken && !isLocalBypassEnabled) {
      setError("Authentication token not available. Please refresh the page.");
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
        `/api/collections/${encodeURIComponent(selectedCollectionSlug)}/items?slug=${encodeURIComponent(selectedItemSlug)}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete item");
      }

      await loadCollections(selectedCollectionSlug);
      resetItemEditor(selectedCollectionSlug);
      setItemDrawerOpen(false);
      setSuccess("Item deleted successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete item");
    } finally {
      setItemDeleting(false);
    }
  };

  const panelTitle = selectedCollectionSlug ? `Managing items in /${selectedCollectionSlug}` : "Save a collection before adding items.";
  const visibleCountLabel = currentCollection
    ? `${filteredItems.length} of ${currentCollection.items.length} visible`
    : "No collection selected";
  const itemSummary = getItemSummary(itemForm.markdown);

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)] text-[var(--text-light)]">
        <aside className="rounded-xl border border-[var(--color-secondary)]/35 bg-black/25 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-[var(--color-primary)]">Collections</h2>
              <p className="text-sm text-[var(--text-light)]/60">Manage your collections</p>
            </div>
            <button
              type="button"
              onClick={startNewCollection}
              className="cursor-pointer rounded-md bg-[var(--color-primary)] px-3 py-2 font-semibold text-[var(--text-color-dark)]"
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
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                        : "border-[var(--color-secondary)]/20 bg-black/20 hover:bg-black/35"
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
                  ? "border-red-400/35 bg-red-500/10 text-red-200"
                  : "border-[var(--color-primary)]/35 bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
              }`}
            >
              {error || success}
            </div>
          )}

          <form
            onSubmit={handleCollectionSubmit}
            className="space-y-5 rounded-xl border border-[var(--color-secondary)]/35 bg-black/25 p-5"
          >
            <div>
              <h3 className="text-xl font-semibold text-[var(--color-primary)]">
                {selectedCollectionSlug ? "Edit Collection" : "Create Collection"}
              </h3>
              <p className="mt-1 text-sm text-[var(--text-light)]/60">
                Collections display items in a vinyl-style carousel you can flip through.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--color-secondary)]">
                  Collection Name
                </label>
                <input
                  type="text"
                  value={collectionForm.name}
                  onChange={(event) => {
                    const name = event.target.value;
                    setCollectionForm((prev) => ({
                      ...prev,
                      name,
                      slug:
                        !selectedCollectionSlug || prev.slug === generateSlug(prev.name)
                          ? generateSlug(name)
                          : prev.slug,
                    }));
                  }}
                  className="w-full rounded-lg border border-[var(--color-secondary)]/40 bg-black/35 px-4 py-2"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--color-secondary)]">Slug</label>
                <input
                  type="text"
                  value={collectionForm.slug}
                  onChange={(event) =>
                    setCollectionForm((prev) => ({
                      ...prev,
                      slug: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-[var(--color-secondary)]/40 bg-black/35 px-4 py-2"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-[var(--color-secondary)]">
                  Description
                </label>
                <textarea
                  value={collectionForm.description}
                  onChange={(event) =>
                    setCollectionForm((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                  className="min-h-28 w-full resize-y rounded-lg border border-[var(--color-secondary)]/40 bg-black/35 px-4 py-2"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--color-secondary)]">Date</label>
                <input
                  type="date"
                  value={collectionForm.date}
                  onChange={(event) =>
                    setCollectionForm((prev) => ({
                      ...prev,
                      date: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-[var(--color-secondary)]/40 bg-black/35 px-4 py-2"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--color-secondary)]">
                Collection Cover Image
              </label>
              <input
                type="file"
                ref={collectionCoverInputRef}
                onChange={handleCollectionImageUpload}
                accept="image/*"
                disabled={uploadingCollectionImage}
                className="w-full cursor-pointer rounded-lg border border-[var(--color-secondary)]/40 bg-black/35 px-4 py-2"
              />
              <p className="mt-2 text-sm text-[var(--text-light)]/60">
                {uploadingCollectionImage ? "Uploading image..." : "Upload a cover image for the collection."}
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
                className="cursor-pointer rounded-md bg-[var(--color-primary)] px-5 py-2 font-semibold text-[var(--text-color-dark)] disabled:opacity-60"
              >
                {collectionSubmitting
                  ? "Saving..."
                  : selectedCollectionSlug
                    ? "Save Collection"
                    : "Create Collection"}
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
                className="cursor-pointer rounded-md border border-[var(--color-secondary)]/40 bg-black/35 px-5 py-2"
              >
                {selectedCollectionSlug ? "Reset" : "Clear"}
              </button>
              {selectedCollectionSlug && (
                <button
                  type="button"
                  onClick={handleCollectionDelete}
                  disabled={collectionDeleting}
                  className="cursor-pointer rounded-md border border-red-400/50 bg-red-500/15 px-5 py-2 text-red-200 disabled:opacity-60"
                >
                  {collectionDeleting ? "Deleting..." : "Delete Collection"}
                </button>
              )}
            </div>
          </form>

          <section className="overflow-hidden rounded-xl border border-[var(--color-secondary)]/35 bg-black/25">
            <div className="border-b border-[var(--color-secondary)]/20 bg-black/30 px-5 py-5 backdrop-blur">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-[var(--color-primary)]">Collection Items</h3>
                  <p className="text-sm text-[var(--text-light)]/60">{panelTitle}</p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <label className="min-w-[220px] flex-1 text-sm text-[var(--text-light)]/70">
                    <span className="mb-2 block uppercase tracking-[0.18em] text-[var(--color-secondary)]/70">
                      Scan Items
                    </span>
                    <input
                      type="search"
                      value={itemSearch}
                      onChange={(event) => setItemSearch(event.target.value)}
                      placeholder="Search by title, slug, or markdown"
                      disabled={!canManageItems}
                      className="w-full rounded-lg border border-[var(--color-secondary)]/35 bg-black/35 px-4 py-2 text-sm disabled:opacity-50"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={openNewItemDrawer}
                    disabled={!canManageItems}
                    className="cursor-pointer rounded-md bg-[var(--color-primary)] px-4 py-2 font-semibold text-[var(--text-color-dark)] shadow-[0_12px_30px_rgba(255,197,102,0.18)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    + New Item
                  </button>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--text-light)]/55">
                <span className="rounded-full border border-[var(--color-secondary)]/25 bg-black/25 px-3 py-1">
                  {visibleCountLabel}
                </span>
                {activeItem && (
                  <span className="rounded-full border border-[var(--color-primary)]/35 bg-[var(--color-primary)]/10 px-3 py-1 text-[var(--color-primary)]">
                    Active: {activeItem.title}
                  </span>
                )}
              </div>
            </div>

            <div className="max-h-[min(68vh,46rem)] overflow-y-auto p-5">
              {!canManageItems ? (
                <div className="rounded-md border border-[var(--color-secondary)]/20 bg-black/20 px-4 py-6 text-[var(--text-light)]/70">
                  Create and save a collection first to start adding items.
                </div>
              ) : filteredItems.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                  {filteredItems.map((item) => {
                    const isActive = item.slug === selectedItemSlug;
                    const summary = getItemSummary(item.markdown);

                    return (
                      <button
                        key={item.slug}
                        type="button"
                        onClick={() => openItemDrawer(item)}
                        className={`group flex h-full flex-col rounded-xl border p-4 text-left transition ${
                          isActive
                            ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 shadow-[0_18px_45px_rgba(255,197,102,0.12)]"
                            : "border-[var(--color-secondary)]/20 bg-black/20 hover:border-[var(--color-secondary)]/45 hover:bg-black/35"
                        }`}
                      >
                        <div className="mb-4 flex items-start gap-3">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.title}
                              className="h-16 w-16 shrink-0 rounded-lg border border-[var(--color-secondary)]/30 object-cover"
                            />
                          ) : (
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-[var(--color-secondary)]/30 bg-black/25 text-[10px] uppercase tracking-[0.22em] text-[var(--text-light)]/45">
                              No Art
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-lg font-semibold text-[var(--color-primary)]">{item.title}</p>
                            <p className="truncate text-sm text-[var(--text-light)]/60">/{item.slug}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--text-light)]/45">
                              {item.date}
                            </p>
                          </div>
                        </div>
                        <div className="flex-1 rounded-lg border border-[var(--color-secondary)]/15 bg-black/20 px-3 py-3 text-sm leading-6 text-[var(--text-light)]/72">
                          {summary || "No markdown notes yet."}
                        </div>
                        <div className="mt-4 flex items-center justify-between text-xs uppercase tracking-[0.16em] text-[var(--text-light)]/50">
                          <span>{item.markdown ? "Notes ready" : "Needs notes"}</span>
                          <span className={isActive ? "text-[var(--color-primary)]" : "group-hover:text-[var(--text-light)]/75"}>
                            {isActive && itemDrawerOpen ? "Editing" : "Open Drawer"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-md border border-[var(--color-secondary)]/20 bg-black/20 px-4 py-6 text-[var(--text-light)]/70">
                  {currentCollection?.items.length
                    ? `No items match “${itemSearch}”.`
                    : "No items in this collection yet. Add one from the sticky action above."}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {itemDrawerOpen && (
        <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="Collection item editor">
          <button
            type="button"
            aria-label="Close item editor"
            onClick={closeItemDrawer}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <div className="relative ml-auto flex h-full w-full max-w-3xl flex-col border-l border-[var(--color-secondary)]/30 bg-[var(--color-dark)]/96 shadow-[-18px_0_45px_rgba(0,0,0,0.45)]">
            <div className="border-b border-[var(--color-secondary)]/20 bg-black/35 px-5 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-secondary)]/70">
                    {currentCollection?.metadata.name || "Collection Item"}
                  </p>
                  <h4 className="mt-2 text-2xl font-semibold text-[var(--color-primary)]">
                    {selectedItemSlug ? "Edit Item" : "Create Item"}
                  </h4>
                  <p className="mt-2 text-sm text-[var(--text-light)]/60">
                    Work inside the drawer so the item list stays visible and compact behind it.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeItemDrawer}
                  className="cursor-pointer rounded-md border border-[var(--color-secondary)]/35 bg-black/30 px-3 py-2 text-sm font-medium text-[var(--text-light)]/80"
                >
                  Close
                </button>
              </div>
            </div>

            <form onSubmit={handleItemSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <input
                type="file"
                ref={inlineImageInputRef}
                onChange={handleInlineImageUpload}
                accept="image/*"
                multiple
                className="hidden"
              />

              <div className="flex items-center justify-between gap-3 border-b border-[var(--color-secondary)]/15 bg-black/25 px-5 py-4">
                <div>
                  <p className="text-sm text-[var(--text-light)]/70">
                    {selectedItemSlug ? `/${selectedItemSlug}` : "New item draft"}
                  </p>
                  {itemSummary && <p className="text-xs text-[var(--text-light)]/50">{itemSummary.slice(0, 90)}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => inlineImageInputRef.current?.click()}
                    disabled={uploadingInlineImage || !canManageItems}
                    className="cursor-pointer rounded-md border border-[var(--color-secondary)]/35 bg-black/35 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {uploadingInlineImage ? "Uploading..." : "Insert Photo"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemPreview((prev) => !prev)}
                    className="cursor-pointer rounded-md bg-[var(--color-primary)] px-3 py-2 text-sm font-medium text-[var(--text-color-dark)]"
                  >
                    {itemPreview ? "Edit" : "Preview"}
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
                  <div className="space-y-5">
                    <div className="grid gap-5 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-[var(--color-secondary)]">Title</label>
                        <input
                          type="text"
                          value={itemForm.title}
                          onChange={(event) => {
                            const title = event.target.value;
                            setItemForm((prev) => ({
                              ...prev,
                              title,
                              slug:
                                !selectedItemSlug || prev.slug === generateSlug(prev.title)
                                  ? generateSlug(title)
                                  : prev.slug,
                            }));
                          }}
                          className="w-full rounded-lg border border-[var(--color-secondary)]/40 bg-black/35 px-4 py-2"
                          required
                          disabled={!canManageItems}
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-[var(--color-secondary)]">Slug</label>
                        <input
                          type="text"
                          value={itemForm.slug}
                          onChange={(event) =>
                            setItemForm((prev) => ({
                              ...prev,
                              slug: event.target.value,
                            }))
                          }
                          className="w-full rounded-lg border border-[var(--color-secondary)]/40 bg-black/35 px-4 py-2"
                          required
                          disabled={!canManageItems}
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-[var(--color-secondary)]">Date</label>
                        <input
                          type="date"
                          value={itemForm.date}
                          onChange={(event) =>
                            setItemForm((prev) => ({
                              ...prev,
                              date: event.target.value,
                            }))
                          }
                          className="w-full rounded-lg border border-[var(--color-secondary)]/40 bg-black/35 px-4 py-2"
                          required
                          disabled={!canManageItems}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <label className="block text-sm font-medium text-[var(--color-secondary)]">
                          Description (Markdown)
                        </label>
                        <span className="text-xs uppercase tracking-[0.18em] text-[var(--text-light)]/45">
                          {itemPreview ? "Previewing" : "Editing"}
                        </span>
                      </div>
                      {!itemPreview ? (
                        <textarea
                          ref={itemTextAreaRef}
                          value={itemForm.markdown}
                          onChange={(event) =>
                            setItemForm((prev) => ({
                              ...prev,
                              markdown: event.target.value,
                            }))
                          }
                          className="min-h-[340px] w-full resize-y rounded-lg border border-[var(--color-secondary)]/40 bg-black/35 px-4 py-3 font-mono text-sm"
                          disabled={!canManageItems}
                          placeholder="Optional notes or description for this item..."
                        />
                      ) : (
                        <div className="min-h-[340px] overflow-auto rounded-lg border border-[var(--color-secondary)]/40 bg-black/40 px-4 py-3 leading-7">
                          <MarkdownRenderer content={itemForm.markdown} />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div className="rounded-xl border border-[var(--color-secondary)]/20 bg-black/20 p-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-secondary)]/70">
                        Cover Image
                      </p>
                      <label className="mt-3 block text-sm font-medium text-[var(--text-light)]/75">
                        Item Image (square cover)
                      </label>
                      <input
                        type="file"
                        ref={itemCoverInputRef}
                        onChange={handleItemImageUpload}
                        accept="image/*"
                        disabled={uploadingItemImage || !canManageItems}
                        className="mt-3 w-full cursor-pointer rounded-lg border border-[var(--color-secondary)]/40 bg-black/35 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      <p className="mt-2 text-sm text-[var(--text-light)]/60">
                        {uploadingItemImage
                          ? "Uploading image..."
                          : "Upload the main square cover image for this item."}
                      </p>
                      {itemForm.image ? (
                        <img
                          src={itemForm.image}
                          alt="Item cover preview"
                          className="mt-4 aspect-square w-full rounded-lg border border-[var(--color-secondary)]/30 object-cover"
                        />
                      ) : (
                        <div className="mt-4 flex aspect-square w-full items-center justify-center rounded-lg border border-dashed border-[var(--color-secondary)]/25 bg-black/25 text-xs uppercase tracking-[0.22em] text-[var(--text-light)]/40">
                          Cover Preview
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl border border-[var(--color-secondary)]/20 bg-black/20 p-4 text-sm text-[var(--text-light)]/70">
                      <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-secondary)]/70">Workflow</p>
                      <ul className="mt-3 space-y-3 leading-6">
                        <li>• Keep the drawer open while scanning the bounded list behind it.</li>
                        <li>• Use search above the grid to jump straight to long collections.</li>
                        <li>• Insert inline images without leaving the markdown field.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-[var(--color-secondary)]/20 bg-black/35 px-5 py-4">
                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={itemSubmitting || !canManageItems}
                    className="cursor-pointer rounded-md bg-[var(--color-primary)] px-5 py-2 font-semibold text-[var(--text-color-dark)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {itemSubmitting ? "Saving..." : selectedItemSlug ? "Save Item" : "Create Item"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (activeItem) {
                        openItemDrawer(activeItem);
                      } else if (selectedCollectionSlug) {
                        resetItemEditor(selectedCollectionSlug);
                      }
                    }}
                    className="cursor-pointer rounded-md border border-[var(--color-secondary)]/40 bg-black/35 px-5 py-2"
                  >
                    {selectedItemSlug ? "Reset" : "Clear"}
                  </button>
                  {selectedItemSlug && (
                    <button
                      type="button"
                      onClick={handleItemDelete}
                      disabled={itemDeleting}
                      className="cursor-pointer rounded-md border border-red-400/50 bg-red-500/15 px-5 py-2 text-red-200 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {itemDeleting ? "Deleting..." : "Delete Item"}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
