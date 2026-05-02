import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getStore } from '@netlify/blobs';
import { getCollectionItemKey, getDynamicCollectionBySlug } from '@/lib/dynamicCollections';
import { verifyAdminAuth } from '@/lib/serverAuth';

function revalidateCollectionItemPaths(collectionSlug: string) {
  revalidatePath('/');
  revalidatePath('/collections');
  revalidatePath(`/collections/${collectionSlug}`);
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

    const body = (await request.json()) as { slugs?: string[] };
    const slugs = body.slugs;

    if (!Array.isArray(slugs) || slugs.length === 0) {
      return NextResponse.json({ error: 'A non-empty slugs array is required' }, { status: 400 });
    }

    const uniqueSlugs = new Set(slugs);
    if (uniqueSlugs.size !== slugs.length) {
      return NextResponse.json({ error: 'Slugs array must not contain duplicates' }, { status: 400 });
    }

    if (slugs.length !== collection.items.length) {
      return NextResponse.json(
        { error: 'Reorder payload must include every item in the collection exactly once' },
        { status: 400 }
      );
    }

    const itemsBySlug = new Map(collection.items.map((item) => [item.slug, item]));
    if (slugs.some((slug) => !itemsBySlug.has(slug))) {
      return NextResponse.json(
        { error: 'Reorder payload contains an unknown item slug' },
        { status: 400 }
      );
    }

    const store = getStore('collections');
    const updatedAt = new Date().toISOString();
    const orderedItems = slugs.map((slug, index) => ({
      ...itemsBySlug.get(slug)!,
      order: index,
      updatedAt,
    }));

    await Promise.all(
      orderedItems.map((item) =>
        store.set(getCollectionItemKey(collectionSlug, item.slug), JSON.stringify(item), {
          metadata: {
            slug: item.slug,
            collectionSlug,
            date: item.date,
            title: item.title,
            order: item.order,
          },
        })
      )
    );

    revalidateCollectionItemPaths(collectionSlug);

    return NextResponse.json({ success: true, data: orderedItems }, { status: 200 });
  } catch (error) {
    console.error('Error reordering collection items:', error);
    return NextResponse.json(
      { error: 'Failed to reorder collection items', details: error instanceof Error ? error.message : undefined },
      { status: 500 }
    );
  }
}
