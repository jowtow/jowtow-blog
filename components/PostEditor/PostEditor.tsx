'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/lib/auth';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface PostEditorProps {
  onSuccess?: () => void;
}

export default function PostEditor({ onSuccess }: PostEditorProps) {
  const { user } = useAuthStore();
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const markdownFileInputRef = useRef<HTMLInputElement>(null);
  const markdownTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    // Get token from Netlify Identity
    const getToken = () => {
      const netlifyIdentity = (window as any).netlifyIdentity;
      if (netlifyIdentity?.currentUser?.()) {
        try {
          const token = netlifyIdentity.currentUser().token.access_token;
          setAuthToken(token);
        } catch (error) {
          console.error('Failed to get token:', error);
        }
      }
    };

    getToken();
  }, [user]);

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    markdown: '',
    image: '',
  });

  const [preview, setPreview] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingMarkdownImage, setUploadingMarkdownImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    handleInputChange(e);
    if (!formData.slug || formData.slug === generateSlug(formData.title)) {
      setFormData((prev) => ({ ...prev, slug: generateSlug(title) }));
    }
  };

  const uploadImageFile = async (file: File) => {
    if (!authToken) {
      throw new Error('Authentication token not available. Please refresh the page.');
    }

    const formDataToSend = new FormData();
    formDataToSend.append('file', file);

    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      body: formDataToSend,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to upload image');
    }

    const data = await response.json();
    return data.url as string;
  };

  const handleCoverImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    setError(null);

    try {
      const url = await uploadImageFile(file);
      setFormData((prev) => ({ ...prev, image: url }));
      setSuccess(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setUploadingCover(false);
      if (coverFileInputRef.current) coverFileInputRef.current.value = '';
    }
  };

  const insertAtCursor = (insertion: string) => {
    const textarea = markdownTextAreaRef.current;

    if (!textarea) {
      setFormData((prev) => ({ ...prev, markdown: `${prev.markdown}${insertion}` }));
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nextValue =
      formData.markdown.slice(0, start) + insertion + formData.markdown.slice(end);

    setFormData((prev) => ({ ...prev, markdown: nextValue }));
    setSuccess(false);

    requestAnimationFrame(() => {
      textarea.focus();
      const nextCaret = start + insertion.length;
      textarea.setSelectionRange(nextCaret, nextCaret);
    });
  };

  const handleMarkdownImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingMarkdownImage(true);
    setError(null);

    try {
      const url = await uploadImageFile(file);
      const altText = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
      const markdownSnippet = `\n![${altText}](${url})\n`;
      insertAtCursor(markdownSnippet);
      setSuccess(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setUploadingMarkdownImage(false);
      if (markdownFileInputRef.current) markdownFileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    if (!authToken) {
      setError('Authentication token not available. Please refresh the page.');
      setSubmitting(false);
      return;
    }

    try {
      if (!formData.title || !formData.slug || !formData.markdown) {
        throw new Error('Please fill in all required fields');
      }

      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          ...formData,
          author: user?.user_metadata?.full_name || user?.email || 'Guest',
          date: new Date().toISOString().split('T')[0],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create post');
      }

      setSuccess(true);
      setFormData({
        title: '',
        slug: '',
        markdown: '',
        image: '',
      });
      onSuccess?.();

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 text-[var(--text-light)]">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2 text-[var(--color-primary)]">Create New Post</h2>
        <p className="text-[var(--text-light)]/70">Write and preview posts with inline markdown images.</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-400/40 rounded text-red-200">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/40 rounded text-[var(--color-primary)]">
          ✓ Post created successfully!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-[var(--color-secondary)]/35 bg-black/25 p-5">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium mb-2 text-[var(--color-secondary)]">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleTitleChange}
            placeholder="Enter post title"
            className="w-full px-4 py-2 border border-[var(--color-secondary)]/40 bg-black/35 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/60"
            required
          />
        </div>

        {/* Slug */}
        <div>
          <label className="block text-sm font-medium mb-2 text-[var(--color-secondary)]">
            Slug <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="slug"
            value={formData.slug}
            onChange={handleInputChange}
            placeholder="post-slug"
            className="w-full px-4 py-2 border border-[var(--color-secondary)]/40 bg-black/35 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/60"
            required
          />
          <p className="text-sm text-[var(--text-light)]/60 mt-1">
            Auto-generated from title, but you can customize it
          </p>
        </div>

        {/* Featured Image */}
        <div>
          <label className="block text-sm font-medium mb-2 text-[var(--color-secondary)]">Cover Image</label>
          <div className="flex gap-4 items-start">
            <div className="flex-1">
              <input
                type="file"
                ref={coverFileInputRef}
                onChange={handleCoverImageUpload}
                accept="image/*"
                disabled={uploadingCover}
                className="w-full px-4 py-2 border border-[var(--color-secondary)]/40 bg-black/35 rounded-lg cursor-pointer"
              />
              <p className="text-sm text-[var(--text-light)]/60 mt-1">
                {uploadingCover ? 'Uploading cover image...' : 'Select an image to upload (max 5MB)'}
              </p>
            </div>
          </div>
          {formData.image && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">Preview:</p>
              <img
                src={formData.image}
                alt="Cover preview"
                className="max-w-xs h-auto rounded border border-[var(--color-secondary)]/50"
              />
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, image: '' }))}
                className="text-sm text-red-300 hover:text-red-200 mt-2 cursor-pointer"
              >
                Remove image
              </button>
            </div>
          )}
        </div>

        {/* Markdown Editor */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-[var(--color-secondary)]">
              Content <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => markdownFileInputRef.current?.click()}
                disabled={uploadingMarkdownImage}
                className="text-sm px-3 py-1 border border-[var(--color-secondary)]/50 bg-black/35 hover:bg-black/55 rounded cursor-pointer transition disabled:opacity-60"
              >
                {uploadingMarkdownImage ? 'Uploading...' : 'Insert Photo'}
              </button>
              <button
                type="button"
                onClick={() => setPreview(!preview)}
                className="text-sm px-3 py-1 bg-[var(--color-primary)] text-[var(--text-color-dark)] hover:brightness-95 rounded font-medium cursor-pointer"
              >
                {preview ? 'Edit' : 'Preview'}
              </button>
            </div>
          </div>
          <input
            type="file"
            ref={markdownFileInputRef}
            onChange={handleMarkdownImageUpload}
            accept="image/*"
            disabled={uploadingMarkdownImage}
            className="hidden"
          />

          {!preview ? (
            <textarea
              ref={markdownTextAreaRef}
              name="markdown"
              value={formData.markdown}
              onChange={handleInputChange}
              placeholder="# Heading&#10;&#10;Write your post in **Markdown** format..."
              className="w-full h-96 px-4 py-2 border border-[var(--color-secondary)]/40 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/60 resize-vertical bg-black/35"
              required
            />
          ) : (
            <div className="w-full min-h-96 px-4 py-3 border border-[var(--color-secondary)]/40 rounded-lg bg-black/40 overflow-auto leading-7">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  img: ({ node, ...props }) => (
                    <img
                      {...props}
                      loading="lazy"
                      className="max-h-[40vh] rounded border border-[var(--color-secondary)]/50 block my-3 mx-auto max-w-[min(100%,70vw)]"
                    />
                  ),
                }}
              >
                {formData.markdown}
              </ReactMarkdown>
            </div>
          )}

          <p className="text-sm text-[var(--text-light)]/60 mt-2">
            Supports GitHub Flavored Markdown. Use the Insert Photo button to upload and inject image markdown at the cursor.
          </p>
        </div>

        {/* Submit Button */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-[var(--color-primary)] hover:brightness-95 disabled:opacity-60 text-[var(--text-color-dark)] font-semibold rounded-lg cursor-pointer transition"
          >
            {submitting ? 'Creating...' : 'Create Post'}
          </button>
          <button
            type="button"
            onClick={() =>
              setFormData({
                title: '',
                slug: '',
                markdown: '',
                image: '',
              })
            }
            className="px-6 py-2 border border-[var(--color-secondary)]/50 bg-black/35 hover:bg-black/50 text-[var(--text-light)] font-medium rounded-lg cursor-pointer transition"
          >
            Clear
          </button>
        </div>
      </form>
    </div>
  );
}
