import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getStore } from '@netlify/blobs';
import { verifyAdminAuth } from '@/lib/serverAuth';
import { adminMutableJsonResponse } from '@/lib/adminApi';

function revalidatePostPaths(slugs: string[]) {
  revalidatePath('/');
  revalidatePath('/posts');

  for (const slug of slugs) {
    revalidatePath(`/post/${slug}`);
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
    const { title, slug, markdown, image, author, date } = body;

    if (!title || !slug || !markdown) {
      return NextResponse.json(
        { error: 'Missing required fields: title, slug, markdown' },
        { status: 400 }
      );
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { error: 'Slug must contain only lowercase letters, numbers, and hyphens' },
        { status: 400 }
      );
    }

    const postData = {
      title,
      slug,
      markdown,
      image: image || '',
      author: author || 'Guest',
      date: date || new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    // Store in Netlify Blobs
    const store = getStore('posts');
    await store.set(`${slug}.json`, JSON.stringify(postData), {
      metadata: {
        title,
        slug,
        date: postData.date,
      },
    });

    revalidatePostPaths([slug]);

    return NextResponse.json(
      { success: true, slug, data: postData },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json(
      { error: 'Failed to create post', details: error instanceof Error ? error.message : undefined },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const store = getStore('posts');
    const listResult = await store.list();

    const posts = await Promise.all(
      listResult.blobs.map(async (blob: { key: string }) => {
        const data = await store.get(blob.key);
        return data ? JSON.parse(data as string) : null;
      })
    );

    return adminMutableJsonResponse(posts.filter(Boolean));
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
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
    const { originalSlug, title, slug, markdown, image, author, date } = body;

    if (!originalSlug || !title || !slug || !markdown) {
      return NextResponse.json(
        { error: 'Missing required fields: originalSlug, title, slug, markdown' },
        { status: 400 }
      );
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { error: 'Slug must contain only lowercase letters, numbers, and hyphens' },
        { status: 400 }
      );
    }

    const store = getStore('posts');
    const existingData = await store.get(`${originalSlug}.json`);

    if (!existingData) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    const existingPost = JSON.parse(existingData as string);

    const postData = {
      ...existingPost,
      title,
      slug,
      markdown,
      image: image || '',
      author: author || existingPost.author || 'Guest',
      date: date || existingPost.date || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await store.set(`${slug}.json`, JSON.stringify(postData), {
      metadata: {
        title,
        slug,
        date: postData.date,
      },
    });

    if (slug !== originalSlug) {
      await store.delete(`${originalSlug}.json`);
    }

    revalidatePostPaths([originalSlug, slug]);

    return NextResponse.json(
      { success: true, slug, data: postData },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating post:', error);
    return NextResponse.json(
      { error: 'Failed to update post', details: error instanceof Error ? error.message : undefined },
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
      return NextResponse.json(
        { error: 'Missing required slug parameter' },
        { status: 400 }
      );
    }

    const store = getStore('posts');
    const existingData = await store.get(`${slug}.json`);

    if (!existingData) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    await store.delete(`${slug}.json`);
    revalidatePostPaths([slug]);

    return NextResponse.json({ success: true, slug }, { status: 200 });
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json(
      { error: 'Failed to delete post', details: error instanceof Error ? error.message : undefined },
      { status: 500 }
    );
  }
}
