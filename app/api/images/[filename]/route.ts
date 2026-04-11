import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@netlify/blobs';

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
    const file = await store.get(filename);

    if (!file) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    // Get metadata to determine content type if available
    let contentType = 'image/jpeg';
    let imageBuffer: ArrayBuffer;

    // Handle Netlify Blob response - cast to any to work with the dynamic type
    const blobData = file as any;
    
    if (typeof blobData === 'string') {
      // If it's a string, convert to buffer (this shouldn't happen for images)
      imageBuffer = new TextEncoder().encode(blobData).buffer;
    } else if (blobData.arrayBuffer && typeof blobData.arrayBuffer === 'function') {
      // It's a Blob or Blob-like object
      contentType = blobData.type || 'image/jpeg';
      imageBuffer = await blobData.arrayBuffer();
    } else if (blobData.buffer) {
      // It might be a Buffer or typed array
      imageBuffer = blobData.buffer;
    } else {
      throw new Error('Unable to convert file to ArrayBuffer: unsupported type');
    }

    const uint8Array = new Uint8Array(imageBuffer);

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
