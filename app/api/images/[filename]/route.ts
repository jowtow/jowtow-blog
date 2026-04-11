import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@netlify/blobs';

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    // Validate filename format
    if (!filename || !/^[\d-a-z.]+$/.test(filename)) {
      return NextResponse.json(
        { error: 'Invalid filename format' },
        { status: 400 }
      );
    }

    const store = getStore('images');
    const file = await store.getWithMetadata(filename, { type: 'arrayBuffer' });

    if (!file || !file.data) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    const contentType = (file.metadata?.mimeType as string) || inferImageMimeType(filename);
    const uint8Array = new Uint8Array(file.data);

    return new NextResponse(uint8Array, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Length': uint8Array.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error retrieving image:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve image', details: error instanceof Error ? error.message : undefined },
      { status: 500 }
    );
  }
}
