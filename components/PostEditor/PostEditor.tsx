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
  const fileInputRef = useRef<HTMLInputElement>(null);
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
  const [uploading, setUploading] = useState(false);
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!authToken) {
      setError('Authentication token not available. Please refresh the page.');
      return;
    }

    setUploading(true);
    setError(null);

    try {
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
      setFormData((prev) => ({ ...prev, image: data.url }));
      setSuccess(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to upload image'
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
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
    <div className="max-w-4xl mx-auto py-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Create New Post</h2>
        <p className="text-gray-600">Write posts in markdown format with image support</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-800">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded text-green-800">
          ✓ Post created successfully!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleTitleChange}
            placeholder="Enter post title"
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* Slug */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Slug <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="slug"
            value={formData.slug}
            onChange={handleInputChange}
            placeholder="post-slug"
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            Auto-generated from title, but you can customize it
          </p>
        </div>

        {/* Featured Image */}
        <div>
          <label className="block text-sm font-medium mb-2">Cover Image</label>
          <div className="flex gap-4 items-start">
            <div className="flex-1">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                disabled={uploading}
                className="w-full px-4 py-2 border rounded-lg cursor-pointer"
              />
              <p className="text-sm text-gray-500 mt-1">
                {uploading ? 'Uploading...' : 'Select an image to upload (max 5MB)'}
              </p>
            </div>
          </div>
          {formData.image && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">Preview:</p>
              <img
                src={formData.image}
                alt="Cover preview"
                className="max-w-xs h-auto rounded border"
              />
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, image: '' }))}
                className="text-sm text-red-600 hover:text-red-700 mt-2"
              >
                Remove image
              </button>
            </div>
          )}
        </div>

        {/* Markdown Editor */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium">
              Content <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => setPreview(!preview)}
              className="text-sm px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded"
            >
              {preview ? 'Edit' : 'Preview'}
            </button>
          </div>

          {!preview ? (
            <textarea
              name="markdown"
              value={formData.markdown}
              onChange={handleInputChange}
              placeholder="# Heading&#10;&#10;Write your post in **Markdown** format..."
              className="w-full h-96 px-4 py-2 border rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
              required
            />
          ) : (
            <div className="w-full min-h-96 px-4 py-2 border rounded-lg bg-white prose prose-sm max-w-none overflow-auto">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {formData.markdown}
              </ReactMarkdown>
            </div>
          )}

          <p className="text-sm text-gray-500 mt-2">
            Supports GitHub Flavored Markdown (tables, strikethrough, etc.)
          </p>
        </div>

        {/* Submit Button */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg cursor-pointer transition"
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
            className="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium rounded-lg cursor-pointer transition"
          >
            Clear
          </button>
        </div>
      </form>
    </div>
  );
}
