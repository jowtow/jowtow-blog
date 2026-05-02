"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuthStore } from "@/lib/auth";
import MarkdownRenderer from "@/components/MarkdownRenderer/MarkdownRenderer";

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

type ItemEditorSurface = "edit" | "preview";
type CollectionsMobilePanel = "collections" | "details" | "items";

const getTodayString = () => new Date().toISOString().split("T")[0];

const createEmptyCollectionForm = (): AdminCollectionMetadata => ({
  slug: "",
  name: "",
  description: "",
  date: getTodayString(),
  image: "",
});

const createEmptyItemForm = (collectionSlug = ""): AdminCollectionItem => ({
  collectionSlug,
  slug: "",
  title: "",
  markdown: "",
  image: "",
  date: getTodayString(),
});

const generateSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const getItemSummary = (markdown: string) => {
  const plainText = markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[>#*_`~-]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!plainText) {
    return "No description yet.";
  }

  return plainText.length > 110 ? `${plainText.slice(0, 107)}...` : plainText;
};

export default function CollectionsManager() {
  const { user } = useAuthStore();
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [collectionsList, setCollectionsList] = useState<AdminCollection[]>([]);
  const [loadingCollections, setLoadingCollections] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedCollectionSlug, setSelectedCollectionSlug] = useState<string | null>(null);
  const [collectionForm, setCollectionForm] = useState<AdminCollectionMetadata>(createEmptyCollectionForm);
  const [collectionSubmitting, setCollectionSubmitting] = useState(false);
  const [collectionDeleting, setCollectionDeleting] = useState(false);
  const [selectedItemSlug, setSelectedItemSlug] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState<AdminCollectionItem>(createEmptyItemForm);
  const [itemSubmitting, setItemSubmitting] = useState(false);
  const [itemDeleting, setItemDeleting] = useState(false);
  const [itemEditorOpen, setItemEditorOpen] = useState(false);
  const [itemEditorSurface, setItemEditorSurface] = useState<ItemEditorSurface>("edit");
  const [mobilePanel, setMobilePanel] = useState<CollectionsMobilePanel>("collections");
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
      const netlifyIdentity = (window as Window & {
        netlifyIdentity?: {
          currentUser?: () => { token: { access_token: string } };
        };
      }).netlifyIdentity;

      if (netlifyIdentity?.currentUser?.()) {
        try {
          const token = netlifyIdentity.currentUser().token.access_token;
          setAuthToken(token);
        } catch (tokenError) {
          console.error("Failed to get token:", tokenError);
        }
      }
    };

    getToken();
  }, [user]);

  const selectCollection = useCallback((collection: AdminCollection) => {
    setSelectedCollectionSlug(collection.metadata.slug);
    setCollectionForm(collection.metadata);
    setSelectedItemSlug(null);
    setItemForm(createEmptyItemForm(collection.metadata.slug));
    setItemEditorOpen(false);
    setItemEditorSurface("edit");
    setError(null);
    setSuccess(null);
    setMobilePanel("details");
  }, []);

  const startNewCollection = useCallback(() => {
    setSelectedCollectionSlug(null);
    setCollectionForm(createEmptyCollectionForm());
    setSelectedItemSlug(null);
    setItemForm(createEmptyItemForm());
    setItemEditorOpen(false);
    setItemEditorSurface("edit");
    setError(null);
    setSuccess(null);
    setMobilePanel("details");
  }, []);

  const selectItem = useCallback((item: AdminCollectionItem) => {
    setSelectedItemSlug(item.slug);
    setItemForm(item);
    setItemEditorSurface("edit");
    setError(null);
    setSuccess(null);
    setMobilePanel("items");
  }, []);

  const loadCollections = useCallback(
    async ({
      preferredSlug,
      autoSelectFirst = false,
    }: { preferredSlug?: string | null; autoSelectFirst?: boolean } = {}) => {
      setLoadingCollections(true);
      setError(null);

      try {
        const response = await fetch("/api/collections");
        if (!response.ok) {
          throw new Error("Failed to load collections");
        }

        const data = (await response.json()) as AdminCollection[];
        const sortedCollections = data.sort(
          (a, b) => Date.parse(b.metadata.date) - Date.parse(a.metadata.date),
        );

        setCollectionsList(sortedCollections);

        if (sortedCollections.length === 0) {
          startNewCollection();
          return;
        }

        if (preferredSlug) {
          const matchedCollection =
            sortedCollections.find((collection) => collection.metadata.slug === preferredSlug) ??
            sortedCollections[0];
          selectCollection(matchedCollection);
          return;
        }

        if (autoSelectFirst) {
          selectCollection(sortedCollections[0]);
        }
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load collections",
        );
      } finally {
        setLoadingCollections(false);
      }
    },
    [selectCollection, startNewCollection],
  );

  useEffect(() => {
    void loadCollections({ autoSelectFirst: true });
  }, [loadCollections]);

  useEffect(() => {
    if (!itemEditorOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setItemEditorOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [itemEditorOpen]);

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

  const currentCollection = useMemo(
    () =>
      selectedCollectionSlug
        ? collectionsList.find((collection) => collection.metadata.slug === selectedCollectionSlug) ?? null
        : null,
    [collectionsList, selectedCollectionSlug],
  );

  const sortedItems = useMemo(() => {
    if (!currentCollection) {
      return [];
    }

    return currentCollection.items
      .slice()
      .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  }, [currentCollection]);

  const startNewItem = useCallback(() => {
    if (!selectedCollectionSlug) {
      setError("Save the collection before adding items to it.");
      return false;
    }

    setSelectedItemSlug(null);
    setItemForm(createEmptyItemForm(selectedCollectionSlug));
    setItemEditorSurface("edit");
    setError(null);
    setSuccess(null);
    setMobilePanel("items");
    return true;
  }, [selectedCollectionSlug]);

  const openNewItemEditor = () => {
    if (!startNewItem()) {
      return;
    }

    setItemEditorOpen(true);
  };

  const openItemEditor = (item: AdminCollectionItem) => {
    selectItem(item);
    setItemEditorOpen(true);
  };

  const insertInlineImage = (insertion: string) => {
    const textarea = itemTextAreaRef.current;

    if (!textarea) {
      setItemForm((previous) => ({
        ...previous,
        markdown: `${previous.markdown}${insertion}`,
      }));
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nextMarkdown =
      itemForm.markdown.slice(0, start) + insertion + itemForm.markdown.slice(end);

    setItemForm((previous) => ({ ...previous, markdown: nextMarkdown }));

    requestAnimationFrame(() => {
      textarea.focus();
      const nextCaret = start + insertion.length;
      textarea.setSelectionRange(nextCaret, nextCaret);
    });
  };

  const handleCollectionImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setUploadingCollectionImage(true);
    setError(null);

    try {
      const url = await uploadImageFile(file);
      setCollectionForm((previous) => ({ ...previous, image: url }));
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "Failed to upload image",
      );
    } finally {
      setUploadingCollectionImage(false);
      if (collectionCoverInputRef.current) {
        collectionCoverInputRef.current.value = "";
      }
    }
  };

  const handleItemImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setUploadingItemImage(true);
    setError(null);

    try {
      const url = await uploadImageFile(file);
      setItemForm((previous) => ({ ...previous, image: url }));
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "Failed to upload image",
      );
    } finally {
      setUploadingItemImage(false);
      if (itemCoverInputRef.current) {
        itemCoverInputRef.current.value = "";
      }
    }
  };

  const handleInlineImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      return;
    }

    setUploadingInlineImage(true);
    setError(null);

    try {
      const snippets = await Promise.all(
        files.map(async (file) => {
          const url = await uploadImageFile(file);
          const altText = file.name
            .replace(/\.[^.]+$/, "")
            .replace(/[-_]+/g, " ");
          return `![${altText}](${url})`;
        }),
      );

      insertInlineImage(`\n${snippets.join("\n")}\n`);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "Failed to upload image",
      );
    } finally {
      setUploadingInlineImage(false);
      if (inlineImageInputRef.current) {
        inlineImageInputRef.current.value = "";
      }
    }
  };

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
      if (
        !collectionForm.name ||
        !collectionForm.slug ||
        !collectionForm.description ||
        !collectionForm.date
      ) {
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
      setSelectedCollectionSlug(savedSlug);
      await loadCollections({ preferredSlug: savedSlug });
      setSuccess(
        selectedCollectionSlug
          ? "Collection updated successfully."
          : "Collection created successfully.",
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Failed to save collection",
      );
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
      const response = await fetch(
        `/api/collections?slug=${encodeURIComponent(selectedCollectionSlug)}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete collection");
      }

      startNewCollection();
      await loadCollections({ autoSelectFirst: true });
      setSuccess("Collection deleted successfully.");
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "Failed to delete collection",
      );
    } finally {
      setCollectionDeleting(false);
    }
  };

  const handleItemSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const collectionSlug = selectedCollectionSlug || collectionForm.slug;
    if (!collectionSlug) {
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

      const response = await fetch(
        `/api/collections/${encodeURIComponent(collectionSlug)}/items`,
        {
          method: selectedItemSlug ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            ...itemForm,
            collectionSlug,
            originalSlug: selectedItemSlug,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save collection item");
      }

      const payload = await response.json();
      const savedItem = payload.data as AdminCollectionItem;
      await loadCollections({ preferredSlug: collectionSlug });
      setSelectedItemSlug(savedItem.slug);
      setItemForm(savedItem);
      setItemEditorOpen(true);
      setSuccess(
        selectedItemSlug ? "Item updated successfully." : "Item created successfully.",
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to save collection item",
      );
    } finally {
      setItemSubmitting(false);
    }
  };

  const handleItemDelete = async () => {
    const collectionSlug = selectedCollectionSlug || collectionForm.slug;
    if (!collectionSlug || !selectedItemSlug) {
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
        `/api/collections/${encodeURIComponent(collectionSlug)}/items?slug=${encodeURIComponent(selectedItemSlug)}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete item");
      }

      await loadCollections({ preferredSlug: collectionSlug });
      startNewItem();
      setItemEditorOpen(false);
      setSuccess("Item deleted successfully.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete item");
    } finally {
      setItemDeleting(false);
    }
  };

  return (
    <div className="space-y-4 text-[var(--text-light)]">
      <div className="rounded-2xl border border-[var(--color-secondary)]/25 bg-black/20 p-3 lg:hidden">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-secondary)]/70">Collections workspace</p>
            <p className="text-sm text-[var(--text-light)]/60">
              Browse libraries, edit collection details, and manage items as separate mobile surfaces.
            </p>
          </div>
          <span className="rounded-full border border-[var(--color-secondary)]/25 px-2.5 py-1 text-xs text-[var(--text-light)]/70">
            {collectionsList.length} total
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["collections", "Collections"],
              ["details", "Details"],
              ["items", "Items"],
            ] as Array<[CollectionsMobilePanel, string]>
          ).map(([key, label]) => {
            const isActive = mobilePanel === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setMobilePanel(key)}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-[var(--color-primary)] text-[var(--text-color-dark)]"
                    : "border border-[var(--color-secondary)]/20 bg-black/25 text-[var(--text-light)]/75"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {(error || success) && (
        <div
          className={`rounded-xl border px-4 py-3 ${
            error
              ? "border-red-400/35 bg-red-500/10 text-red-200"
              : "border-[var(--color-primary)]/35 bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
          }`}
        >
          {error || success}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[240px_minmax(320px,400px)_minmax(0,1fr)]">
        <aside className={`${mobilePanel === "collections" ? "block" : "hidden"} rounded-2xl border border-[var(--color-secondary)]/35 bg-black/25 p-3.5 md:p-4 xl:block`}>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-[var(--color-primary)]">Collections</h2>
              <p className="mt-1 text-sm text-[var(--text-light)]/60">
                Select a workspace or start a new one.
              </p>
            </div>
            <button
              type="button"
              onClick={startNewCollection}
              className="cursor-pointer rounded-md bg-[var(--color-primary)] px-3 py-2 font-semibold text-[var(--text-color-dark)]"
            >
              New
            </button>
          </div>

          <div className="mb-4 rounded-xl border border-[var(--color-secondary)]/20 bg-black/20 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-secondary)]/70">Library</p>
            <p className="mt-2 text-3xl font-semibold text-[var(--color-primary)]">
              {collectionsList.length}
            </p>
            <p className="text-sm text-[var(--text-light)]/55">collections in rotation</p>
          </div>

          {loadingCollections ? (
            <div className="rounded-xl border border-[var(--color-secondary)]/20 bg-black/20 px-4 py-6 text-[var(--text-light)]/70">
              Loading collections...
            </div>
          ) : collectionsList.length === 0 ? (
            <div className="rounded-xl border border-[var(--color-secondary)]/20 bg-black/20 px-4 py-6 text-[var(--text-light)]/70">
              No collections yet. Create one to start building the workspace.
            </div>
          ) : (
            <div className="grid gap-2">
              {collectionsList.map((collection) => {
                const isActive = collection.metadata.slug === selectedCollectionSlug;
                return (
                  <button
                    key={collection.metadata.slug}
                    type="button"
                    onClick={() => selectCollection(collection)}
                    className={`cursor-pointer rounded-xl border px-4 py-3 text-left transition ${
                      isActive
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 shadow-[0_0_0_1px_rgba(127,255,0,0.12)]"
                        : "border-[var(--color-secondary)]/20 bg-black/20 hover:bg-black/35"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-[var(--color-primary)]">
                          {collection.metadata.name}
                        </p>
                        <p className="truncate text-sm text-[var(--text-light)]/60">
                          /{collection.metadata.slug}
                        </p>
                      </div>
                      <span className="rounded-full border border-[var(--color-secondary)]/25 px-2 py-1 text-xs text-[var(--text-light)]/70">
                        {collection.items.length}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-[var(--text-light)]/55">
                      {collection.metadata.description}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        <form
          onSubmit={handleCollectionSubmit}
          className={`${mobilePanel === "details" ? "block" : "hidden"} rounded-2xl border border-[var(--color-secondary)]/35 bg-black/25 p-4 md:p-5 xl:block`}
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-[var(--color-primary)]">
                {selectedCollectionSlug ? "Collection Editor" : "New Collection"}
              </h3>
              <p className="mt-1 text-sm text-[var(--text-light)]/60">
                This pane stays pinned to the selected collection while you browse items.
              </p>
            </div>
            <div className="rounded-xl border border-[var(--color-secondary)]/20 bg-black/20 px-3 py-2 text-right">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-secondary)]/70">Items</p>
              <p className="text-lg font-semibold text-[var(--color-primary)]">
                {currentCollection?.items.length ?? 0}
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--color-secondary)]">
                Collection Name
              </label>
              <input
                type="text"
                value={collectionForm.name}
                onChange={(event) => {
                  const name = event.target.value;
                  setCollectionForm((previous) => ({
                    ...previous,
                    name,
                    slug:
                      !selectedCollectionSlug || previous.slug === generateSlug(previous.name)
                        ? generateSlug(name)
                        : previous.slug,
                  }));
                }}
                className="w-full rounded-lg border border-[var(--color-secondary)]/40 bg-black/35 px-4 py-2"
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--color-secondary)]">
                  Slug
                </label>
                <input
                  type="text"
                  value={collectionForm.slug}
                  onChange={(event) =>
                    setCollectionForm((previous) => ({
                      ...previous,
                      slug: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-[var(--color-secondary)]/40 bg-black/35 px-4 py-2"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--color-secondary)]">
                  Date
                </label>
                <input
                  type="date"
                  value={collectionForm.date}
                  onChange={(event) =>
                    setCollectionForm((previous) => ({
                      ...previous,
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
                Description
              </label>
              <textarea
                value={collectionForm.description}
                onChange={(event) =>
                  setCollectionForm((previous) => ({
                    ...previous,
                    description: event.target.value,
                  }))
                }
                className="min-h-36 w-full resize-y rounded-lg border border-[var(--color-secondary)]/40 bg-black/35 px-4 py-3"
                required
              />
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
                {uploadingCollectionImage
                  ? "Uploading image..."
                  : "Upload the collection cover art used across the public carousel."}
              </p>
              {collectionForm.image && (
                <img
                  src={collectionForm.image}
                  alt="Collection cover preview"
                  className="mt-4 max-h-56 rounded-xl border border-[var(--color-secondary)]/40 object-cover"
                />
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
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
                  return;
                }

                startNewCollection();
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

        <section className={`${mobilePanel === "items" ? "block" : "hidden"} w-full min-w-0 overflow-hidden rounded-2xl border border-[var(--color-secondary)]/35 bg-black/25 xl:block`}>
          <div className="flex flex-col gap-4 border-b border-[var(--color-secondary)]/20 px-4 py-3 md:flex-row md:items-start md:justify-between md:px-5 md:py-4">
            <div className="min-w-0">
              <h3 className="text-xl font-semibold text-[var(--color-primary)]">Item Workspace</h3>
              <p className="mt-1 text-sm text-[var(--text-light)]/60">
                {selectedCollectionSlug
                  ? `Dense browser for /${selectedCollectionSlug}. Double-click a row to edit.`
                  : "Select or create a collection to unlock item editing."}
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:flex-wrap md:items-center md:justify-end">
              <div className="rounded-xl border border-[var(--color-secondary)]/20 bg-black/20 px-3 py-2 text-left md:text-right">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-secondary)]/70">Visible items</p>
                <p className="text-lg font-semibold text-[var(--color-primary)]">{sortedItems.length}</p>
              </div>
              <button
                type="button"
                onClick={openNewItemEditor}
                disabled={!selectedCollectionSlug}
                className="w-full cursor-pointer rounded-md bg-[var(--color-primary)] px-4 py-2 font-semibold text-[var(--text-color-dark)] disabled:opacity-50 md:w-auto"
              >
                New Item
              </button>
            </div>
          </div>

          {!selectedCollectionSlug ? (
            <div className="px-4 py-6 text-[var(--text-light)]/65 md:px-5 md:py-8">
              Save a collection, then open the item workspace from here.
            </div>
          ) : sortedItems.length === 0 ? (
            <div className="px-4 py-6 text-[var(--text-light)]/65 md:px-5 md:py-8">
              No items in this collection yet. Use <span className="text-[var(--color-primary)]">New Item</span> to add the first one.
            </div>
          ) : (
            <>
              <div className="grid gap-3 px-4 py-4 md:hidden">
                {sortedItems.map((item) => {
                  const isActive = item.slug === selectedItemSlug;
                  const hasMarkdown = item.markdown.trim().length > 0;

                  return (
                    <article
                      key={item.slug}
                      className={`min-w-0 overflow-hidden rounded-2xl border bg-black/20 p-4 transition ${
                        isActive
                          ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                          : "border-[var(--color-secondary)]/20"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--color-secondary)]/20 bg-black/25">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-xs text-[var(--text-light)]/35">none</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-[var(--color-primary)]">
                                {item.title}
                              </p>
                              <p className="truncate text-sm text-[var(--text-light)]/60">
                                /{item.slug}
                              </p>
                            </div>
                            <span
                              className={`rounded-full border px-2 py-1 text-xs ${
                                hasMarkdown
                                  ? "border-[var(--color-primary)]/40 text-[var(--color-primary)]"
                                  : "border-[var(--color-secondary)]/25 text-[var(--text-light)]/55"
                              }`}
                            >
                              {hasMarkdown ? "Ready" : "Draft"}
                            </span>
                          </div>
                          <p className="mt-2 truncate text-sm text-[var(--text-light)]/55">
                            {getItemSummary(item.markdown)}
                          </p>
                          <p className="mt-2 text-xs text-[var(--text-light)]/55">{item.date}</p>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => selectItem(item)}
                          className="cursor-pointer rounded-xl border border-[var(--color-secondary)]/30 bg-black/25 px-3 py-3 text-sm"
                        >
                          Select
                        </button>
                        <button
                          type="button"
                          onClick={() => openItemEditor(item)}
                          className="cursor-pointer rounded-xl bg-[var(--color-primary)] px-3 py-3 text-sm font-semibold text-[var(--text-color-dark)]"
                        >
                          Open Editor
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <div className="min-w-[720px]">
                  <div className="grid grid-cols-[minmax(0,2.1fr)_150px_120px_120px] gap-3 border-b border-[var(--color-secondary)]/15 px-5 py-3 text-xs uppercase tracking-[0.18em] text-[var(--color-secondary)]/70">
                    <span>Item</span>
                    <span>Slug</span>
                    <span>Date</span>
                    <span>Status</span>
                  </div>
                  <div className="divide-y divide-[var(--color-secondary)]/12">
                    {sortedItems.map((item) => {
                      const isActive = item.slug === selectedItemSlug;
                      const hasMarkdown = item.markdown.trim().length > 0;

                      return (
                        <button
                          key={item.slug}
                          type="button"
                          onClick={() => selectItem(item)}
                          onDoubleClick={() => openItemEditor(item)}
                          className={`grid w-full cursor-pointer grid-cols-[minmax(0,2.1fr)_150px_120px_120px] gap-3 px-5 py-3 text-left transition ${
                            isActive
                              ? "bg-[var(--color-primary)]/10"
                              : "hover:bg-white/4"
                          }`}
                          title="Double-click to open the fullscreen editor"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--color-secondary)]/20 bg-black/25">
                              {item.image ? (
                                <img
                                  src={item.image}
                                  alt={item.title}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <span className="text-xs text-[var(--text-light)]/35">none</span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-[var(--color-primary)]">
                                {item.title}
                              </p>
                              <p className="truncate text-sm text-[var(--text-light)]/55">
                                {getItemSummary(item.markdown)}
                              </p>
                            </div>
                          </div>
                          <div className="self-center text-sm text-[var(--text-light)]/65">/{item.slug}</div>
                          <div className="self-center text-sm text-[var(--text-light)]/65">{item.date}</div>
                          <div className="self-center text-sm">
                            <span
                              className={`rounded-full border px-2 py-1 text-xs ${
                                hasMarkdown
                                  ? "border-[var(--color-primary)]/40 text-[var(--color-primary)]"
                                  : "border-[var(--color-secondary)]/25 text-[var(--text-light)]/55"
                              }`}
                            >
                              {hasMarkdown ? "Ready" : "Draft"}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      {itemEditorOpen && (
        <div className="fixed inset-0 z-[90] bg-black/80 p-3 backdrop-blur-sm lg:p-6">
          <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-[var(--color-secondary)]/35 bg-[var(--color-dark)] shadow-[0_30px_120px_rgba(0,0,0,0.55)]">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--color-secondary)]/20 px-4 py-3 md:px-5 md:py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-secondary)]/75">Fullscreen item editor</p>
                <h3 className="mt-1 text-2xl font-semibold text-[var(--color-primary)]">
                  {selectedItemSlug ? itemForm.title || "Edit Item" : "Create Item"}
                </h3>
                <p className="mt-1 text-sm text-[var(--text-light)]/60">
                  {selectedCollectionSlug
                    ? `Editing inside /${selectedCollectionSlug}`
                    : "Save the collection before adding items."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setItemEditorOpen(false)}
                className="cursor-pointer rounded-md border border-[var(--color-secondary)]/35 bg-black/35 px-4 py-2 text-sm text-[var(--text-light)] transition hover:bg-black/50"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleItemSubmit} className="min-h-0 flex-1 overflow-y-auto p-3 md:p-4 xl:grid xl:gap-5 xl:overflow-hidden xl:p-5 xl:grid-cols-[360px_minmax(0,1fr)]">
              <section className="rounded-2xl border border-[var(--color-secondary)]/25 bg-black/25 p-4 xl:min-h-0 xl:overflow-y-auto">
                <div className="grid gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[var(--color-secondary)]">
                      Title
                    </label>
                    <input
                      type="text"
                      value={itemForm.title}
                      onChange={(event) => {
                        const title = event.target.value;
                        setItemForm((previous) => ({
                          ...previous,
                          title,
                          slug:
                            !selectedItemSlug || previous.slug === generateSlug(previous.title)
                              ? generateSlug(title)
                              : previous.slug,
                        }));
                      }}
                      className="w-full rounded-lg border border-[var(--color-secondary)]/40 bg-black/35 px-4 py-2"
                      required
                      disabled={!selectedCollectionSlug}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[var(--color-secondary)]">
                      Slug
                    </label>
                    <input
                      type="text"
                      value={itemForm.slug}
                      onChange={(event) =>
                        setItemForm((previous) => ({
                          ...previous,
                          slug: event.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-[var(--color-secondary)]/40 bg-black/35 px-4 py-2"
                      required
                      disabled={!selectedCollectionSlug}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[var(--color-secondary)]">
                      Date
                    </label>
                    <input
                      type="date"
                      value={itemForm.date}
                      onChange={(event) =>
                        setItemForm((previous) => ({
                          ...previous,
                          date: event.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-[var(--color-secondary)]/40 bg-black/35 px-4 py-2"
                      required
                      disabled={!selectedCollectionSlug}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[var(--color-secondary)]">
                      Item Image (square cover)
                    </label>
                    <input
                      type="file"
                      ref={itemCoverInputRef}
                      onChange={handleItemImageUpload}
                      accept="image/*"
                      disabled={uploadingItemImage || !selectedCollectionSlug}
                      className="w-full cursor-pointer rounded-lg border border-[var(--color-secondary)]/40 bg-black/35 px-4 py-2"
                    />
                    <p className="mt-2 text-sm text-[var(--text-light)]/60">
                      {uploadingItemImage
                        ? "Uploading image..."
                        : "Upload the square cover art for the selected item."}
                    </p>
                    {itemForm.image && (
                      <img
                        src={itemForm.image}
                        alt="Item cover preview"
                        className="mt-4 aspect-square w-full rounded-xl border border-[var(--color-secondary)]/40 object-cover"
                      />
                    )}
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={itemSubmitting || !selectedCollectionSlug}
                    className="cursor-pointer rounded-md bg-[var(--color-primary)] px-5 py-2 font-semibold text-[var(--text-color-dark)] disabled:opacity-50"
                  >
                    {itemSubmitting
                      ? "Saving..."
                      : selectedItemSlug
                        ? "Save Item"
                        : "Create Item"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const matchedItem = currentCollection?.items.find((item) => item.slug === selectedItemSlug);
                      if (matchedItem) {
                        selectItem(matchedItem);
                        return;
                      }

                      startNewItem();
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
                      className="cursor-pointer rounded-md border border-red-400/50 bg-red-500/15 px-5 py-2 text-red-200 disabled:opacity-60"
                    >
                      {itemDeleting ? "Deleting..." : "Delete Item"}
                    </button>
                  )}
                </div>
              </section>

              <section className="mt-4 flex min-h-0 flex-col overflow-hidden rounded-2xl border border-[var(--color-secondary)]/25 bg-black/25 xl:mt-0">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-secondary)]/20 px-4 py-3">
                  <div>
                    <h4 className="font-semibold text-[var(--color-primary)]">Markdown Workspace</h4>
                    <p className="text-sm text-[var(--text-light)]/55">
                      Desktop keeps editor and preview side by side. Smaller screens can swap surfaces.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex rounded-lg border border-[var(--color-secondary)]/30 bg-black/25 p-1 xl:hidden">
                      <button
                        type="button"
                        onClick={() => setItemEditorSurface("edit")}
                        className={`cursor-pointer rounded-md px-3 py-1 text-sm ${
                          itemEditorSurface === "edit"
                            ? "bg-[var(--color-primary)] text-[var(--text-color-dark)]"
                            : "text-[var(--text-light)]/70"
                        }`}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setItemEditorSurface("preview")}
                        className={`cursor-pointer rounded-md px-3 py-1 text-sm ${
                          itemEditorSurface === "preview"
                            ? "bg-[var(--color-primary)] text-[var(--text-color-dark)]"
                            : "text-[var(--text-light)]/70"
                        }`}
                      >
                        Preview
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => inlineImageInputRef.current?.click()}
                      disabled={uploadingInlineImage || !selectedCollectionSlug}
                      className="cursor-pointer rounded-md border border-[var(--color-secondary)]/40 bg-black/35 px-3 py-2 text-sm disabled:opacity-50"
                    >
                      {uploadingInlineImage ? "Uploading..." : "Insert Photo"}
                    </button>
                  </div>
                </div>

                <input
                  type="file"
                  ref={inlineImageInputRef}
                  onChange={handleInlineImageUpload}
                  accept="image/*"
                  multiple
                  className="hidden"
                />

                <div className="grid min-h-0 flex-1 xl:grid-cols-2">
                  <div
                    className={`min-h-0 border-b border-[var(--color-secondary)]/15 xl:border-b-0 xl:border-r ${
                      itemEditorSurface === "edit" ? "block" : "hidden xl:block"
                    }`}
                  >
                    <div className="border-b border-[var(--color-secondary)]/10 px-4 py-2 text-xs uppercase tracking-[0.16em] text-[var(--color-secondary)]/65">
                      Editor
                    </div>
                    <div className="h-full p-4">
                      <textarea
                        ref={itemTextAreaRef}
                        value={itemForm.markdown}
                        onChange={(event) =>
                          setItemForm((previous) => ({
                            ...previous,
                            markdown: event.target.value,
                          }))
                        }
                        className="h-full min-h-[320px] w-full resize-none rounded-xl border border-[var(--color-secondary)]/30 bg-black/35 px-4 py-3 font-mono text-sm"
                        disabled={!selectedCollectionSlug}
                        placeholder="Optional notes or description for this item..."
                      />
                    </div>
                  </div>

                  <div className={`${itemEditorSurface === "preview" ? "block" : "hidden xl:block"} min-h-0`}>
                    <div className="border-b border-[var(--color-secondary)]/10 px-4 py-2 text-xs uppercase tracking-[0.16em] text-[var(--color-secondary)]/65">
                      Preview
                    </div>
                    <div className="h-full min-h-[320px] overflow-y-auto px-4 py-4 leading-7">
                      {itemForm.markdown.trim() ? (
                        <MarkdownRenderer content={itemForm.markdown} />
                      ) : (
                        <p className="text-[var(--text-light)]/50">Preview updates as you write.</p>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
