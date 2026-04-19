import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@netlify/blobs';
import sharp from 'sharp';
import { verifyAdminAuth } from '@/lib/serverAuth';

const MAX_INPUT_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const MAX_OUTPUT_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 2560;
const RESIZE_DIMENSIONS = [MAX_IMAGE_DIMENSION, 2000, 1600];
const OUTPUT_QUALITY_STEPS = [82, 75, 68];
const PASSTHROUGH_MIME_TYPES = new Set(['image/gif', 'image/svg+xml']);

const MIME_EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
};

function sanitizeFilename(originalName: string) {
  const sanitized = originalName.replace(/[^a-z0-9.-]/gi, '-').toLowerCase();
  const parts = sanitized.split('.').filter(Boolean);
  const extension = parts.length > 1 ? parts.pop() : undefined;
  const baseName = parts.length ? parts.join('.') : 'image';
  return { baseName, extension };
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

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file is an image
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      );
    }

    // Validate file size (max 20MB before optimization)
    if (file.size > MAX_INPUT_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'File size must be less than 20MB' },
        { status: 400 }
      );
    }

    const { baseName, extension } = sanitizeFilename(file.name);
    const originalExtension =
      extension || MIME_EXTENSION_MAP[file.type] || 'jpg';

    // Read file as buffer
    const buffer: Buffer = Buffer.from(await file.arrayBuffer());

    let optimizedBuffer: Buffer = buffer;
    let outputMimeType = file.type;
    let outputExtension = originalExtension;
    let optimizationQuality: number | null = null;

    if (!PASSTHROUGH_MIME_TYPES.has(file.type)) {
      let optimizedUnderLimit = false;

      for (const maxDimension of RESIZE_DIMENSIONS) {
        const pipeline = sharp(buffer, { failOnError: false })
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
          optimizationQuality = quality;
          optimizedBuffer = candidate;
          outputMimeType = 'image/webp';
          outputExtension = 'webp';
          if (candidate.length <= MAX_OUTPUT_FILE_SIZE_BYTES) {
            optimizedUnderLimit = true;
            break;
          }
        }

        if (optimizedUnderLimit) {
          break;
        }
      }

      if (!optimizedUnderLimit) {
        if (buffer.length <= MAX_OUTPUT_FILE_SIZE_BYTES) {
          optimizedBuffer = buffer;
          outputMimeType = file.type;
          outputExtension = originalExtension;
          optimizationQuality = null;
        } else {
          return NextResponse.json(
            {
              error:
                'Image is too large even after optimization. Please upload a smaller image.',
            },
            { status: 413 }
          );
        }
      }

      if (
        optimizedBuffer.length >= buffer.length &&
        buffer.length <= MAX_OUTPUT_FILE_SIZE_BYTES
      ) {
        optimizedBuffer = buffer;
        outputMimeType = file.type;
        outputExtension = originalExtension;
        optimizationQuality = null;
      }
    }

    const filename = `${Date.now()}-${baseName}.${outputExtension}`;
    const optimizedData = new ArrayBuffer(optimizedBuffer.byteLength);
    new Uint8Array(optimizedData).set(optimizedBuffer);

    // Store in Netlify Blobs
    const store = getStore('images');
    await store.set(filename, optimizedData, {
      metadata: {
        originalName: file.name,
        mimeType: outputMimeType,
        originalMimeType: file.type,
        originalSize: file.size.toString(),
        optimizedSize: optimizedData.byteLength.toString(),
        optimizationQuality: optimizationQuality?.toString() ?? '',
        uploadedAt: new Date().toISOString(),
      },
    });

    // Return a URL for the image
    const imageUrl = `/api/images/${filename}`;

    return NextResponse.json(
      { success: true, url: imageUrl, filename },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file', details: error instanceof Error ? error.message : undefined },
      { status: 500 }
    );
  }
}
