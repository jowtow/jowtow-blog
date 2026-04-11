import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@netlify/blobs';
import { verifyAdminAuth } from '@/lib/serverAuth';

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

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      );
    }

    // Validate filename
    const sanitizedName = file.name.replace(/[^a-z0-9.-]/gi, '-').toLowerCase();
    const filename = `${Date.now()}-${sanitizedName}`;

    // Read file as buffer
    const buffer = await file.arrayBuffer();

    // Store in Netlify Blobs
    const store = getStore('images');
    await store.set(filename, buffer, {
      metadata: {
        originalName: file.name,
        mimeType: file.type,
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
