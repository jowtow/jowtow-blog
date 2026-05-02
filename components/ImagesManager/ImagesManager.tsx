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
        } catch (tokenError) {
          console.error("Failed to get token:", tokenError);
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
          : optimizationMessage ?? OPTIMIZATION_UNAVAILABLE_MESSAGE,
      );
      setSelectedKeys((previous) => {
        const available = new Set(sorted.map((image) => image.key));
        const next = new Set<string>();
        previous.forEach((key) => {
          if (available.has(key)) {
            next.add(key);
          }
        });
        return next;
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load images");
    } finally {
      setLoading(false);
    }
  }, [authToken, isLocalBypassEnabled]);

  useEffect(() => {
    void loadImages();
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
    setSelectedKeys((previous) => {
      const next = new Set(previous);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedKeys((previous) => {
      if (previous.size === images.length) {
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
          `Saved ${saved}.`,
      );

      setSelectedKeys(new Set());
      await loadImages();
    } catch (optimizeError) {
      setError(
        optimizeError instanceof Error
          ? optimizeError.message
          : "Failed to optimize images",
      );
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
          `Errors: ${data.summary.errorCount}.`,
      );

      setSelectedKeys(new Set());
      await loadImages();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "Failed to delete images",
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="w-full space-y-4 py-2 text-[var(--text-light)] md:py-3">
      <div>
        <h2 className="text-xl font-bold text-[var(--color-primary)] md:text-2xl">
          Blob Image Library
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-light)]/70">
          Review uploaded images stored in Netlify Blobs and re-run optimization to reclaim space. Mobile uses card rows; desktop keeps the denser review surface.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-400/35 bg-red-500/10 px-4 py-3 text-red-200">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-[var(--color-primary)]/35 bg-[var(--color-primary)]/10 px-4 py-3 text-[var(--color-primary)]">
          {success}
        </div>
      )}

      {!optimizationAvailable && (
        <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-amber-100">
          {optimizationError ?? OPTIMIZATION_UNAVAILABLE_MESSAGE}
        </div>
      )}

      <section className="rounded-2xl border border-[var(--color-secondary)]/25 bg-black/20 p-4 md:p-5">
        <div className="grid gap-4 xl:grid-cols-[repeat(2,minmax(0,220px))_minmax(0,1fr)] xl:items-start">
          <div className="rounded-2xl border border-[var(--color-secondary)]/20 bg-black/20 px-4 py-3">
            <p className="text-sm text-[var(--text-light)]/70">Stored images</p>
            <p className="mt-2 text-3xl font-semibold text-[var(--color-primary)]">
              {images.length}
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--color-secondary)]/20 bg-black/20 px-4 py-3">
            <p className="text-sm text-[var(--text-light)]/70">Known storage</p>
            <p className="mt-2 text-2xl font-semibold text-[var(--color-secondary)]">
              {formatBytes(storageSummary.totalBytes)}
            </p>
            {storageSummary.unknownCount > 0 && (
              <p className="mt-1 text-sm text-[var(--text-light)]/55">
                +{storageSummary.unknownCount} image(s) with unknown size
              </p>
            )}
          </div>
          <div className="space-y-3 rounded-2xl border border-[var(--color-secondary)]/20 bg-black/20 p-3">
            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm text-[var(--text-light)]/80">
                <input
                  type="checkbox"
                  checked={images.length > 0 && selectedKeys.size === images.length}
                  onChange={toggleSelectAll}
                  disabled={images.length === 0}
                />
                Select all
              </label>
              <span className="text-xs text-[var(--text-light)]/55">
                {selectedKeys.size} selected
              </span>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <button
                onClick={() => void loadImages()}
                className="rounded-xl border border-[var(--color-secondary)]/45 bg-black/25 px-4 py-3 text-[var(--text-light)] transition hover:bg-black/40 disabled:opacity-50"
                disabled={loading || optimizing || deleting}
              >
                Refresh
              </button>
              <button
                onClick={() => handleOptimize(Array.from(selectedKeys), false)}
                className="rounded-xl bg-[var(--color-primary)] px-4 py-3 font-semibold text-[var(--text-color-dark)] transition hover:brightness-95 disabled:opacity-50"
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
                className="rounded-xl border border-[var(--color-primary)]/60 px-4 py-3 text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/15 disabled:opacity-50"
                disabled={
                  !optimizationAvailable ||
                  images.length === 0 ||
                  optimizing ||
                  deleting
                }
              >
                Optimize all
              </button>
              <button
                onClick={() => handleDelete(Array.from(selectedKeys))}
                className="rounded-xl border border-red-400/50 bg-red-500/15 px-4 py-3 text-red-200 transition hover:bg-red-500/25 disabled:opacity-50"
                disabled={selectedKeys.size === 0 || optimizing || deleting}
              >
                Delete selected
              </button>
            </div>

            <p className="text-sm text-[var(--text-light)]/55">
              {optimizing
                ? "Optimizing selected assets..."
                : deleting
                  ? "Deleting selected assets..."
                  : !optimizationAvailable
                    ? "Optimization is unavailable for this deployment."
                    : "Bulk actions apply to the current selection."}
            </p>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="rounded-xl border border-[var(--color-secondary)]/20 bg-black/20 px-4 py-5 text-[var(--text-light)]/70">
          Loading images...
        </div>
      ) : images.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-secondary)]/20 bg-black/20 px-4 py-5 text-[var(--text-light)]/70">
          No images found in blob storage yet.
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid gap-3 md:hidden">
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
              const isSelected = selectedKeys.has(image.key);

              return (
                <article
                  key={image.key}
                  className={`rounded-2xl border bg-black/20 p-4 transition ${
                    isSelected
                      ? "border-[var(--color-primary)]/45 shadow-[0_0_0_1px_rgba(127,255,0,0.12)]"
                      : "border-[var(--color-secondary)]/20"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelection(image.key)}
                      className="mt-1"
                    />
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--color-secondary)]/25 bg-black/30">
                      <img
                        src={image.url}
                        alt={image.key}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="break-all text-sm font-semibold text-[var(--color-primary)]">
                        {image.key}
                      </p>
                      {originalName && (
                        <p className="mt-1 text-xs text-[var(--text-light)]/60">
                          Original: {originalName}
                        </p>
                      )}
                      <div className="mt-3 grid gap-1 text-xs text-[var(--text-light)]/70">
                        <p>Type: {mimeType}</p>
                        <p>
                          Size: {formatBytes(optimizedSize)}
                          {savedBytes !== null && savedBytes > 0
                            ? ` (saved ${formatBytes(savedBytes)})`
                            : ""}
                        </p>
                        <p>Uploaded: {formatDate(getMetadataString(metadata, "uploadedAt"))}</p>
                        {getMetadataString(metadata, "optimizedAt") && (
                          <p>
                            Optimized: {formatDate(getMetadataString(metadata, "optimizedAt"))}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleOptimize([image.key], false)}
                      className="rounded-xl border border-[var(--color-primary)]/60 px-3 py-3 text-sm text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/15 disabled:opacity-50"
                      disabled={!optimizationAvailable || optimizing || deleting}
                    >
                      Optimize
                    </button>
                    <button
                      onClick={() => handleDelete([image.key])}
                      className="rounded-xl border border-red-400/50 px-3 py-3 text-sm text-red-200 transition hover:bg-red-500/20 disabled:opacity-50"
                      disabled={optimizing || deleting}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="hidden overflow-hidden rounded-2xl border border-[var(--color-secondary)]/25 bg-black/20 md:block">
            <div className="flex items-center justify-between border-b border-[var(--color-secondary)]/20 bg-black/30 px-4 py-2.5 text-sm">
              <label className="flex items-center gap-2 text-[var(--text-light)]/80">
                <input
                  type="checkbox"
                  checked={selectedKeys.size === images.length}
                  onChange={toggleSelectAll}
                />
                Select all ({selectedKeys.size} selected)
              </label>
              <span className="text-[var(--text-light)]/60">
                Review thumbnails, metadata, and per-image actions from one list.
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
                    className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        checked={selectedKeys.has(image.key)}
                        onChange={() => toggleSelection(image.key)}
                        className="mt-1"
                      />
                      <div className="flex h-[4.75rem] w-[4.75rem] items-center justify-center overflow-hidden rounded-xl border border-[var(--color-secondary)]/25 bg-black/30">
                        <img
                          src={image.url}
                          alt={image.key}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <div>
                        <p className="break-all text-sm font-semibold text-[var(--color-primary)]">
                          {image.key}
                        </p>
                        {originalName && (
                          <p className="text-xs text-[var(--text-light)]/60">
                            Original: {originalName}
                          </p>
                        )}
                        <div className="mt-1 grid gap-1 text-xs text-[var(--text-light)]/70 md:grid-cols-2 md:gap-x-4">
                          <p>Type: {mimeType}</p>
                          <p>
                            Size: {formatBytes(optimizedSize)}
                            {savedBytes !== null && savedBytes > 0
                              ? ` (saved ${formatBytes(savedBytes)})`
                              : ""}
                          </p>
                          <p>Uploaded: {formatDate(getMetadataString(metadata, "uploadedAt"))}</p>
                          {getMetadataString(metadata, "optimizedAt") && (
                            <p>
                              Optimized: {formatDate(getMetadataString(metadata, "optimizedAt"))}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleOptimize([image.key], false)}
                        className="rounded-xl border border-[var(--color-primary)]/60 px-3 py-2 text-sm text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/15 disabled:opacity-50"
                        disabled={!optimizationAvailable || optimizing || deleting}
                      >
                        Optimize
                      </button>
                      <button
                        onClick={() => handleDelete([image.key])}
                        className="rounded-xl border border-red-400/50 px-3 py-2 text-sm text-red-200 transition hover:bg-red-500/20 disabled:opacity-50"
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
        </div>
      )}
    </div>
  );
}
