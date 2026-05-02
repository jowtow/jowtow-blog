"use client";

import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/lib/auth";
import MarkdownRenderer from "@/components/MarkdownRenderer/MarkdownRenderer";

interface PostEditorProps {
  mode?: "create" | "edit";
  initialPost?: {
    title: string;
    slug: string;
    markdown: string;
    image: string;
    author?: string;
    date?: string;
  } | null;
  onSuccess?: () => void;
  onDelete?: () => void;
  onCancel?: () => void;
}

const emptyFormData = {
  title: "",
  slug: "",
  markdown: "",
  image: "",
};

export default function PostEditor({
  mode = "create",
  initialPost = null,
  onSuccess,
  onDelete,
  onCancel,
}: PostEditorProps) {
  const { user } = useAuthStore();
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const markdownFileInputRef = useRef<HTMLInputElement>(null);
  const markdownTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyFormData);
  const [preview, setPreview] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingMarkdownImage, setUploadingMarkdownImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const isLocalBypassEnabled =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1") &&
    process.env.NEXT_PUBLIC_DEV_ADMIN_BYPASS !== "false";

  useEffect(() => {
    const getToken = () => {
      const netlifyIdentity = (window as any).netlifyIdentity;
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

  const getAuthHeaders = (): Record<string, string> => {
    if (authToken) {
      return {
        authorization: `Bearer ${authToken}`,
      };
    }

    return {};
  };

  useEffect(() => {
    if (initialPost) {
      setFormData({
        title: initialPost.title,
        slug: initialPost.slug,
        markdown: initialPost.markdown,
        image: initialPost.image || "",
      });
      setPreview(false);
      setError(null);
      setSuccess(false);
      return;
    }

    if (mode === "create") {
      setFormData(emptyFormData);
      setPreview(false);
      setError(null);
      setSuccess(false);
    }
  }, [initialPost, mode]);

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
    setError(null);
    setSuccess(false);
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  };

  const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const title = event.target.value;
    handleInputChange(event);
    if (!formData.slug || formData.slug === generateSlug(formData.title)) {
      setFormData((previous) => ({
        ...previous,
        slug: generateSlug(title),
      }));
    }
  };

  const uploadImageFile = async (file: File) => {
    if (!authToken && !isLocalBypassEnabled) {
      throw new Error(
        "Authentication token not available. Please refresh the page.",
      );
    }

    const formDataToSend = new FormData();
    formDataToSend.append("file", file);

    const response = await fetch("/api/upload", {
      method: "POST",
      headers: getAuthHeaders(),
      body: formDataToSend,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to upload image");
    }

    const data = await response.json();
    return data.url as string;
  };

  const handleCoverImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    setError(null);

    try {
      const url = await uploadImageFile(file);
      setFormData((previous) => ({ ...previous, image: url }));
      setSuccess(false);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Failed to upload image",
      );
    } finally {
      setUploadingCover(false);
      if (coverFileInputRef.current) coverFileInputRef.current.value = "";
    }
  };

  const insertAtCursor = (insertion: string) => {
    const textarea = markdownTextAreaRef.current;

    if (!textarea) {
      setFormData((previous) => ({
        ...previous,
        markdown: `${previous.markdown}${insertion}`,
      }));
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nextValue =
      formData.markdown.slice(0, start) +
      insertion +
      formData.markdown.slice(end);

    setFormData((previous) => ({ ...previous, markdown: nextValue }));
    setSuccess(false);

    requestAnimationFrame(() => {
      textarea.focus();
      const nextCaret = start + insertion.length;
      textarea.setSelectionRange(nextCaret, nextCaret);
    });
  };

  const handleMarkdownImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    setUploadingMarkdownImage(true);
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
      insertAtCursor(`\n${snippets.join("\n")}\n`);
      setSuccess(false);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Failed to upload image",
      );
    } finally {
      setUploadingMarkdownImage(false);
      if (markdownFileInputRef.current) {
        markdownFileInputRef.current.value = "";
      }
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    if (!authToken && !isLocalBypassEnabled) {
      setError("Authentication token not available. Please refresh the page.");
      setSubmitting(false);
      return;
    }

    try {
      if (!formData.title || !formData.slug || !formData.markdown) {
        throw new Error("Please fill in all required fields");
      }

      const response = await fetch("/api/posts", {
        method: mode === "edit" ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          ...formData,
          originalSlug: initialPost?.slug,
          author:
            initialPost?.author ||
            user?.user_metadata?.full_name ||
            user?.email ||
            "Guest",
          date: initialPost?.date || new Date().toISOString().split("T")[0],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create post");
      }

      setSuccess(true);

      if (mode === "create") {
        setFormData(emptyFormData);
      }

      onSuccess?.();

      setTimeout(() => setSuccess(false), 3000);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "An error occurred",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!initialPost?.slug) {
      setError("No post selected for deletion");
      return;
    }

    if (!authToken && !isLocalBypassEnabled) {
      setError("Authentication token not available. Please refresh the page.");
      return;
    }

    const confirmed = window.confirm(
      `Delete post "${initialPost.title}"? This cannot be undone.`,
    );
    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/posts?slug=${encodeURIComponent(initialPost.slug)}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete post");
      }

      setSuccess(false);
      onDelete?.();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete post",
      );
    } finally {
      setDeleting(false);
    }
  };

  const resetForm = () => {
    setFormData(
      initialPost
        ? {
            title: initialPost.title,
            slug: initialPost.slug,
            markdown: initialPost.markdown,
            image: initialPost.image || "",
          }
        : emptyFormData,
    );
    setPreview(false);
    setError(null);
    setSuccess(false);
  };

  return (
    <div className="mx-auto max-w-5xl py-2 text-[var(--text-light)] md:py-3">
      <div className="mb-4 flex flex-col gap-2 md:mb-5">
        <h2 className="text-xl font-bold text-[var(--color-primary)] md:text-2xl">
          {mode === "edit" ? "Edit Post" : "Create New Post"}
        </h2>
        <p className="max-w-2xl text-sm leading-6 text-[var(--text-light)]/70">
          {mode === "edit"
            ? "Update or remove an existing dynamic post. Mobile actions are stacked for safer editing on the go."
            : "Write and preview posts with inline markdown images. Desktop keeps the roomy editor while mobile trims the chrome."}
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-red-200">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-xl border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 px-4 py-3 text-[var(--color-primary)]">
          ✓ {mode === "edit" ? "Post updated successfully!" : "Post created successfully!"}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-[var(--color-secondary)]/35 bg-black/25 p-4 md:p-5"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-secondary)]">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleTitleChange}
              placeholder="Enter post title"
              className="w-full rounded-xl border border-[var(--color-secondary)]/40 bg-black/35 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/60"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-secondary)]">
              Slug <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="slug"
              value={formData.slug}
              onChange={handleInputChange}
              placeholder="post-slug"
              className="w-full rounded-xl border border-[var(--color-secondary)]/40 bg-black/35 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/60"
              required
            />
            <p className="mt-1 text-sm text-[var(--text-light)]/60">
              Auto-generated from title, but you can customize it.
            </p>
          </div>
        </div>

        <section className="rounded-2xl border border-[var(--color-secondary)]/20 bg-black/20 p-4">
          <div className="mb-4 flex flex-col gap-1">
            <label className="text-sm font-medium text-[var(--color-secondary)]">
              Cover Image
            </label>
            <p className="text-sm text-[var(--text-light)]/60">
              Keep uploads and preview together so mobile editors do not lose context.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div>
              <input
                type="file"
                ref={coverFileInputRef}
                onChange={handleCoverImageUpload}
                accept="image/*"
                disabled={uploadingCover}
                className="w-full cursor-pointer rounded-xl border border-[var(--color-secondary)]/40 bg-black/35 px-4 py-3"
              />
              <p className="mt-2 text-sm text-[var(--text-light)]/60">
                {uploadingCover
                  ? "Uploading cover image..."
                  : "Select an image to upload (max 5MB)."}
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--color-secondary)]/20 bg-black/25 p-3">
              <p className="text-sm font-medium text-[var(--color-secondary)]">Preview</p>
              {formData.image ? (
                <>
                  <img
                    src={formData.image}
                    alt="Cover preview"
                    className="mt-3 max-h-64 w-full rounded-xl border border-[var(--color-secondary)]/40 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData((previous) => ({ ...previous, image: "" }))}
                    className="mt-3 cursor-pointer text-sm text-red-300 transition hover:text-red-200"
                  >
                    Remove image
                  </button>
                </>
              ) : (
                <p className="mt-3 text-sm text-[var(--text-light)]/50">
                  No cover image selected yet.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--color-secondary)]/20 bg-black/20">
          <div className="flex flex-col gap-3 border-b border-[var(--color-secondary)]/15 px-4 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <label className="block text-sm font-medium text-[var(--color-secondary)]">
                Content <span className="text-red-500">*</span>
              </label>
              <p className="mt-1 text-sm text-[var(--text-light)]/60">
                Supports GitHub Flavored Markdown.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 md:flex md:flex-wrap">
              <button
                type="button"
                onClick={() => markdownFileInputRef.current?.click()}
                disabled={uploadingMarkdownImage}
                className="cursor-pointer rounded-xl border border-[var(--color-secondary)]/50 bg-black/35 px-4 py-3 text-sm transition hover:bg-black/55 disabled:opacity-60"
              >
                {uploadingMarkdownImage ? "Uploading..." : "Insert Photo"}
              </button>
              <button
                type="button"
                onClick={() => setPreview((previous) => !previous)}
                className="cursor-pointer rounded-xl bg-[var(--color-primary)] px-4 py-3 text-sm font-medium text-[var(--text-color-dark)] transition hover:brightness-95"
              >
                {preview ? "Return to Editor" : "Preview Content"}
              </button>
            </div>
          </div>

          <input
            type="file"
            ref={markdownFileInputRef}
            onChange={handleMarkdownImageUpload}
            accept="image/*"
            multiple
            disabled={uploadingMarkdownImage}
            className="hidden"
          />

          <div className="p-4">
            {!preview ? (
              <textarea
                ref={markdownTextAreaRef}
                name="markdown"
                value={formData.markdown}
                onChange={handleInputChange}
                placeholder="# Heading&#10;&#10;Write your post in **Markdown** format..."
                className="min-h-[18rem] w-full resize-y rounded-xl border border-[var(--color-secondary)]/40 bg-black/35 px-4 py-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/60 md:min-h-[24rem] lg:min-h-[34rem]"
                required
              />
            ) : (
              <div className="min-h-[18rem] overflow-auto rounded-xl border border-[var(--color-secondary)]/40 bg-black/40 px-4 py-4 leading-7 md:min-h-[24rem] lg:min-h-[34rem]">
                <MarkdownRenderer content={formData.markdown} />
              </div>
            )}

            <p className="mt-3 text-sm text-[var(--text-light)]/60">
              Use Insert Photo to upload images and inject markdown at the cursor.
            </p>
          </div>
        </section>

        <div className="space-y-4 border-t border-[var(--color-secondary)]/15 pt-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center">
            <button
              type="submit"
              disabled={submitting}
              className="cursor-pointer rounded-xl bg-[var(--color-primary)] px-5 py-3 font-semibold text-[var(--text-color-dark)] transition hover:brightness-95 disabled:opacity-60"
            >
              {submitting
                ? mode === "edit"
                  ? "Saving..."
                  : "Creating..."
                : mode === "edit"
                  ? "Save Changes"
                  : "Create Post"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="cursor-pointer rounded-xl border border-[var(--color-secondary)]/50 bg-black/35 px-5 py-3 font-medium text-[var(--text-light)] transition hover:bg-black/50"
            >
              {mode === "edit" ? "Reset Changes" : "Clear Draft"}
            </button>
            {mode === "edit" && onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="cursor-pointer rounded-xl border border-[var(--color-secondary)]/50 bg-black/35 px-5 py-3 font-medium text-[var(--text-light)] transition hover:bg-black/50"
              >
                Cancel
              </button>
            )}
          </div>

          {mode === "edit" && (
            <div className="rounded-2xl border border-red-400/30 bg-red-500/8 p-3">
              <p className="text-sm text-red-100/85">
                Destructive actions are separated from save controls on smaller screens.
              </p>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="mt-3 w-full cursor-pointer rounded-xl border border-red-400/50 bg-red-500/15 px-5 py-3 font-medium text-red-200 transition hover:bg-red-500/25 disabled:opacity-60 sm:w-auto"
              >
                {deleting ? "Deleting..." : "Delete Post"}
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
