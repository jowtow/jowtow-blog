import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import {
  deleteDynamicSeriesBySlug,
  getDynamicSeriesBySlug,
  getSeriesMetadataKey,
  listDynamicSeries,
} from '@/lib/dynamicSeries';
import { getStore } from '@netlify/blobs';
import { verifyAdminAuth } from '@/lib/serverAuth';

function revalidateSeriesPaths(slugs: string[]) {
  revalidatePath('/');

  for (const slug of slugs) {
    revalidatePath(`/series/${slug}`);
    revalidatePath(`/post/${slug}`);
  }
}

export async function GET() {
  try {
    const series = await listDynamicSeries();
    return NextResponse.json(series);
  } catch (error) {
    console.error('Error fetching series:', error);
    return NextResponse.json({ error: 'Failed to fetch series' }, { status: 500 });
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
    const { slug, name, description, date, image, individualPages } = body;

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

    const existing = await getDynamicSeriesBySlug(slug);
    if (existing) {
      return NextResponse.json(
        { error: 'A series with this slug already exists' },
        { status: 409 }
      );
    }

    const metadata = {
      slug,
      name,
      description,
      date,
      image: image || '',
      individualPages: Boolean(individualPages),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const store = getStore('series');
    await store.set(getSeriesMetadataKey(slug), JSON.stringify(metadata), {
      metadata: {
        slug,
        name,
        date,
      },
    });

    revalidateSeriesPaths([slug]);

    return NextResponse.json({ success: true, data: metadata }, { status: 201 });
  } catch (error) {
    console.error('Error creating series:', error);
    return NextResponse.json(
      { error: 'Failed to create series', details: error instanceof Error ? error.message : undefined },
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
    const { originalSlug, slug, name, description, date, image, individualPages } = body;

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

    const existing = await getDynamicSeriesBySlug(originalSlug);
    if (!existing) {
      return NextResponse.json({ error: 'Series not found' }, { status: 404 });
    }

    const conflicting = slug !== originalSlug ? await getDynamicSeriesBySlug(slug) : null;
    if (conflicting) {
      return NextResponse.json(
        { error: 'A series with this slug already exists' },
        { status: 409 }
      );
    }

    const store = getStore('series');
    const metadata = {
      ...existing.metadata,
      slug,
      name,
      description,
      date,
      image: image || '',
      individualPages: Boolean(individualPages),
      updatedAt: new Date().toISOString(),
    };

    if (slug !== originalSlug) {
      await Promise.all(
        existing.posts.map((post) =>
          store.set(
            `${slug}/posts/${post.slug}.json`,
            JSON.stringify({ ...post, seriesSlug: slug }),
            { metadata: { slug: post.slug, seriesSlug: slug, date: post.date } }
          )
        )
      );
      await deleteDynamicSeriesBySlug(originalSlug);
    }

    await store.set(getSeriesMetadataKey(slug), JSON.stringify(metadata), {
      metadata: {
        slug,
        name,
        date,
      },
    });

    revalidateSeriesPaths([originalSlug, slug]);

    return NextResponse.json({ success: true, data: metadata }, { status: 200 });
  } catch (error) {
    console.error('Error updating series:', error);
    return NextResponse.json(
      { error: 'Failed to update series', details: error instanceof Error ? error.message : undefined },
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

    const existing = await getDynamicSeriesBySlug(slug);
    if (!existing) {
      return NextResponse.json({ error: 'Series not found' }, { status: 404 });
    }

    await deleteDynamicSeriesBySlug(slug);
    revalidateSeriesPaths([slug]);

    return NextResponse.json({ success: true, slug }, { status: 200 });
  } catch (error) {
    console.error('Error deleting series:', error);
    return NextResponse.json(
      { error: 'Failed to delete series', details: error instanceof Error ? error.message : undefined },
      { status: 500 }
    );
  }
}