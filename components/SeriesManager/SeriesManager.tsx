"use client";

import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/lib/auth";
import MarkdownRenderer from "@/components/MarkdownRenderer/MarkdownRenderer";

type AdminSeriesMetadata = {
  slug: string;
  name: string;
  description: string;
  date: string;
  image: string;
  individualPages: boolean;
};

type AdminSeriesPost = {
  seriesSlug: string;
  slug: string;
  title: string;
  markdown: string;
  image: string;
  author: string;
  date: string;
};

type AdminSeries = {
  metadata: AdminSeriesMetadata;
  posts: AdminSeriesPost[];
};

const emptySeriesForm: AdminSeriesMetadata = {
  slug: "",
  name: "",
  description: "",
  date: new Date().toISOString().split("T")[0],
  image: "",
  individualPages: false,
};

const emptySeriesPostForm: AdminSeriesPost = {
  seriesSlug: "",
  slug: "",
  title: "",
  markdown: "",
  image: "",
  author: "",
  date: new Date().toISOString().split("T")[0],
};

export default function SeriesManager() {
  const { user } = useAuthStore();
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [seriesList, setSeriesList] = useState<AdminSeries[]>([]);
  const [loadingSeries, setLoadingSeries] = useState(true);
  const [seriesError, setSeriesError] = useState<string | null>(null);
  const [seriesSuccess, setSeriesSuccess] = useState<string | null>(null);
  const [selectedSeriesSlug, setSelectedSeriesSlug] = useState<string | null>(
    null,
  );
  const [seriesForm, setSeriesForm] =
    useState<AdminSeriesMetadata>(emptySeriesForm);
  const [seriesSubmitting, setSeriesSubmitting] = useState(false);
  const [seriesDeleting, setSeriesDeleting] = useState(false);
  const [entryForm, setEntryForm] =
    useState<AdminSeriesPost>(emptySeriesPostForm);
  const [entrySubmitting, setEntrySubmitting] = useState(false);
  const [entryDeleting, setEntryDeleting] = useState(false);
  const [entryPreview, setEntryPreview] = useState(false);
  const [selectedEntrySlug, setSelectedEntrySlug] = useState<string | null>(
    null,
  );
  const [uploadingSeriesImage, setUploadingSeriesImage] = useState(false);
  const [uploadingEntryImage, setUploadingEntryImage] = useState(false);
  const [uploadingInlineImage, setUploadingInlineImage] = useState(false);
  const seriesCoverInputRef = useRef<HTMLInputElement>(null);
  const entryCoverInputRef = useRef<HTMLInputElement>(null);
  const inlineImageInputRef = useRef<HTMLInputElement>(null);
  const entryTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const isLocalBypassEnabled =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1") &&
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
        } catch (error) {
          console.error("Failed to get token:", error);
        }
      }
    };

    getToken();
  }, [user]);

  const loadSeries = async (preferredSlug?: string | null) => {
    setLoadingSeries(true);
    setSeriesError(null);

    try {
      const response = await fetch("/api/series");
      if (!response.ok) {
        throw new Error("Failed to load series");
      }

      const data = (await response.json()) as AdminSeries[];
      const sortedSeries = data.sort(
        (a, b) => Date.parse(b.metadata.date) - Date.parse(a.metadata.date),
      );

      setSeriesList(sortedSeries);

      const nextSlug = preferredSlug ?? selectedSeriesSlug;
      if (!nextSlug) {
        return;
      }

      const matchedSeries = sortedSeries.find(
        (series) => series.metadata.slug === nextSlug,
      );
      if (matchedSeries) {
        selectSeries(matchedSeries);
      } else {
        startNewSeries();
      }
    } catch (error) {
      setSeriesError(
        error instanceof Error ? error.message : "Failed to load series",
      );
    } finally {
      setLoadingSeries(false);
    }
  };

  useEffect(() => {
    loadSeries();
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
      throw new Error(
        "Authentication token not available. Please refresh the page.",
      );
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

  const selectSeries = (series: AdminSeries) => {
    setSelectedSeriesSlug(series.metadata.slug);
    setSeriesForm(series.metadata);
    setSelectedEntrySlug(null);
    setEntryForm({
      ...emptySeriesPostForm,
      seriesSlug: series.metadata.slug,
      author: user?.user_metadata?.full_name || user?.email || "Guest",
    });
    setEntryPreview(false);
    setSeriesError(null);
    setSeriesSuccess(null);
  };

  const startNewSeries = () => {
    setSelectedSeriesSlug(null);
    setSeriesForm(emptySeriesForm);
    setSelectedEntrySlug(null);
    setEntryForm({
      ...emptySeriesPostForm,
      author: user?.user_metadata?.full_name || user?.email || "Guest",
    });
    setEntryPreview(false);
    setSeriesError(null);
    setSeriesSuccess(null);
  };

  const startNewEntry = () => {
    if (!selectedSeriesSlug && !seriesForm.slug) {
      setSeriesError("Save the series before adding posts to it.");
      return;
    }

    setSelectedEntrySlug(null);
    setEntryForm({
      ...emptySeriesPostForm,
      seriesSlug: selectedSeriesSlug || seriesForm.slug,
      author: user?.user_metadata?.full_name || user?.email || "Guest",
    });
    setEntryPreview(false);
    setSeriesError(null);
    setSeriesSuccess(null);
  };

  const selectEntry = (post: AdminSeriesPost) => {
    setSelectedEntrySlug(post.slug);
    setEntryForm(post);
    setEntryPreview(false);
    setSeriesError(null);
    setSeriesSuccess(null);
  };

  const insertInlineImage = (insertion: string) => {
    const textarea = entryTextAreaRef.current;

    if (!textarea) {
      setEntryForm((prev) => ({
        ...prev,
        markdown: `${prev.markdown}${insertion}`,
      }));
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nextMarkdown =
      entryForm.markdown.slice(0, start) +
      insertion +
      entryForm.markdown.slice(end);

    setEntryForm((prev) => ({ ...prev, markdown: nextMarkdown }));

    requestAnimationFrame(() => {
      textarea.focus();
      const nextCaret = start + insertion.length;
      textarea.setSelectionRange(nextCaret, nextCaret);
    });
  };

  const handleSeriesImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingSeriesImage(true);
    setSeriesError(null);

    try {
      const url = await uploadImageFile(file);
      setSeriesForm((prev) => ({ ...prev, image: url }));
    } catch (error) {
      setSeriesError(
        error instanceof Error ? error.message : "Failed to upload image",
      );
    } finally {
      setUploadingSeriesImage(false);
      if (seriesCoverInputRef.current) seriesCoverInputRef.current.value = "";
    }
  };

  const handleEntryImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingEntryImage(true);
    setSeriesError(null);

    try {
      const url = await uploadImageFile(file);
      setEntryForm((prev) => ({ ...prev, image: url }));
    } catch (error) {
      setSeriesError(
        error instanceof Error ? error.message : "Failed to upload image",
      );
    } finally {
      setUploadingEntryImage(false);
      if (entryCoverInputRef.current) entryCoverInputRef.current.value = "";
    }
  };

  const handleInlineImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    setUploadingInlineImage(true);
    setSeriesError(null);

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
    } catch (error) {
      setSeriesError(
        error instanceof Error ? error.message : "Failed to upload image",
      );
    } finally {
      setUploadingInlineImage(false);
      if (inlineImageInputRef.current) inlineImageInputRef.current.value = "";
    }
  };

  const currentSeries = selectedSeriesSlug
    ? (seriesList.find(
        (series) => series.metadata.slug === selectedSeriesSlug,
      ) ?? null)
    : null;

  const handleSeriesSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!authToken && !isLocalBypassEnabled) {
      setSeriesError(
        "Authentication token not available. Please refresh the page.",
      );
      return;
    }

    setSeriesSubmitting(true);
    setSeriesError(null);
    setSeriesSuccess(null);

    try {
      if (
        !seriesForm.name ||
        !seriesForm.slug ||
        !seriesForm.description ||
        !seriesForm.date
      ) {
        throw new Error("Please fill in all required series fields");
      }

      const response = await fetch("/api/series", {
        method: selectedSeriesSlug ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          ...seriesForm,
          originalSlug: selectedSeriesSlug,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save series");
      }

      const payload = await response.json();
      const savedSlug = payload.data.slug as string;
      setSeriesSuccess(
        selectedSeriesSlug
          ? "Series updated successfully."
          : "Series created successfully.",
      );
      setSelectedSeriesSlug(savedSlug);
      await loadSeries(savedSlug);
    } catch (error) {
      setSeriesError(
        error instanceof Error ? error.message : "Failed to save series",
      );
    } finally {
      setSeriesSubmitting(false);
    }
  };

  const handleSeriesDelete = async () => {
    if (!selectedSeriesSlug) {
      setSeriesError("Select a series to delete.");
      return;
    }

    if (!authToken && !isLocalBypassEnabled) {
      setSeriesError(
        "Authentication token not available. Please refresh the page.",
      );
      return;
    }

    const confirmed = window.confirm(
      `Delete series "${seriesForm.name}" and all its posts? This cannot be undone.`,
    );
    if (!confirmed) {
      return;
    }

    setSeriesDeleting(true);
    setSeriesError(null);
    setSeriesSuccess(null);

    try {
      const response = await fetch(
        `/api/series?slug=${encodeURIComponent(selectedSeriesSlug)}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete series");
      }

      startNewSeries();
      await loadSeries(null);
      setSeriesSuccess("Series deleted successfully.");
    } catch (error) {
      setSeriesError(
        error instanceof Error ? error.message : "Failed to delete series",
      );
    } finally {
      setSeriesDeleting(false);
    }
  };

  const handleEntrySubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const seriesSlug = selectedSeriesSlug || seriesForm.slug;
    if (!seriesSlug) {
      setSeriesError("Save the series before adding posts to it.");
      return;
    }

    if (!authToken && !isLocalBypassEnabled) {
      setSeriesError(
        "Authentication token not available. Please refresh the page.",
      );
      return;
    }

    setEntrySubmitting(true);
    setSeriesError(null);
    setSeriesSuccess(null);

    try {
      if (
        !entryForm.title ||
        !entryForm.slug ||
        !entryForm.markdown ||
        !entryForm.date
      ) {
        throw new Error("Please fill in all required series post fields");
      }

      const response = await fetch(
        `/api/series/${encodeURIComponent(seriesSlug)}/posts`,
        {
          method: selectedEntrySlug ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            ...entryForm,
            seriesSlug,
            originalSlug: selectedEntrySlug,
            author:
              entryForm.author ||
              user?.user_metadata?.full_name ||
              user?.email ||
              "Guest",
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save series post");
      }

      const payload = await response.json();
      const savedPost = payload.data as AdminSeriesPost;
      setSeriesSuccess(
        selectedEntrySlug
          ? "Series post updated successfully."
          : "Series post created successfully.",
      );
      await loadSeries(seriesSlug);
      setSelectedEntrySlug(savedPost.slug);
      setEntryForm(savedPost);
    } catch (error) {
      setSeriesError(
        error instanceof Error ? error.message : "Failed to save series post",
      );
    } finally {
      setEntrySubmitting(false);
    }
  };

  const handleEntryDelete = async () => {
    const seriesSlug = selectedSeriesSlug || seriesForm.slug;
    if (!seriesSlug || !selectedEntrySlug) {
      setSeriesError("Select a series post to delete.");
      return;
    }

    if (!authToken && !isLocalBypassEnabled) {
      setSeriesError(
        "Authentication token not available. Please refresh the page.",
      );
      return;
    }

    const confirmed = window.confirm(
      `Delete series post "${entryForm.title}"? This cannot be undone.`,
    );
    if (!confirmed) {
      return;
    }

    setEntryDeleting(true);
    setSeriesError(null);
    setSeriesSuccess(null);

    try {
      const response = await fetch(
        `/api/series/${encodeURIComponent(seriesSlug)}/posts?slug=${encodeURIComponent(selectedEntrySlug)}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete series post");
      }

      await loadSeries(seriesSlug);
      startNewEntry();
      setSeriesSuccess("Series post deleted successfully.");
    } catch (error) {
      setSeriesError(
        error instanceof Error ? error.message : "Failed to delete series post",
      );
    } finally {
      setEntryDeleting(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)] text-[var(--text-light)]">
      <aside className="rounded-xl border border-[var(--color-secondary)]/35 bg-black/25 p-4">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-semibold text-[var(--color-primary)]">
              Series
            </h2>
            <p className="text-sm text-[var(--text-light)]/60">
              Dynamic series only
            </p>
          </div>
          <button
            type="button"
            onClick={startNewSeries}
            className="px-3 py-2 bg-[var(--color-primary)] text-[var(--text-color-dark)] rounded-md font-semibold cursor-pointer"
          >
            New Series
          </button>
        </div>

        {loadingSeries ? (
          <div className="rounded-md border border-[var(--color-secondary)]/20 bg-black/20 px-4 py-6 text-[var(--text-light)]/70">
            Loading series...
          </div>
        ) : seriesList.length === 0 ? (
          <div className="rounded-md border border-[var(--color-secondary)]/20 bg-black/20 px-4 py-6 text-[var(--text-light)]/70">
            No dynamic series yet.
          </div>
        ) : (
          <div className="grid gap-3">
            {seriesList.map((series) => {
              const isActive = series.metadata.slug === selectedSeriesSlug;
              return (
                <button
                  key={series.metadata.slug}
                  type="button"
                  onClick={() => selectSeries(series)}
                  className={`rounded-lg border px-4 py-3 text-left transition ${
                    isActive
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                      : "border-[var(--color-secondary)]/20 bg-black/20 hover:bg-black/35"
                  }`}
                >
                  <p className="font-semibold text-[var(--color-primary)]">
                    {series.metadata.name}
                  </p>
                  <p className="text-sm text-[var(--text-light)]/60">
                    /{series.metadata.slug}
                  </p>
                  <p className="text-sm text-[var(--text-light)]/60">
                    {series.posts.length} posts
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </aside>

      <div className="grid gap-6">
        {(seriesError || seriesSuccess) && (
          <div
            className={`rounded-md border px-4 py-3 ${
              seriesError
                ? "border-red-400/35 bg-red-500/10 text-red-200"
                : "border-[var(--color-primary)]/35 bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
            }`}
          >
            {seriesError || seriesSuccess}
          </div>
        )}

        <form
          onSubmit={handleSeriesSubmit}
          className="rounded-xl border border-[var(--color-secondary)]/35 bg-black/25 p-5 space-y-5"
        >
          <div>
            <h3 className="text-xl font-semibold text-[var(--color-primary)]">
              {selectedSeriesSlug ? "Edit Series" : "Create Series"}
            </h3>
            <p className="text-sm text-[var(--text-light)]/60 mt-1">
              Series can render as one long page or as individual post pages.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--color-secondary)]">
                Series Name
              </label>
              <input
                type="text"
                value={seriesForm.name}
                onChange={(event) => {
                  const name = event.target.value;
                  setSeriesForm((prev) => ({
                    ...prev,
                    name,
                    slug:
                      !selectedSeriesSlug ||
                      prev.slug === generateSlug(prev.name)
                        ? generateSlug(name)
                        : prev.slug,
                  }));
                }}
                className="w-full px-4 py-2 border border-[var(--color-secondary)]/40 bg-black/35 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--color-secondary)]">
                Slug
              </label>
              <input
                type="text"
                value={seriesForm.slug}
                onChange={(event) =>
                  setSeriesForm((prev) => ({
                    ...prev,
                    slug: event.target.value,
                  }))
                }
                className="w-full px-4 py-2 border border-[var(--color-secondary)]/40 bg-black/35 rounded-lg"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2 text-[var(--color-secondary)]">
                Description
              </label>
              <textarea
                value={seriesForm.description}
                onChange={(event) =>
                  setSeriesForm((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                className="w-full min-h-28 px-4 py-2 border border-[var(--color-secondary)]/40 bg-black/35 rounded-lg resize-y"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--color-secondary)]">
                Start Date
              </label>
              <input
                type="date"
                value={seriesForm.date}
                onChange={(event) =>
                  setSeriesForm((prev) => ({
                    ...prev,
                    date: event.target.value,
                  }))
                }
                className="w-full px-4 py-2 border border-[var(--color-secondary)]/40 bg-black/35 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--color-secondary)]">
                Series Layout
              </label>
              <label className="flex items-center gap-3 px-4 py-3 border border-[var(--color-secondary)]/40 bg-black/35 rounded-lg">
                <input
                  type="checkbox"
                  checked={seriesForm.individualPages}
                  onChange={(event) =>
                    setSeriesForm((prev) => ({
                      ...prev,
                      individualPages: event.target.checked,
                    }))
                  }
                />
                <span>Use individual pages for each series post</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--color-secondary)]">
              Series Cover Image
            </label>
            <input
              type="file"
              ref={seriesCoverInputRef}
              onChange={handleSeriesImageUpload}
              accept="image/*"
              disabled={uploadingSeriesImage}
              className="w-full px-4 py-2 border border-[var(--color-secondary)]/40 bg-black/35 rounded-lg cursor-pointer"
            />
            <p className="text-sm text-[var(--text-light)]/60 mt-2">
              {uploadingSeriesImage
                ? "Uploading series image..."
                : "Upload a thumbnail or banner image for the series."}
            </p>
            {seriesForm.image && (
              <img
                src={seriesForm.image}
                alt="Series cover preview"
                className="mt-4 max-h-48 rounded border border-[var(--color-secondary)]/40"
              />
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={seriesSubmitting}
              className="px-5 py-2 bg-[var(--color-primary)] text-[var(--text-color-dark)] font-semibold rounded-md cursor-pointer disabled:opacity-60"
            >
              {seriesSubmitting
                ? "Saving..."
                : selectedSeriesSlug
                  ? "Save Series"
                  : "Create Series"}
            </button>
            <button
              type="button"
              onClick={() => {
                if (currentSeries) {
                  selectSeries(currentSeries);
                } else {
                  startNewSeries();
                }
              }}
              className="px-5 py-2 border border-[var(--color-secondary)]/40 bg-black/35 rounded-md cursor-pointer"
            >
              {selectedSeriesSlug ? "Reset" : "Clear"}
            </button>
            {selectedSeriesSlug && (
              <button
                type="button"
                onClick={handleSeriesDelete}
                disabled={seriesDeleting}
                className="px-5 py-2 border border-red-400/50 bg-red-500/15 text-red-200 rounded-md cursor-pointer disabled:opacity-60"
              >
                {seriesDeleting ? "Deleting..." : "Delete Series"}
              </button>
            )}
          </div>
        </form>

        <div className="rounded-xl border border-[var(--color-secondary)]/35 bg-black/25 p-5 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-[var(--color-primary)]">
                Series Posts
              </h3>
              <p className="text-sm text-[var(--text-light)]/60">
                {selectedSeriesSlug
                  ? `Managing posts in /${selectedSeriesSlug}`
                  : "Save a series before adding posts."}
              </p>
            </div>
            <button
              type="button"
              onClick={startNewEntry}
              disabled={!selectedSeriesSlug && !seriesForm.slug}
              className="px-4 py-2 bg-[var(--color-primary)] text-[var(--text-color-dark)] font-semibold rounded-md cursor-pointer disabled:opacity-50"
            >
              New Series Post
            </button>
          </div>

          {currentSeries && currentSeries.posts.length > 0 ? (
            <div className="grid gap-3">
              {currentSeries.posts
                .slice()
                .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
                .map((post) => {
                  const isActive = post.slug === selectedEntrySlug;
                  return (
                    <button
                      key={post.slug}
                      type="button"
                      onClick={() => selectEntry(post)}
                      className={`rounded-lg border px-4 py-3 text-left transition ${
                        isActive
                          ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                          : "border-[var(--color-secondary)]/20 bg-black/20 hover:bg-black/35"
                      }`}
                    >
                      <p className="font-semibold text-[var(--color-primary)]">
                        {post.title}
                      </p>
                      <p className="text-sm text-[var(--text-light)]/60">
                        /{post.slug}
                      </p>
                      <p className="text-sm text-[var(--text-light)]/60">
                        {post.date}
                      </p>
                    </button>
                  );
                })}
            </div>
          ) : (
            <div className="rounded-md border border-[var(--color-secondary)]/20 bg-black/20 px-4 py-6 text-[var(--text-light)]/70">
              {selectedSeriesSlug
                ? "No posts in this series yet."
                : "Create a series first to start adding posts."}
            </div>
          )}

          <form
            onSubmit={handleEntrySubmit}
            className="grid gap-5 border-t border-[var(--color-secondary)]/20 pt-5"
          >
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-lg font-semibold text-[var(--color-secondary)]">
                {selectedEntrySlug ? "Edit Series Post" : "Create Series Post"}
              </h4>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => inlineImageInputRef.current?.click()}
                  disabled={uploadingInlineImage || !selectedSeriesSlug}
                  className="px-3 py-1 border border-[var(--color-secondary)]/40 bg-black/35 rounded cursor-pointer disabled:opacity-50"
                >
                  {uploadingInlineImage ? "Uploading..." : "Insert Photo"}
                </button>
                <button
                  type="button"
                  onClick={() => setEntryPreview((prev) => !prev)}
                  className="px-3 py-1 bg-[var(--color-primary)] text-[var(--text-color-dark)] rounded font-medium cursor-pointer"
                >
                  {entryPreview ? "Edit" : "Preview"}
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

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-2 text-[var(--color-secondary)]">
                  Title
                </label>
                <input
                  type="text"
                  value={entryForm.title}
                  onChange={(event) => {
                    const title = event.target.value;
                    setEntryForm((prev) => ({
                      ...prev,
                      title,
                      slug:
                        !selectedEntrySlug ||
                        prev.slug === generateSlug(prev.title)
                          ? generateSlug(title)
                          : prev.slug,
                    }));
                  }}
                  className="w-full px-4 py-2 border border-[var(--color-secondary)]/40 bg-black/35 rounded-lg"
                  required
                  disabled={!selectedSeriesSlug}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-[var(--color-secondary)]">
                  Slug
                </label>
                <input
                  type="text"
                  value={entryForm.slug}
                  onChange={(event) =>
                    setEntryForm((prev) => ({
                      ...prev,
                      slug: event.target.value,
                    }))
                  }
                  className="w-full px-4 py-2 border border-[var(--color-secondary)]/40 bg-black/35 rounded-lg"
                  required
                  disabled={!selectedSeriesSlug}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-[var(--color-secondary)]">
                  Date
                </label>
                <input
                  type="date"
                  value={entryForm.date}
                  onChange={(event) =>
                    setEntryForm((prev) => ({
                      ...prev,
                      date: event.target.value,
                    }))
                  }
                  className="w-full px-4 py-2 border border-[var(--color-secondary)]/40 bg-black/35 rounded-lg"
                  required
                  disabled={!selectedSeriesSlug}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-[var(--color-secondary)]">
                  Author
                </label>
                <input
                  type="text"
                  value={entryForm.author}
                  onChange={(event) =>
                    setEntryForm((prev) => ({
                      ...prev,
                      author: event.target.value,
                    }))
                  }
                  className="w-full px-4 py-2 border border-[var(--color-secondary)]/40 bg-black/35 rounded-lg"
                  disabled={!selectedSeriesSlug}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--color-secondary)]">
                Cover Image
              </label>
              <input
                type="file"
                ref={entryCoverInputRef}
                onChange={handleEntryImageUpload}
                accept="image/*"
                disabled={uploadingEntryImage || !selectedSeriesSlug}
                className="w-full px-4 py-2 border border-[var(--color-secondary)]/40 bg-black/35 rounded-lg cursor-pointer"
              />
              <p className="text-sm text-[var(--text-light)]/60 mt-2">
                {uploadingEntryImage
                  ? "Uploading cover image..."
                  : "Optional cover image for individual post pages."}
              </p>
              {entryForm.image && (
                <img
                  src={entryForm.image}
                  alt="Series post cover preview"
                  className="mt-4 max-h-48 rounded border border-[var(--color-secondary)]/40"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--color-secondary)]">
                Markdown Content
              </label>
              {!entryPreview ? (
                <textarea
                  ref={entryTextAreaRef}
                  value={entryForm.markdown}
                  onChange={(event) =>
                    setEntryForm((prev) => ({
                      ...prev,
                      markdown: event.target.value,
                    }))
                  }
                  className="w-full min-h-80 px-4 py-2 border border-[var(--color-secondary)]/40 bg-black/35 rounded-lg font-mono text-sm resize-y"
                  required
                  disabled={!selectedSeriesSlug}
                />
              ) : (
                <div className="min-h-80 px-4 py-3 border border-[var(--color-secondary)]/40 bg-black/40 rounded-lg overflow-auto leading-7">
                  <MarkdownRenderer content={entryForm.markdown} />
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={entrySubmitting || !selectedSeriesSlug}
                className="px-5 py-2 bg-[var(--color-primary)] text-[var(--text-color-dark)] font-semibold rounded-md cursor-pointer disabled:opacity-50"
              >
                {entrySubmitting
                  ? "Saving..."
                  : selectedEntrySlug
                    ? "Save Series Post"
                    : "Create Series Post"}
              </button>
              <button
                type="button"
                onClick={() => {
                  const matchedPost = currentSeries?.posts.find(
                    (post) => post.slug === selectedEntrySlug,
                  );
                  if (matchedPost) {
                    selectEntry(matchedPost);
                  } else {
                    startNewEntry();
                  }
                }}
                className="px-5 py-2 border border-[var(--color-secondary)]/40 bg-black/35 rounded-md cursor-pointer"
              >
                {selectedEntrySlug ? "Reset" : "Clear"}
              </button>
              {selectedEntrySlug && (
                <button
                  type="button"
                  onClick={handleEntryDelete}
                  disabled={entryDeleting}
                  className="px-5 py-2 border border-red-400/50 bg-red-500/15 text-red-200 rounded-md cursor-pointer disabled:opacity-60"
                >
                  {entryDeleting ? "Deleting..." : "Delete Series Post"}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
