import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getStore } from '@netlify/blobs';
import {
  getDynamicCollectionBySlug,
  getCollectionItemKey,
} from '@/lib/dynamicCollections';
import { verifyAdminAuth } from '@/lib/serverAuth';

function revalidateCollectionItemPaths(collectionSlug: string) {
  revalidatePath('/');
  revalidatePath('/collections');
  revalidatePath(`/collections/${collectionSlug}`);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ collectionSlug: string }> }
) {
  try {
    const authResult = await verifyAdminAuth(request);
    if (!authResult.ok) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { collectionSlug } = await params;
    const collection = await getDynamicCollectionBySlug(collectionSlug);
    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    const body = await request.json();
    const { slug, title, markdown, image, date } = body;

    if (!slug || !title || !date) {
      return NextResponse.json(
        { error: 'Missing required fields: slug, title, date' },
        { status: 400 }
      );
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { error: 'Slug must contain only lowercase letters, numbers, and hyphens' },
        { status: 400 }
      );
    }

    const duplicate = collection.items.find((item) => item.slug === slug);
    if (duplicate) {
      return NextResponse.json(
        { error: 'A collection item with this slug already exists' },
        { status: 409 }
      );
    }

    const itemData = {
      collectionSlug,
      slug,
      title,
      markdown: markdown || '',
      image: image || '',
      date,
      order: collection.items.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const store = getStore('collections');
    await store.set(getCollectionItemKey(collectionSlug, slug), JSON.stringify(itemData), {
      metadata: {
        slug,
        collectionSlug,
        date,
        title,
        order: itemData.order,
      },
    });

    revalidateCollectionItemPaths(collectionSlug);

    return NextResponse.json({ success: true, data: itemData }, { status: 201 });
  } catch (error) {
    console.error('Error creating collection item:', error);
    return NextResponse.json(
      { error: 'Failed to create collection item', details: error instanceof Error ? error.message : undefined },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ collectionSlug: string }> }
) {
  try {
    const authResult = await verifyAdminAuth(request);
    if (!authResult.ok) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { collectionSlug } = await params;
    const collection = await getDynamicCollectionBySlug(collectionSlug);
    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    const body = await request.json();
    const { originalSlug, slug, title, markdown, image, date } = body;

    if (!originalSlug || !slug || !title || !date) {
      return NextResponse.json(
        { error: 'Missing required fields: originalSlug, slug, title, date' },
        { status: 400 }
      );
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { error: 'Slug must contain only lowercase letters, numbers, and hyphens' },
        { status: 400 }
      );
    }

    const existing = collection.items.find((item) => item.slug === originalSlug);
    if (!existing) {
      return NextResponse.json({ error: 'Collection item not found' }, { status: 404 });
    }

    const conflicting = slug !== originalSlug ? collection.items.find((item) => item.slug === slug) : null;
    if (conflicting) {
      return NextResponse.json(
        { error: 'A collection item with this slug already exists' },
        { status: 409 }
      );
    }

    const store = getStore('collections');
    const itemData = {
      ...existing,
      slug,
      title,
      markdown: markdown || '',
      image: image || '',
      date,
      updatedAt: new Date().toISOString(),
    };

    await store.set(getCollectionItemKey(collectionSlug, slug), JSON.stringify(itemData), {
      metadata: {
        slug,
        collectionSlug,
        date,
        title,
        order: itemData.order,
      },
    });

    if (slug !== originalSlug) {
      await store.delete(getCollectionItemKey(collectionSlug, originalSlug));
    }

    revalidateCollectionItemPaths(collectionSlug);

    return NextResponse.json({ success: true, data: itemData }, { status: 200 });
  } catch (error) {
    console.error('Error updating collection item:', error);
    return NextResponse.json(
      { error: 'Failed to update collection item', details: error instanceof Error ? error.message : undefined },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ collectionSlug: string }> }
) {
  try {
    const authResult = await verifyAdminAuth(request);
    if (!authResult.ok) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { collectionSlug } = await params;
    const slug = request.nextUrl.searchParams.get('slug');

    if (!slug) {
      return NextResponse.json({ error: 'Missing required slug parameter' }, { status: 400 });
    }

    const collection = await getDynamicCollectionBySlug(collectionSlug);
    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    const existing = collection.items.find((item) => item.slug === slug);
    if (!existing) {
      return NextResponse.json({ error: 'Collection item not found' }, { status: 404 });
    }

    const store = getStore('collections');
    await store.delete(getCollectionItemKey(collectionSlug, slug));
    revalidateCollectionItemPaths(collectionSlug);

    return NextResponse.json({ success: true, slug }, { status: 200 });
  } catch (error) {
    console.error('Error deleting collection item:', error);
    return NextResponse.json(
      { error: 'Failed to delete collection item', details: error instanceof Error ? error.message : undefined },
      { status: 500 }
    );
  }
}
