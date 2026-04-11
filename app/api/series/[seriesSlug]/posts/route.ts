import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getStore } from '@netlify/blobs';
import {
  getDynamicSeriesBySlug,
  getSeriesPostKey,
} from '@/lib/dynamicSeries';
import { verifyAdminAuth } from '@/lib/serverAuth';

function revalidateSeriesPostPaths(seriesSlug: string, postSlugs: string[]) {
  revalidatePath('/');
  revalidatePath(`/series/${seriesSlug}`);

  for (const postSlug of postSlugs) {
    revalidatePath(`/post/${seriesSlug}/${postSlug}`);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ seriesSlug: string }> }
) {
  try {
    const authResult = await verifyAdminAuth(request);
    if (!authResult.ok) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { seriesSlug } = await params;
    const series = await getDynamicSeriesBySlug(seriesSlug);
    if (!series) {
      return NextResponse.json({ error: 'Series not found' }, { status: 404 });
    }

    const body = await request.json();
    const { slug, title, markdown, image, author, date } = body;

    if (!slug || !title || !markdown || !date) {
      return NextResponse.json(
        { error: 'Missing required fields: slug, title, markdown, date' },
        { status: 400 }
      );
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { error: 'Slug must contain only lowercase letters, numbers, and hyphens' },
        { status: 400 }
      );
    }

    const duplicate = series.posts.find((post) => post.slug === slug);
    if (duplicate) {
      return NextResponse.json(
        { error: 'A series post with this slug already exists' },
        { status: 409 }
      );
    }

    const postData = {
      seriesSlug,
      slug,
      title,
      markdown,
      image: image || '',
      author: author || 'Guest',
      date,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const store = getStore('series');
    await store.set(getSeriesPostKey(seriesSlug, slug), JSON.stringify(postData), {
      metadata: {
        slug,
        seriesSlug,
        date,
        title,
      },
    });

    revalidateSeriesPostPaths(seriesSlug, [slug]);

    return NextResponse.json({ success: true, data: postData }, { status: 201 });
  } catch (error) {
    console.error('Error creating series post:', error);
    return NextResponse.json(
      { error: 'Failed to create series post', details: error instanceof Error ? error.message : undefined },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ seriesSlug: string }> }
) {
  try {
    const authResult = await verifyAdminAuth(request);
    if (!authResult.ok) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { seriesSlug } = await params;
    const series = await getDynamicSeriesBySlug(seriesSlug);
    if (!series) {
      return NextResponse.json({ error: 'Series not found' }, { status: 404 });
    }

    const body = await request.json();
    const { originalSlug, slug, title, markdown, image, author, date } = body;

    if (!originalSlug || !slug || !title || !markdown || !date) {
      return NextResponse.json(
        { error: 'Missing required fields: originalSlug, slug, title, markdown, date' },
        { status: 400 }
      );
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { error: 'Slug must contain only lowercase letters, numbers, and hyphens' },
        { status: 400 }
      );
    }

    const existing = series.posts.find((post) => post.slug === originalSlug);
    if (!existing) {
      return NextResponse.json({ error: 'Series post not found' }, { status: 404 });
    }

    const conflicting = slug !== originalSlug ? series.posts.find((post) => post.slug === slug) : null;
    if (conflicting) {
      return NextResponse.json(
        { error: 'A series post with this slug already exists' },
        { status: 409 }
      );
    }

    const store = getStore('series');
    const postData = {
      ...existing,
      slug,
      title,
      markdown,
      image: image || '',
      author: author || existing.author || 'Guest',
      date,
      updatedAt: new Date().toISOString(),
    };

    await store.set(getSeriesPostKey(seriesSlug, slug), JSON.stringify(postData), {
      metadata: {
        slug,
        seriesSlug,
        date,
        title,
      },
    });

    if (slug !== originalSlug) {
      await store.delete(getSeriesPostKey(seriesSlug, originalSlug));
    }

    revalidateSeriesPostPaths(seriesSlug, [originalSlug, slug]);

    return NextResponse.json({ success: true, data: postData }, { status: 200 });
  } catch (error) {
    console.error('Error updating series post:', error);
    return NextResponse.json(
      { error: 'Failed to update series post', details: error instanceof Error ? error.message : undefined },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ seriesSlug: string }> }
) {
  try {
    const authResult = await verifyAdminAuth(request);
    if (!authResult.ok) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { seriesSlug } = await params;
    const slug = request.nextUrl.searchParams.get('slug');

    if (!slug) {
      return NextResponse.json({ error: 'Missing required slug parameter' }, { status: 400 });
    }

    const series = await getDynamicSeriesBySlug(seriesSlug);
    if (!series) {
      return NextResponse.json({ error: 'Series not found' }, { status: 404 });
    }

    const existing = series.posts.find((post) => post.slug === slug);
    if (!existing) {
      return NextResponse.json({ error: 'Series post not found' }, { status: 404 });
    }

    const store = getStore('series');
    await store.delete(getSeriesPostKey(seriesSlug, slug));
    revalidateSeriesPostPaths(seriesSlug, [slug]);

    return NextResponse.json({ success: true, slug }, { status: 200 });
  } catch (error) {
    console.error('Error deleting series post:', error);
    return NextResponse.json(
      { error: 'Failed to delete series post', details: error instanceof Error ? error.message : undefined },
      { status: 500 }
    );
  }
}