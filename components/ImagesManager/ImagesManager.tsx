"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/lib/auth";

type ImageMetadata = Record<string, unknown>;

type ImageEntry = {
  key: string;
  url: string;
  metadata: ImageMetadata;
};

type ImagesResponse =
  | ImageEntry[]
  | {
      images: ImageEntry[];
      optimizationAvailable?: boolean;
      optimizationError?: string;
    };

const OPTIMIZATION_UNAVAILABLE_MESSAGE =
  "Image optimization is unavailable in this deployment.";

type OptimizeSummary = {
  optimizedCount: number;
  skippedCount: number;
  errorCount: number;
  savedBytes: number;
};

type DeleteSummary = {
  deletedCount: number;
  errorCount: number;
};

const formatBytes = (bytes: number | null) => {
  if (bytes === null || Number.isNaN(bytes)) {
    return "Unknown";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 ? 1 : 2)} ${units[unitIndex]}`;
};

const parseNumber = (value: unknown): number | null => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const getMetadataString = (metadata: ImageMetadata, key: string) => {
  const value = metadata[key];
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    return value.toString();
  }
  return undefined;
};

const formatDate = (value?: string) => {
  if (!value) {
    return "Unknown";
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return value;
  }
  return new Date(parsed).toLocaleString();
};

export default function ImagesManager() {
  const { user } = useAuthStore();
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [images, setImages] = useState<ImageEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [optimizationAvailable, setOptimizationAvailable] = useState(true);
  const [optimizationError, setOptimizationError] = useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
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
      const netlifyIdentity = (window as Window & {
        netlifyIdentity?: {
          currentUser?: () => { token: { access_token: string } };
        };
      }).netlifyIdentity;
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

  const loadImages = useCallback(async () => {
    if (!authToken && !isLocalBypassEnabled) {
      setError("Authentication token not available. Please refresh the page.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/images", {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to load images");
      }

      const data = (await response.json()) as ImagesResponse;
      const entries = Array.isArray(data) ? data : data.images ?? [];
      const canOptimize = Array.isArray(data)
        ? true
        : data.optimizationAvailable ?? false;
      const optimizationMessage = Array.isArray(data)
        ? null
        : data.optimizationError ?? null;
      const parseTimestamp = (value?: string) => {
        const parsed = Date.parse(value ?? "");
        return Number.isNaN(parsed) ? 0 : parsed;
      };
      const sorted = [...entries].sort((a, b) => {
        const left = parseTimestamp(getMetadataString(a.metadata, "uploadedAt"));
        const right = parseTimestamp(getMetadataString(b.metadata, "uploadedAt"));
        return right - left;
      });

      setImages(sorted);
      setOptimizationAvailable(canOptimize);
      setOptimizationError(
        canOptimize
          ? null
          : optimizationMessage ?? OPTIMIZATION_UNAVAILABLE_MESSAGE
      );
      setSelectedKeys((prev) => {
        const available = new Set(sorted.map((image) => image.key));
        const next = new Set<string>();
        prev.forEach((key) => {
          if (available.has(key)) {
            next.add(key);
          }
        });
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load images");
    } finally {
      setLoading(false);
    }
  }, [authToken, isLocalBypassEnabled]);

  useEffect(() => {
    loadImages();
  }, [loadImages]);

  const storageSummary = useMemo(() => {
    let totalBytes = 0;
    let unknownCount = 0;

    images.forEach((image) => {
      const size =
        parseNumber(image.metadata.optimizedSize) ??
        parseNumber(image.metadata.originalSize);
      if (size === null) {
        unknownCount += 1;
      } else {
        totalBytes += size;
      }
    });

    return { totalBytes, unknownCount };
  }, [images]);

  const toggleSelection = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedKeys((prev) => {
      if (prev.size === images.length) {
        return new Set();
      }
      return new Set(images.map((image) => image.key));
    });
  };

  const handleOptimize = async (keys: string[], optimizeAll: boolean) => {
    if (!authToken && !isLocalBypassEnabled) {
      setError("Authentication token not available. Please refresh the page.");
      return;
    }

    if (!optimizationAvailable) {
      setError(optimizationError ?? OPTIMIZATION_UNAVAILABLE_MESSAGE);
      return;
    }

    if (!optimizeAll && keys.length === 0) {
      setError("Select at least one image to optimize.");
      return;
    }

    const label = optimizeAll
      ? `Optimize all ${images.length} images?`
      : keys.length === 1
        ? `Optimize "${keys[0]}"?`
        : `Optimize ${keys.length} selected images?`;

    if (!window.confirm(label)) {
      return;
    }

    setOptimizing(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/images", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          optimizeAll,
          keys: optimizeAll ? [] : keys,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to optimize images");
      }

      const data = (await response.json()) as {
        summary: OptimizeSummary;
      };

      const saved = formatBytes(data.summary.savedBytes);
      setSuccess(
        `Optimized ${data.summary.optimizedCount} image(s). ` +
          `Skipped ${data.summary.skippedCount}. ` +
          `Saved ${saved}.`
      );

      setSelectedKeys(new Set());
      await loadImages();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to optimize images");
    } finally {
      setOptimizing(false);
    }
  };

  const handleDelete = async (keys: string[]) => {
    if (!authToken && !isLocalBypassEnabled) {
      setError("Authentication token not available. Please refresh the page.");
      return;
    }

    if (keys.length === 0) {
      setError("Select at least one image to delete.");
      return;
    }

    const label =
      keys.length === 1
        ? `Delete "${keys[0]}"? This cannot be undone.`
        : `Delete ${keys.length} images? This cannot be undone.`;

    if (!window.confirm(label)) {
      return;
    }

    setDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/images", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ keys }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete images");
      }

      const data = (await response.json()) as {
        summary: DeleteSummary;
      };

      setSuccess(
        `Deleted ${data.summary.deletedCount} image(s). ` +
          `Errors: ${data.summary.errorCount}.`
      );

      setSelectedKeys(new Set());
      await loadImages();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete images");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="w-full py-8 text-[var(--text-light)]">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2 text-[var(--color-primary)]">
          Blob Image Library
        </h2>
        <p className="text-[var(--text-light)]/70">
          Review uploaded images stored in Netlify Blobs and re-run
          optimization to reclaim space.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-400/35 bg-red-500/10 px-4 py-3 text-red-200">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-md border border-[var(--color-primary)]/35 bg-[var(--color-primary)]/10 px-4 py-3 text-[var(--color-primary)]">
          {success}
        </div>
      )}

      {!optimizationAvailable && (
        <div className="mb-4 rounded-md border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-amber-100">
          {optimizationError ?? OPTIMIZATION_UNAVAILABLE_MESSAGE}
        </div>
      )}

      <div className="mb-6 rounded-lg border border-[var(--color-secondary)]/25 bg-black/20 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-[var(--text-light)]/70">Stored images</p>
            <p className="text-xl font-semibold text-[var(--color-primary)]">
              {images.length}
            </p>
          </div>
          <div>
            <p className="text-sm text-[var(--text-light)]/70">Known storage</p>
            <p className="text-xl font-semibold text-[var(--color-secondary)]">
              {formatBytes(storageSummary.totalBytes)}
              {storageSummary.unknownCount > 0
                ? ` (+${storageSummary.unknownCount} unknown)`
                : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => loadImages()}
              className="px-4 py-2 border border-[var(--color-secondary)]/45 bg-black/25 hover:bg-black/40 text-[var(--text-light)] rounded-md cursor-pointer transition disabled:opacity-50"
              disabled={loading || optimizing || deleting}
            >
              Refresh
            </button>
            <button
              onClick={() => handleOptimize(Array.from(selectedKeys), false)}
              className="px-4 py-2 bg-[var(--color-primary)] text-[var(--text-color-dark)] hover:brightness-95 font-semibold rounded-md cursor-pointer transition disabled:opacity-50"
              disabled={
                !optimizationAvailable ||
                selectedKeys.size === 0 ||
                optimizing ||
                deleting
              }
            >
              Optimize selected
            </button>
            <button
              onClick={() => handleOptimize([], true)}
              className="px-4 py-2 border border-[var(--color-primary)]/60 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/15 rounded-md cursor-pointer transition disabled:opacity-50"
              disabled={
                !optimizationAvailable || images.length === 0 || optimizing || deleting
              }
            >
              Optimize all
            </button>
            <button
              onClick={() => handleDelete(Array.from(selectedKeys))}
              className="px-4 py-2 border border-red-400/50 bg-red-500/15 text-red-200 hover:bg-red-500/25 rounded-md cursor-pointer transition disabled:opacity-50"
              disabled={selectedKeys.size === 0 || optimizing || deleting}
            >
              Delete selected
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-md border border-[var(--color-secondary)]/20 bg-black/20 px-4 py-6 text-[var(--text-light)]/70">
          Loading images...
        </div>
      ) : images.length === 0 ? (
        <div className="rounded-md border border-[var(--color-secondary)]/20 bg-black/20 px-4 py-6 text-[var(--text-light)]/70">
          No images found in blob storage yet.
        </div>
      ) : (
        <div className="rounded-lg border border-[var(--color-secondary)]/25 bg-black/20 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-secondary)]/20 bg-black/30 text-sm">
            <label className="flex items-center gap-2 text-[var(--text-light)]/80">
              <input
                type="checkbox"
                checked={selectedKeys.size === images.length}
                onChange={toggleSelectAll}
              />
              Select all ({selectedKeys.size} selected)
            </label>
            <span className="text-[var(--text-light)]/60">
              {optimizing
                ? "Optimizing..."
                : deleting
                  ? "Deleting..."
                  : !optimizationAvailable
                    ? "Optimization unavailable for this deployment."
                  : "Bulk actions apply to selected items."}
            </span>
          </div>
          <div className="divide-y divide-[var(--color-secondary)]/15">
            {images.map((image) => {
              const metadata = image.metadata;
              const mimeType = getMetadataString(metadata, "mimeType") || "Unknown";
              const originalName = getMetadataString(metadata, "originalName");
              const originalSize = parseNumber(metadata.originalSize);
              const optimizedSize = parseNumber(metadata.optimizedSize) ?? originalSize;
              const savedBytes =
                originalSize !== null && optimizedSize !== null
                  ? originalSize - optimizedSize
                  : null;

              return (
                <div
                  key={image.key}
                  className="flex flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex gap-4 items-start">
                    <input
                      type="checkbox"
                      checked={selectedKeys.has(image.key)}
                      onChange={() => toggleSelection(image.key)}
                      className="mt-1"
                    />
                    <div className="h-20 w-20 rounded-md border border-[var(--color-secondary)]/25 bg-black/30 overflow-hidden flex items-center justify-center">
                      <img
                        src={image.url}
                        alt={image.key}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-primary)] break-all">
                        {image.key}
                      </p>
                      {originalName && (
                        <p className="text-xs text-[var(--text-light)]/60">
                          Original: {originalName}
                        </p>
                      )}
                      <p className="text-xs text-[var(--text-light)]/70">
                        Type: {mimeType}
                      </p>
                      <p className="text-xs text-[var(--text-light)]/70">
                        Size: {formatBytes(optimizedSize)}
                        {savedBytes !== null && savedBytes > 0
                          ? ` (saved ${formatBytes(savedBytes)})`
                          : ""}
                      </p>
                      <p className="text-xs text-[var(--text-light)]/60">
                        Uploaded: {formatDate(getMetadataString(metadata, "uploadedAt"))}
                      </p>
                      {getMetadataString(metadata, "optimizedAt") && (
                        <p className="text-xs text-[var(--text-light)]/60">
                          Optimized: {formatDate(getMetadataString(metadata, "optimizedAt"))}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleOptimize([image.key], false)}
                      className="px-3 py-2 border border-[var(--color-primary)]/60 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/15 rounded-md text-sm transition disabled:opacity-50"
                      disabled={!optimizationAvailable || optimizing || deleting}
                    >
                      Optimize
                    </button>
                    <button
                      onClick={() => handleDelete([image.key])}
                      className="px-3 py-2 border border-red-400/50 text-red-200 hover:bg-red-500/20 rounded-md text-sm transition disabled:opacity-50"
                      disabled={optimizing || deleting}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
