import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import {
  deleteDynamicCollectionBySlug,
  getDynamicCollectionBySlug,
  getCollectionMetadataKey,
  listDynamicCollections,
} from '@/lib/dynamicCollections';
import { getStore } from '@netlify/blobs';
import { verifyAdminAuth } from '@/lib/serverAuth';

function revalidateCollectionPaths(slugs: string[]) {
  revalidatePath('/');
  revalidatePath('/collections');

  for (const slug of slugs) {
    revalidatePath(`/collections/${slug}`);
  }
}

export async function GET() {
  try {
    const collections = await listDynamicCollections();
    return NextResponse.json(collections);
  } catch (error) {
    console.error('Error fetching collections:', error);
    return NextResponse.json({ error: 'Failed to fetch collections' }, { status: 500 });
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

    const body = await request.json();
    const { slug, name, description, date, image } = body;

    if (!slug || !name || !description || !date) {
      return NextResponse.json(
        { error: 'Missing required fields: slug, name, description, date' },
        { status: 400 }
      );
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { error: 'Slug must contain only lowercase letters, numbers, and hyphens' },
        { status: 400 }
      );
    }

    const existing = await getDynamicCollectionBySlug(slug);
    if (existing) {
      return NextResponse.json(
        { error: 'A collection with this slug already exists' },
        { status: 409 }
      );
    }

    const metadata = {
      slug,
      name,
      description,
      date,
      image: image || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const store = getStore('collections');
    await store.set(getCollectionMetadataKey(slug), JSON.stringify(metadata), {
      metadata: {
        slug,
        name,
        date,
      },
    });

    revalidateCollectionPaths([slug]);

    return NextResponse.json({ success: true, data: metadata }, { status: 201 });
  } catch (error) {
    console.error('Error creating collection:', error);
    return NextResponse.json(
      { error: 'Failed to create collection', details: error instanceof Error ? error.message : undefined },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyAdminAuth(request);
    if (!authResult.ok) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const body = await request.json();
    const { originalSlug, slug, name, description, date, image } = body;

    if (!originalSlug || !slug || !name || !description || !date) {
      return NextResponse.json(
        { error: 'Missing required fields: originalSlug, slug, name, description, date' },
        { status: 400 }
      );
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { error: 'Slug must contain only lowercase letters, numbers, and hyphens' },
        { status: 400 }
      );
    }

    const existing = await getDynamicCollectionBySlug(originalSlug);
    if (!existing) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    const conflicting = slug !== originalSlug ? await getDynamicCollectionBySlug(slug) : null;
    if (conflicting) {
      return NextResponse.json(
        { error: 'A collection with this slug already exists' },
        { status: 409 }
      );
    }

    const store = getStore('collections');
    const metadata = {
      ...existing.metadata,
      slug,
      name,
      description,
      date,
      image: image || '',
      updatedAt: new Date().toISOString(),
    };

    if (slug !== originalSlug) {
      await Promise.all(
        existing.items.map((item) =>
          store.set(
            `${slug}/items/${item.slug}.json`,
            JSON.stringify({ ...item, collectionSlug: slug }),
            { metadata: { slug: item.slug, collectionSlug: slug, date: item.date } }
          )
        )
      );
      await deleteDynamicCollectionBySlug(originalSlug);
    }

    await store.set(getCollectionMetadataKey(slug), JSON.stringify(metadata), {
      metadata: {
        slug,
        name,
        date,
      },
    });

    revalidateCollectionPaths([originalSlug, slug]);

    return NextResponse.json({ success: true, data: metadata }, { status: 200 });
  } catch (error) {
    console.error('Error updating collection:', error);
    return NextResponse.json(
      { error: 'Failed to update collection', details: error instanceof Error ? error.message : undefined },
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

    const slug = request.nextUrl.searchParams.get('slug');

    if (!slug) {
      return NextResponse.json({ error: 'Missing required slug parameter' }, { status: 400 });
    }

    const existing = await getDynamicCollectionBySlug(slug);
    if (!existing) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    await deleteDynamicCollectionBySlug(slug);
    revalidateCollectionPaths([slug]);

    return NextResponse.json({ success: true, slug }, { status: 200 });
  } catch (error) {
    console.error('Error deleting collection:', error);
    return NextResponse.json(
      { error: 'Failed to delete collection', details: error instanceof Error ? error.message : undefined },
      { status: 500 }
    );
  }
}
