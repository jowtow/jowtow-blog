"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

type SeriesMobilePanel = "series" | "details" | "posts";
type SeriesPostsMobileView = "list" | "editor";

type LoadSeriesOptions = {
  preferredSlug?: string | null;
  preferredEntrySlug?: string | null;
  autoSelectFirst?: boolean;
  preferredMobilePanel?: SeriesMobilePanel;
  preferredPostsView?: SeriesPostsMobileView;
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

const createEmptySeriesPostForm = (seriesSlug = "", author = ""): AdminSeriesPost => ({
  ...emptySeriesPostForm,
  seriesSlug,
  author,
});

export default function SeriesManager() {
  const { user } = useAuthStore();
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [seriesList, setSeriesList] = useState<AdminSeries[]>([]);
  const [loadingSeries, setLoadingSeries] = useState(true);
  const [seriesError, setSeriesError] = useState<string | null>(null);
  const [seriesSuccess, setSeriesSuccess] = useState<string | null>(null);
  const [selectedSeriesSlug, setSelectedSeriesSlug] = useState<string | null>(null);
  const [seriesForm, setSeriesForm] = useState<AdminSeriesMetadata>(emptySeriesForm);
  const [seriesSubmitting, setSeriesSubmitting] = useState(false);
  const [seriesDeleting, setSeriesDeleting] = useState(false);
  const [entryForm, setEntryForm] = useState<AdminSeriesPost>(emptySeriesPostForm);
  const [entrySubmitting, setEntrySubmitting] = useState(false);
  const [entryDeleting, setEntryDeleting] = useState(false);
  const [entryPreview, setEntryPreview] = useState(false);
  const [selectedEntrySlug, setSelectedEntrySlug] = useState<string | null>(null);
  const [uploadingSeriesImage, setUploadingSeriesImage] = useState(false);
  const [uploadingEntryImage, setUploadingEntryImage] = useState(false);
  const [uploadingInlineImage, setUploadingInlineImage] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<SeriesMobilePanel>("series");
  const [mobilePostsView, setMobilePostsView] = useState<SeriesPostsMobileView>("list");
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
        } catch (tokenError) {
          console.error("Failed to get token:", tokenError);
        }
      }
    };

    getToken();
  }, [user]);

  const generateSlug = (value: string) =>
    value
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

  const selectSeries = (series: AdminSeries) => {
    setSelectedSeriesSlug(series.metadata.slug);
    setSeriesForm(series.metadata);
    setSelectedEntrySlug(null);
    setEntryForm(
      createEmptySeriesPostForm(
        series.metadata.slug,
        user?.user_metadata?.full_name || user?.email || "Guest",
      ),
    );
    setEntryPreview(false);
    setSeriesError(null);
    setSeriesSuccess(null);
    setMobilePanel("details");
    setMobilePostsView("list");
  };

  const startNewSeries = () => {
    setSelectedSeriesSlug(null);
    setSeriesForm(emptySeriesForm);
    setSelectedEntrySlug(null);
    setEntryForm(
      createEmptySeriesPostForm(
        "",
        user?.user_metadata?.full_name || user?.email || "Guest",
      ),
    );
    setEntryPreview(false);
    setSeriesError(null);
    setSeriesSuccess(null);
    setMobilePanel("details");
    setMobilePostsView("editor");
  };

  const startNewEntry = () => {
    if (!selectedSeriesSlug && !seriesForm.slug) {
      setSeriesError("Save the series before adding posts to it.");
      return;
    }

    setSelectedEntrySlug(null);
    setEntryForm(
      createEmptySeriesPostForm(
        selectedSeriesSlug || seriesForm.slug,
        user?.user_metadata?.full_name || user?.email || "Guest",
      ),
    );
    setEntryPreview(false);
    setSeriesError(null);
    setSeriesSuccess(null);
    setMobilePanel("posts");
    setMobilePostsView("editor");
  };

  const selectEntry = (post: AdminSeriesPost) => {
    setSelectedEntrySlug(post.slug);
    setEntryForm(post);
    setEntryPreview(false);
    setSeriesError(null);
    setSeriesSuccess(null);
    setMobilePanel("posts");
    setMobilePostsView("editor");
  };

  const loadSeries = async ({
    preferredSlug,
    preferredEntrySlug,
    autoSelectFirst = false,
    preferredMobilePanel,
    preferredPostsView,
  }: LoadSeriesOptions = {}) => {
    setLoadingSeries(true);
    setSeriesError(null);

    try {
      const response = await fetch("/api/series", { cache: 'no-store' });
      if (!response.ok) {
        throw new Error("Failed to load series");
      }

      const data = (await response.json()) as AdminSeries[];
      const sortedSeries = data.sort(
        (a, b) => Date.parse(b.metadata.date) - Date.parse(a.metadata.date),
      );

      setSeriesList(sortedSeries);

      if (sortedSeries.length === 0) {
        startNewSeries();
        return {
          series: sortedSeries,
          selectedSeries: null,
          selectedEntry: null,
        };
      }

      const nextSlug =
        preferredSlug ??
        (autoSelectFirst ? sortedSeries[0]?.metadata.slug : selectedSeriesSlug);
      if (!nextSlug) {
        return {
          series: sortedSeries,
          selectedSeries: null,
          selectedEntry: null,
        };
      }

      const matchedSeries =
        sortedSeries.find((series) => series.metadata.slug === nextSlug) ??
        (autoSelectFirst ? sortedSeries[0] : null);
      if (!matchedSeries) {
        startNewSeries();
        return {
          series: sortedSeries,
          selectedSeries: null,
          selectedEntry: null,
        };
      }

      selectSeries(matchedSeries);

      const nextEntrySlug =
        preferredEntrySlug ??
        (nextSlug === selectedSeriesSlug ? selectedEntrySlug : null);
      const matchedEntry =
        nextEntrySlug
          ? matchedSeries.posts.find((post) => post.slug === nextEntrySlug) ?? null
          : null;

      if (matchedEntry) {
        setSelectedEntrySlug(matchedEntry.slug);
        setEntryForm(matchedEntry);
        setMobilePanel(preferredMobilePanel ?? "posts");
        setMobilePostsView(preferredPostsView ?? "editor");
      }

      return {
        series: sortedSeries,
        selectedSeries: matchedSeries,
        selectedEntry: matchedEntry,
      };
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : "Failed to load series";
      setSeriesError(message);
      throw new Error(message);
    } finally {
      setLoadingSeries(false);
    }
  };

  useEffect(() => {
    void loadSeries().catch(() => undefined);
  }, []);

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

  const insertInlineImage = (insertion: string) => {
    const textarea = entryTextAreaRef.current;

    if (!textarea) {
      setEntryForm((previous) => ({
        ...previous,
        markdown: `${previous.markdown}${insertion}`,
      }));
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nextMarkdown =
      entryForm.markdown.slice(0, start) +
      insertion +
      entryForm.markdown.slice(end);

    setEntryForm((previous) => ({ ...previous, markdown: nextMarkdown }));

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
      setSeriesForm((previous) => ({ ...previous, image: url }));
    } catch (uploadError) {
      setSeriesError(
        uploadError instanceof Error
          ? uploadError.message
          : "Failed to upload image",
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
      setEntryForm((previous) => ({ ...previous, image: url }));
    } catch (uploadError) {
      setSeriesError(
        uploadError instanceof Error
          ? uploadError.message
          : "Failed to upload image",
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
    } catch (uploadError) {
      setSeriesError(
        uploadError instanceof Error
          ? uploadError.message
          : "Failed to upload image",
      );
    } finally {
      setUploadingInlineImage(false);
      if (inlineImageInputRef.current) inlineImageInputRef.current.value = "";
    }
  };

  const currentSeries = useMemo(
    () =>
      selectedSeriesSlug
        ? (seriesList.find(
            (series) => series.metadata.slug === selectedSeriesSlug,
          ) ?? null)
        : null,
    [selectedSeriesSlug, seriesList],
  );

  const sortedPosts = useMemo(() => {
    if (!currentSeries) {
      return [];
    }

    return currentSeries.posts
      .slice()
      .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  }, [currentSeries]);

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
      const isEditingSeries = Boolean(selectedSeriesSlug);
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
      await loadSeries({ preferredSlug: savedSlug });
      setSeriesSuccess(
        isEditingSeries
          ? "Series updated successfully."
          : "Series created successfully.",
      );
      setMobilePanel("details");
    } catch (submitError) {
      setSeriesError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to save series",
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

      await loadSeries({ autoSelectFirst: true });
      setSeriesSuccess("Series deleted successfully.");
      setMobilePanel("series");
    } catch (deleteError) {
      setSeriesError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete series",
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
      const isEditingEntry = Boolean(selectedEntrySlug);
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
      await loadSeries({
        preferredSlug: seriesSlug,
        preferredEntrySlug: savedPost.slug,
        preferredMobilePanel: "posts",
        preferredPostsView: "editor",
      });
      setSeriesSuccess(
        isEditingEntry
          ? "Series post updated successfully."
          : "Series post created successfully.",
      );
      setMobilePanel("posts");
      setMobilePostsView("editor");
    } catch (submitError) {
      setSeriesError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to save series post",
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

      await loadSeries({ preferredSlug: seriesSlug, preferredMobilePanel: "posts" });
      setSelectedEntrySlug(null);
      setEntryForm(
        createEmptySeriesPostForm(
          seriesSlug,
          user?.user_metadata?.full_name || user?.email || "Guest",
        ),
      );
      setMobilePanel("posts");
      setMobilePostsView("editor");
      setSeriesSuccess("Series post deleted successfully.");
    } catch (deleteError) {
      setSeriesError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete series post",
      );
    } finally {
      setEntryDeleting(false);
    }
  };

  const resetEntryForm = () => {
    const matchedPost = currentSeries?.posts.find(
      (post) => post.slug === selectedEntrySlug,
    );
    if (matchedPost) {
      selectEntry(matchedPost);
      return;
    }

    startNewEntry();
  };

  return (
    <div className="space-y-4 text-[var(--text-light)]">
      <div className="rounded-2xl border border-[var(--color-secondary)]/25 bg-black/20 p-3 lg:hidden">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-secondary)]/70">
              Series workspace
            </p>
            <p className="text-sm text-[var(--text-light)]/60">
              Jump between browsing, editing metadata, and post drafting.
            </p>
          </div>
          <span className="rounded-full border border-[var(--color-secondary)]/25 px-2.5 py-1 text-xs text-[var(--text-light)]/70">
            {seriesList.length} total
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["series", "Series"],
              ["details", "Details"],
              ["posts", "Posts"],
            ] as Array<[SeriesMobilePanel, string]>
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

      <div className="grid gap-4 text-[var(--text-light)] lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside
          className={`${mobilePanel === "series" ? "block" : "hidden"} rounded-2xl border border-[var(--color-secondary)]/35 bg-black/25 p-4 lg:block`}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-[var(--color-primary)]">
                Series
              </h2>
              <p className="mt-1 text-sm text-[var(--text-light)]/60">
                Dynamic series only.
              </p>
            </div>
            <button
              type="button"
              onClick={startNewSeries}
              className="cursor-pointer rounded-xl bg-[var(--color-primary)] px-4 py-2.5 font-semibold text-[var(--text-color-dark)]"
            >
              New
            </button>
          </div>

          <div className="mb-4 rounded-2xl border border-[var(--color-secondary)]/20 bg-black/20 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-secondary)]/70">
              Library
            </p>
            <p className="mt-2 text-3xl font-semibold text-[var(--color-primary)]">
              {seriesList.length}
            </p>
            <p className="text-sm text-[var(--text-light)]/55">series available</p>
          </div>

          {loadingSeries ? (
            <div className="rounded-xl border border-[var(--color-secondary)]/20 bg-black/20 px-4 py-6 text-[var(--text-light)]/70">
              Loading series...
            </div>
          ) : seriesList.length === 0 ? (
            <div className="rounded-xl border border-[var(--color-secondary)]/20 bg-black/20 px-4 py-6 text-[var(--text-light)]/70">
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
                    className={`rounded-xl border px-4 py-3 text-left transition ${
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
                    <div className="mt-2 flex items-center justify-between gap-3 text-sm text-[var(--text-light)]/60">
                      <span>{series.posts.length} posts</span>
                      <span>{series.metadata.date}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        <div className="grid gap-4">
          {(seriesError || seriesSuccess) && (
            <div
              className={`rounded-xl border px-4 py-3 ${
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
            className={`${mobilePanel === "details" ? "block" : "hidden"} space-y-5 rounded-2xl border border-[var(--color-secondary)]/35 bg-black/25 p-4 md:p-5 lg:block`}
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="text-xl font-semibold text-[var(--color-primary)]">
                  {selectedSeriesSlug ? "Edit Series" : "Create Series"}
                </h3>
                <p className="mt-1 max-w-2xl text-sm text-[var(--text-light)]/60">
                  Series can render as one long page or as individual post pages.
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--color-secondary)]/20 bg-black/20 px-3 py-2 text-right">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-secondary)]/70">
                  Posts
                </p>
                <p className="text-lg font-semibold text-[var(--color-primary)]">
                  {currentSeries?.posts.length ?? 0}
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--color-secondary)]">
                  Series Name
                </label>
                <input
                  type="text"
                  value={seriesForm.name}
                  onChange={(event) => {
                    const name = event.target.value;
                    setSeriesForm((previous) => ({
                      ...previous,
                      name,
                      slug:
                        !selectedSeriesSlug ||
                        previous.slug === generateSlug(previous.name)
                          ? generateSlug(name)
                          : previous.slug,
                    }));
                  }}
                  className="w-full rounded-xl border border-[var(--color-secondary)]/40 bg-black/35 px-4 py-3"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--color-secondary)]">
                  Slug
                </label>
                <input
                  type="text"
                  value={seriesForm.slug}
                  onChange={(event) =>
                    setSeriesForm((previous) => ({
                      ...previous,
                      slug: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-[var(--color-secondary)]/40 bg-black/35 px-4 py-3"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-[var(--color-secondary)]">
                  Description
                </label>
                <textarea
                  value={seriesForm.description}
                  onChange={(event) =>
                    setSeriesForm((previous) => ({
                      ...previous,
                      description: event.target.value,
                    }))
                  }
                  className="min-h-32 w-full resize-y rounded-xl border border-[var(--color-secondary)]/40 bg-black/35 px-4 py-3"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--color-secondary)]">
                  Start Date
                </label>
                <input
                  type="date"
                  value={seriesForm.date}
                  onChange={(event) =>
                    setSeriesForm((previous) => ({
                      ...previous,
                      date: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-[var(--color-secondary)]/40 bg-black/35 px-4 py-3"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--color-secondary)]">
                  Series Layout
                </label>
                <label className="flex min-h-14 items-center gap-3 rounded-xl border border-[var(--color-secondary)]/40 bg-black/35 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={seriesForm.individualPages}
                    onChange={(event) =>
                      setSeriesForm((previous) => ({
                        ...previous,
                        individualPages: event.target.checked,
                      }))
                    }
                  />
                  <span>Use individual pages for each series post</span>
                </label>
              </div>
            </div>

            <section className="rounded-2xl border border-[var(--color-secondary)]/20 bg-black/20 p-4">
              <label className="mb-2 block text-sm font-medium text-[var(--color-secondary)]">
                Series Cover Image
              </label>
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                <div>
                  <input
                    type="file"
                    ref={seriesCoverInputRef}
                    onChange={handleSeriesImageUpload}
                    accept="image/*"
                    disabled={uploadingSeriesImage}
                    className="w-full cursor-pointer rounded-xl border border-[var(--color-secondary)]/40 bg-black/35 px-4 py-3"
                  />
                  <p className="mt-2 text-sm text-[var(--text-light)]/60">
                    {uploadingSeriesImage
                      ? "Uploading series image..."
                      : "Upload a thumbnail or banner image for the series."}
                  </p>
                </div>
                <div className="rounded-2xl border border-[var(--color-secondary)]/20 bg-black/25 p-3">
                  <p className="text-sm font-medium text-[var(--color-secondary)]">
                    Preview
                  </p>
                  {seriesForm.image ? (
                    <img
                      src={seriesForm.image}
                      alt="Series cover preview"
                      className="mt-3 max-h-64 w-full rounded-xl border border-[var(--color-secondary)]/40 object-cover"
                    />
                  ) : (
                    <p className="mt-3 text-sm text-[var(--text-light)]/50">
                      No cover image selected yet.
                    </p>
                  )}
                </div>
              </div>
            </section>

            <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap">
              <button
                type="submit"
                disabled={seriesSubmitting}
                className="cursor-pointer rounded-xl bg-[var(--color-primary)] px-5 py-3 font-semibold text-[var(--text-color-dark)] disabled:opacity-60"
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
                className="cursor-pointer rounded-xl border border-[var(--color-secondary)]/40 bg-black/35 px-5 py-3"
              >
                {selectedSeriesSlug ? "Reset" : "Clear"}
              </button>
              {selectedSeriesSlug && (
                <button
                  type="button"
                  onClick={handleSeriesDelete}
                  disabled={seriesDeleting}
                  className="cursor-pointer rounded-xl border border-red-400/50 bg-red-500/15 px-5 py-3 text-red-200 disabled:opacity-60"
                >
                  {seriesDeleting ? "Deleting..." : "Delete Series"}
                </button>
              )}
            </div>
          </form>

          <section
            className={`${mobilePanel === "posts" ? "block" : "hidden"} rounded-2xl border border-[var(--color-secondary)]/35 bg-black/25 lg:block`}
          >
            <div className="flex flex-col gap-4 border-b border-[var(--color-secondary)]/20 px-4 py-4 md:px-5 md:py-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-[var(--color-primary)]">
                    Series Posts
                  </h3>
                  <p className="mt-1 text-sm text-[var(--text-light)]/60">
                    {selectedSeriesSlug
                      ? `Managing posts in /${selectedSeriesSlug}`
                      : "Save a series before adding posts."}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[var(--color-secondary)]/25 px-3 py-1 text-xs text-[var(--text-light)]/70">
                    {sortedPosts.length} visible
                  </span>
                  <button
                    type="button"
                    onClick={startNewEntry}
                    disabled={!selectedSeriesSlug && !seriesForm.slug}
                    className="cursor-pointer rounded-xl bg-[var(--color-primary)] px-4 py-2.5 font-semibold text-[var(--text-color-dark)] disabled:opacity-50"
                  >
                    New Series Post
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 lg:hidden">
                {(
                  [
                    ["list", "Browse posts"],
                    ["editor", selectedEntrySlug ? "Edit post" : "New draft"],
                  ] as Array<[SeriesPostsMobileView, string]>
                ).map(([key, label]) => {
                  const isActive = mobilePostsView === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setMobilePostsView(key)}
                      className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                        isActive
                          ? "bg-[var(--color-primary)] text-[var(--text-color-dark)]"
                          : "border border-[var(--color-secondary)]/20 bg-black/20 text-[var(--text-light)]/70"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4 p-4 md:p-5">
              <div className={`${mobilePostsView === "list" ? "block" : "hidden"} space-y-3 lg:block`}>
                {selectedSeriesSlug ? (
                  sortedPosts.length > 0 ? (
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {sortedPosts.map((post) => {
                        const isActive = post.slug === selectedEntrySlug;
                        return (
                          <button
                            key={post.slug}
                            type="button"
                            onClick={() => selectEntry(post)}
                            className={`rounded-2xl border px-4 py-3 text-left transition ${
                              isActive
                                ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                                : "border-[var(--color-secondary)]/20 bg-black/20 hover:bg-black/35"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-[var(--color-primary)]">
                                  {post.title}
                                </p>
                                <p className="truncate text-sm text-[var(--text-light)]/60">
                                  /{post.slug}
                                </p>
                              </div>
                              <span className="rounded-full border border-[var(--color-secondary)]/25 px-2 py-1 text-xs text-[var(--text-light)]/65">
                                {post.date}
                              </span>
                            </div>
                            <p className="mt-3 text-sm text-[var(--text-light)]/55">
                              {post.author || "Guest"}
                            </p>
                            <p className="mt-3 text-sm text-[var(--color-secondary)]">
                              Tap to edit in the post panel.
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-[var(--color-secondary)]/20 bg-black/20 px-4 py-6 text-[var(--text-light)]/70">
                      No posts in this series yet.
                    </div>
                  )
                ) : (
                  <div className="rounded-xl border border-[var(--color-secondary)]/20 bg-black/20 px-4 py-6 text-[var(--text-light)]/70">
                    Create or save a series first to start adding posts.
                  </div>
                )}
              </div>

              <form
                onSubmit={handleEntrySubmit}
                className={`${mobilePostsView === "editor" ? "block" : "hidden"} space-y-5 border-t border-[var(--color-secondary)]/20 pt-4 lg:block`}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h4 className="text-lg font-semibold text-[var(--color-secondary)]">
                      {selectedEntrySlug ? "Edit Series Post" : "Create Series Post"}
                    </h4>
                    <p className="mt-1 text-sm text-[var(--text-light)]/55">
                      Mobile keeps browsing and editing as separate surfaces; desktop shows both together.
                    </p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 md:flex md:flex-wrap">
                    <button
                      type="button"
                      onClick={() => inlineImageInputRef.current?.click()}
                      disabled={uploadingInlineImage || !selectedSeriesSlug}
                      className="cursor-pointer rounded-xl border border-[var(--color-secondary)]/40 bg-black/35 px-4 py-3 text-sm disabled:opacity-50"
                    >
                      {uploadingInlineImage ? "Uploading..." : "Insert Photo"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEntryPreview((previous) => !previous)}
                      className="cursor-pointer rounded-xl bg-[var(--color-primary)] px-4 py-3 text-sm font-medium text-[var(--text-color-dark)]"
                    >
                      {entryPreview ? "Return to Editor" : "Preview Content"}
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

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[var(--color-secondary)]">
                      Title
                    </label>
                    <input
                      type="text"
                      value={entryForm.title}
                      onChange={(event) => {
                        const title = event.target.value;
                        setEntryForm((previous) => ({
                          ...previous,
                          title,
                          slug:
                            !selectedEntrySlug ||
                            previous.slug === generateSlug(previous.title)
                              ? generateSlug(title)
                              : previous.slug,
                        }));
                      }}
                      className="w-full rounded-xl border border-[var(--color-secondary)]/40 bg-black/35 px-4 py-3"
                      required
                      disabled={!selectedSeriesSlug}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[var(--color-secondary)]">
                      Slug
                    </label>
                    <input
                      type="text"
                      value={entryForm.slug}
                      onChange={(event) =>
                        setEntryForm((previous) => ({
                          ...previous,
                          slug: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-[var(--color-secondary)]/40 bg-black/35 px-4 py-3"
                      required
                      disabled={!selectedSeriesSlug}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[var(--color-secondary)]">
                      Date
                    </label>
                    <input
                      type="date"
                      value={entryForm.date}
                      onChange={(event) =>
                        setEntryForm((previous) => ({
                          ...previous,
                          date: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-[var(--color-secondary)]/40 bg-black/35 px-4 py-3"
                      required
                      disabled={!selectedSeriesSlug}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[var(--color-secondary)]">
                      Author
                    </label>
                    <input
                      type="text"
                      value={entryForm.author}
                      onChange={(event) =>
                        setEntryForm((previous) => ({
                          ...previous,
                          author: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-[var(--color-secondary)]/40 bg-black/35 px-4 py-3"
                      disabled={!selectedSeriesSlug}
                    />
                  </div>
                </div>

                <section className="rounded-2xl border border-[var(--color-secondary)]/20 bg-black/20 p-4">
                  <label className="mb-2 block text-sm font-medium text-[var(--color-secondary)]">
                    Cover Image
                  </label>
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                    <div>
                      <input
                        type="file"
                        ref={entryCoverInputRef}
                        onChange={handleEntryImageUpload}
                        accept="image/*"
                        disabled={uploadingEntryImage || !selectedSeriesSlug}
                        className="w-full cursor-pointer rounded-xl border border-[var(--color-secondary)]/40 bg-black/35 px-4 py-3"
                      />
                      <p className="mt-2 text-sm text-[var(--text-light)]/60">
                        {uploadingEntryImage
                          ? "Uploading cover image..."
                          : "Optional cover image for individual post pages."}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[var(--color-secondary)]/20 bg-black/25 p-3">
                      <p className="text-sm font-medium text-[var(--color-secondary)]">
                        Preview
                      </p>
                      {entryForm.image ? (
                        <img
                          src={entryForm.image}
                          alt="Series post cover preview"
                          className="mt-3 max-h-64 w-full rounded-xl border border-[var(--color-secondary)]/40 object-cover"
                        />
                      ) : (
                        <p className="mt-3 text-sm text-[var(--text-light)]/50">
                          No cover image selected yet.
                        </p>
                      )}
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-[var(--color-secondary)]/20 bg-black/20">
                  <div className="border-b border-[var(--color-secondary)]/15 px-4 py-3">
                    <label className="block text-sm font-medium text-[var(--color-secondary)]">
                      Markdown Content
                    </label>
                  </div>
                  <div className="p-4">
                    {!entryPreview ? (
                      <textarea
                        ref={entryTextAreaRef}
                        value={entryForm.markdown}
                        onChange={(event) =>
                          setEntryForm((previous) => ({
                            ...previous,
                            markdown: event.target.value,
                          }))
                        }
                        className="min-h-[18rem] w-full resize-y rounded-xl border border-[var(--color-secondary)]/40 bg-black/35 px-4 py-3 font-mono text-sm md:min-h-[24rem]"
                        required
                        disabled={!selectedSeriesSlug}
                      />
                    ) : (
                      <div className="min-h-[18rem] overflow-auto rounded-xl border border-[var(--color-secondary)]/40 bg-black/40 px-4 py-4 leading-7 md:min-h-[24rem]">
                        <MarkdownRenderer content={entryForm.markdown} />
                      </div>
                    )}
                  </div>
                </section>

                <div className="space-y-4 border-t border-[var(--color-secondary)]/15 pt-4">
                  <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap">
                    <button
                      type="submit"
                      disabled={entrySubmitting || !selectedSeriesSlug}
                      className="cursor-pointer rounded-xl bg-[var(--color-primary)] px-5 py-3 font-semibold text-[var(--text-color-dark)] disabled:opacity-50"
                    >
                      {entrySubmitting
                        ? "Saving..."
                        : selectedEntrySlug
                          ? "Save Series Post"
                          : "Create Series Post"}
                    </button>
                    <button
                      type="button"
                      onClick={resetEntryForm}
                      className="cursor-pointer rounded-xl border border-[var(--color-secondary)]/40 bg-black/35 px-5 py-3"
                    >
                      {selectedEntrySlug ? "Reset" : "Clear"}
                    </button>
                  </div>

                  {selectedEntrySlug && (
                    <div className="rounded-2xl border border-red-400/30 bg-red-500/8 p-3">
                      <p className="text-sm text-red-100/85">
                        Keep destructive actions separate from save actions on smaller screens.
                      </p>
                      <button
                        type="button"
                        onClick={handleEntryDelete}
                        disabled={entryDeleting}
                        className="mt-3 w-full cursor-pointer rounded-xl border border-red-400/50 bg-red-500/15 px-5 py-3 text-red-200 disabled:opacity-60 sm:w-auto"
                      >
                        {entryDeleting ? "Deleting..." : "Delete Series Post"}
                      </button>
                    </div>
                  )}
                </div>
              </form>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
