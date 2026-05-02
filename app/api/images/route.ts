import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@netlify/blobs';
import { getSharp, type SharpFactory } from '@/lib/sharpLoader';
import { parseNumber, resolveImageMetadataWithSize } from '@/lib/imageMetadata';
import { verifyAdminAuth } from '@/lib/serverAuth';
import { adminMutableJsonResponse } from '@/lib/adminApi';

const MAX_OUTPUT_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 2560;
const RESIZE_DIMENSIONS = [MAX_IMAGE_DIMENSION, 2000, 1600];
const OUTPUT_QUALITY_STEPS = [82, 75, 68];
const PASSTHROUGH_MIME_TYPES = new Set(['image/gif', 'image/svg+xml']);

type ImageMetadata = Record<string, unknown>;

type ImageListEntry = {
  key: string;
  url: string;
  metadata: ImageMetadata;
};

type OptimizeResult = {
  key: string;
  status: 'optimized' | 'skipped' | 'error';
  message?: string;
  originalSize?: number;
  optimizedSize?: number;
  savedBytes?: number;
};

type OptimizeOutcome = {
  buffer: Buffer;
  mimeType: string;
  optimizationQuality: number | null;
  wasOptimized: boolean;
  reason?: string;
};

function inferImageMimeType(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'avif':
      return 'image/avif';
    case 'svg':
      return 'image/svg+xml';
    case 'jpg':
    case 'jpeg':
    default:
      return 'image/jpeg';
  }
}

function isValidImageKey(key: string): boolean {
  return Boolean(key) &&
    key !== '.' &&
    key !== '..' &&
    !key.includes('/') &&
    !key.includes('\\') &&
    !key.includes('..') &&
    !key.includes('\0');
}

function getMetadataString(metadata: ImageMetadata, key: string): string | undefined {
  const value = metadata[key];
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  return undefined;
}

function getBlobSize(blob: unknown): number | null {
  if (!blob || typeof blob !== 'object') {
    return null;
  }
  if (!('size' in blob)) {
    return null;
  }
  return parseNumber((blob as { size?: unknown }).size);
}

function resolveMimeType(metadata: ImageMetadata, key: string): string {
  return (
    getMetadataString(metadata, 'mimeType') ||
    getMetadataString(metadata, 'originalMimeType') ||
    inferImageMimeType(key)
  );
}

function createImageUrl(key: string): string {
  return `/api/images/${encodeURIComponent(key)}`;
}

async function optimizeExistingImage(
  buffer: Buffer,
  mimeType: string,
  sharpFactory: SharpFactory
): Promise<OptimizeOutcome> {
  if (PASSTHROUGH_MIME_TYPES.has(mimeType)) {
    return {
      buffer,
      mimeType,
      optimizationQuality: null,
      wasOptimized: false,
      reason: 'Passthrough format',
    };
  }

  const originalSize = buffer.length;
  const resizeTargets =
    originalSize <= MAX_OUTPUT_FILE_SIZE_BYTES
      ? [MAX_IMAGE_DIMENSION]
      : RESIZE_DIMENSIONS;

  let bestCandidate: Buffer | null = null;
  let bestQuality: number | null = null;
  let withinLimitCandidate: Buffer | null = null;
  let withinLimitQuality: number | null = null;

  for (const maxDimension of resizeTargets) {
    const pipeline = sharpFactory(buffer, { failOnError: false })
      .rotate()
      .resize({
        width: maxDimension,
        height: maxDimension,
        fit: 'inside',
        withoutEnlargement: true,
      });

    for (const quality of OUTPUT_QUALITY_STEPS) {
      const candidate: Buffer = await pipeline
        .clone()
        .webp({ quality, alphaQuality: 90, effort: 4 })
        .toBuffer();

      if (!bestCandidate || candidate.length < bestCandidate.length) {
        bestCandidate = candidate;
        bestQuality = quality;
      }

      if (candidate.length <= MAX_OUTPUT_FILE_SIZE_BYTES) {
        withinLimitCandidate = candidate;
        withinLimitQuality = quality;
        break;
      }
    }

    if (withinLimitCandidate) {
      break;
    }
  }

  const chosenCandidate = withinLimitCandidate ?? bestCandidate;
  const chosenQuality =
    withinLimitCandidate ? withinLimitQuality : bestQuality;

  if (!chosenCandidate || chosenCandidate.length >= originalSize) {
    return {
      buffer,
      mimeType,
      optimizationQuality: null,
      wasOptimized: false,
      reason: 'Already optimized or no savings',
    };
  }

  return {
    buffer: chosenCandidate,
    mimeType: 'image/webp',
    optimizationQuality: chosenQuality ?? null,
    wasOptimized: true,
  };
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAdminAuth(request);
    if (!authResult.ok) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    let optimizationAvailable = true;
    let optimizationError: string | undefined;

    try {
      await getSharp();
    } catch (error) {
      optimizationAvailable = false;
      optimizationError =
        error instanceof Error
          ? error.message
          : 'Image optimization is unavailable in this deployment.';
    }

    const store = getStore('images');
    const listResult = await store.list();

    const entries: ImageListEntry[] = await Promise.all(
      listResult.blobs.map(async (blob) => {
        try {
          const metadata = await resolveImageMetadataWithSize(
            store,
            blob.key,
            getBlobSize(blob)
          );

          return {
            key: blob.key,
            url: createImageUrl(blob.key),
            metadata,
          };
        } catch (error) {
          console.error(`Error loading metadata for image ${blob.key}:`, error);
          return {
            key: blob.key,
            url: createImageUrl(blob.key),
            metadata: {},
          };
        }
      })
    );

    return adminMutableJsonResponse({
      images: entries,
      optimizationAvailable,
      optimizationError,
    });
  } catch (error) {
    console.error('Error fetching images:', error);
    const isBlobsConfigError =
      error instanceof Error &&
      (error.name === 'MissingBlobsEnvironmentError' ||
        error.message.includes('MissingBlobsEnvironmentError') ||
        error.message.includes('Netlify Blobs'));
    return NextResponse.json(
      {
        error: isBlobsConfigError
          ? 'Image storage is unavailable in this deployment.'
          : 'Failed to fetch images',
      },
      { status: isBlobsConfigError ? 503 : 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdminAuth(request);
    if (!authResult.ok) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const body = await request.json().catch(() => ({}));
    const optimizeAll = body?.optimizeAll === true;
    const keys = Array.isArray(body?.keys)
      ? body.keys.filter((key: unknown) => typeof key === 'string')
      : [];

    if (!optimizeAll && keys.length === 0) {
      return NextResponse.json(
        { error: 'Provide image keys or set optimizeAll to true' },
        { status: 400 }
      );
    }

    let sharpFactory: SharpFactory;
    try {
      sharpFactory = await getSharp();
    } catch (error) {
      return NextResponse.json(
        {
          error: 'Image optimization is unavailable in this deployment.',
          details: error instanceof Error ? error.message : undefined,
        },
        { status: 503 }
      );
    }

    const store = getStore('images');
    const targetKeys = optimizeAll
      ? (await store.list()).blobs.map((blob: { key: string }) => blob.key)
      : keys;

    const results: OptimizeResult[] = [];
    let savedBytes = 0;

    for (const key of targetKeys) {
      if (!isValidImageKey(key)) {
        results.push({
          key,
          status: 'error',
          message: 'Invalid image key',
        });
        continue;
      }

      try {
        const record = await store.getWithMetadata(key, { type: 'arrayBuffer' });
        if (!record?.data) {
          results.push({
            key,
            status: 'error',
            message: 'Image not found',
          });
          continue;
        }

        const inputBuffer = Buffer.from(record.data);
        const metadata = record.metadata ?? {};
        const inputMimeType = resolveMimeType(metadata, key);
        const optimization = await optimizeExistingImage(
          inputBuffer,
          inputMimeType,
          sharpFactory
        );

        if (!optimization.wasOptimized) {
          results.push({
            key,
            status: 'skipped',
            message: optimization.reason,
            originalSize: inputBuffer.length,
            optimizedSize: inputBuffer.length,
            savedBytes: 0,
          });
          continue;
        }

        const outputBuffer = optimization.buffer;
        const outputMimeType = optimization.mimeType;
        const now = new Date().toISOString();
        const originalName =
          getMetadataString(metadata, 'originalName') ?? key;
        const uploadedAt =
          getMetadataString(metadata, 'uploadedAt') ?? now;
        const originalMimeType =
          getMetadataString(metadata, 'originalMimeType') ?? inputMimeType;

        const updatedMetadata = {
          ...metadata,
          originalName,
          mimeType: outputMimeType,
          originalMimeType,
          originalSize: inputBuffer.length.toString(),
          optimizedSize: outputBuffer.length.toString(),
          optimizationQuality:
            optimization.optimizationQuality?.toString() ?? '',
          uploadedAt,
          optimizedAt: now,
        };

        const optimizedData = new Blob(
          [new Uint8Array(outputBuffer)],
          { type: outputMimeType }
        );

        await store.set(key, optimizedData, {
          metadata: updatedMetadata,
        });

        const saved = inputBuffer.length - outputBuffer.length;
        savedBytes += saved;

        results.push({
          key,
          status: 'optimized',
          originalSize: inputBuffer.length,
          optimizedSize: outputBuffer.length,
          savedBytes: saved,
        });
      } catch (error) {
        results.push({
          key,
          status: 'error',
          message: error instanceof Error ? error.message : 'Failed to optimize image',
        });
      }
    }

    const summary = {
      optimizedCount: results.filter((result) => result.status === 'optimized').length,
      skippedCount: results.filter((result) => result.status === 'skipped').length,
      errorCount: results.filter((result) => result.status === 'error').length,
      savedBytes,
    };

    return NextResponse.json({ results, summary });
  } catch (error) {
    console.error('Error optimizing images:', error);
    return NextResponse.json(
      { error: 'Failed to optimize images', details: error instanceof Error ? error.message : undefined },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyAdminAuth(request);
    if (!authResult.ok) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const body = await request.json().catch(() => ({}));
    const keys = Array.isArray(body?.keys)
      ? body.keys.filter((key: unknown) => typeof key === 'string')
      : [];

    if (keys.length === 0) {
      return NextResponse.json(
        { error: 'Provide image keys to delete' },
        { status: 400 }
      );
    }

    const store = getStore('images');
    const results: { key: string; status: 'deleted' | 'error'; message?: string }[] = [];

    for (const key of keys) {
      if (!isValidImageKey(key)) {
        results.push({
          key,
          status: 'error',
          message: 'Invalid image key',
        });
        continue;
      }

      try {
        await store.delete(key);
        results.push({ key, status: 'deleted' });
      } catch (error) {
        results.push({
          key,
          status: 'error',
          message: error instanceof Error ? error.message : 'Failed to delete image',
        });
      }
    }

    const summary = {
      deletedCount: results.filter((result) => result.status === 'deleted').length,
      errorCount: results.filter((result) => result.status === 'error').length,
    };

    return NextResponse.json({ results, summary });
  } catch (error) {
    console.error('Error deleting images:', error);
    return NextResponse.json(
      { error: 'Failed to delete images', details: error instanceof Error ? error.message : undefined },
      { status: 500 }
    );
  }
}
