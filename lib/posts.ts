import fs from "fs";
import path from "path";
import { readdir, stat } from "fs/promises";
import matter from "gray-matter";
import { getStore } from "@netlify/blobs";
import { getDynamicSeriesBySlug, listDynamicSeries } from "@/lib/dynamicSeries";

import * as z from "zod";

const seriesMetadata = z.object({
  name: z.string(),
  description: z.string(),
  date: z.coerce.date(),
  image: z.string(),
  individualPages: z.boolean(),
});
type SeriesMetadata = z.infer<typeof seriesMetadata>;

export type PostMetadata = {
  title: string;
  image: string;
  author: string;
  date: string;
};

export type Post = {
  metadata: PostMetadata;
  markdownBody: string;
  slug: string;
};

export type Series = {
  metadata: SeriesMetadata;
  path: string;
  posts: Post[];
};

export const DEFAULT_DYNAMIC_POST_AUTHOR = "John Townsend";

export function normalizeDynamicPostAuthor(author: unknown): string | undefined {
  if (typeof author !== "string") {
    return undefined;
  }

  const trimmedAuthor = author.trim();
  return trimmedAuthor || undefined;
}

export async function getPosts() {
  const staticPosts = await getStaticPosts();
  const dynamicPosts = await getDynamicPosts();

  // Combine both sources of posts
  const allPosts = [...staticPosts, ...dynamicPosts];

  // Sort posts by date (newest first)
  const sortedPosts = allPosts.sort((a, b) =>
    Date.parse(a.metadata.date) < Date.parse(b.metadata.date) ? 1 : -1
  );

  return sortedPosts;
}

export async function getStaticPosts() {
  const postsDirectory = path.join(process.cwd(), "posts");

  const fileNames = fs.readdirSync(postsDirectory);
  const markdownFiles = fileNames.filter((name) => name.endsWith(".md"));

  const posts = markdownFiles.map((fileName) => {
    // Remove ".md" from file name to get slug
    const slug = fileName.slice(0, -3);

    const fullPath = path.join(postsDirectory, fileName);
    const fileContents = fs.readFileSync(fullPath, "utf8");

    const document = matter(fileContents);

    return {
      metadata: document.data as PostMetadata,
      markdownBody: document.content,
      slug,
    };
  });

  return posts;
}

export async function getDynamicPosts(): Promise<Post[]> {
  try {
    const store = getStore("posts");
    const listResult = await store.list();

    const posts = await Promise.all(
      listResult.blobs.map(async (blob: { key: string }) => {
        const data = await store.get(blob.key);
        if (!data) return null;

        const postData = JSON.parse(data as string);
        return {
          metadata: {
            title: postData.title,
            image: postData.image,
            author:
              normalizeDynamicPostAuthor(postData.author) ??
              DEFAULT_DYNAMIC_POST_AUTHOR,
            date: postData.date,
          },
          markdownBody: postData.markdown,
          slug: postData.slug,
        } as Post;
      })
    );

    return posts.filter(Boolean) as Post[];
  } catch (error) {
    // Blobs might not be available in development, return empty array
    console.warn("Could not fetch dynamic posts:", error);
    return [];
  }
}

export async function getSeries() {
  const staticSeries = await getStaticSeries();
  const dynamicSeries = await getDynamicSeries();

  const allSeries = [...staticSeries, ...dynamicSeries];

  const sortedSeries = allSeries.sort((a, b) =>
    a.metadata.date < b.metadata.date ? 1 : -1
  );

  return sortedSeries;
}

async function getStaticSeries() {
  const postsDirectory = path.join(process.cwd(), "posts");
  const subdirectories = await getSubdirectories(postsDirectory);

  const series = subdirectories.map((subdirectory) => {
    const metadataFile = fs.readFileSync(
      path.join(postsDirectory, subdirectory, "metadata.json"),
      "utf8"
    );
    const metadata = seriesMetadata.parse(JSON.parse(metadataFile));
    const fileNames = fs.readdirSync(path.join(postsDirectory, subdirectory));
    const markdownFiles = fileNames.filter((name) => name.endsWith(".md"));

    const posts = markdownFiles.map((fileName) => {
      // Remove ".md" from file name to get slug
      const slug = fileName.slice(0, -3);

      const fullPath = path.join(
        path.join(postsDirectory, subdirectory),
        fileName
      );

      const fileContents = fs.readFileSync(fullPath, "utf8");

      const document = matter(fileContents);

      return {
        metadata: document.data as PostMetadata,
        markdownBody: document.content,
        slug,
      };
    });

    return {
      metadata: metadata,
      path: subdirectory,
      posts: posts,
    } as Series;
  });

  // Sort posts by date (newest first)
  const sortedSeries = series.sort((a, b) =>
    a.metadata.date < b.metadata.date ? 1 : -1
  );

  return sortedSeries;
}

async function getDynamicSeries(): Promise<Series[]> {
  try {
    const dynamicSeries = await listDynamicSeries();

    return dynamicSeries.map((series) => ({
      metadata: {
        name: series.metadata.name,
        description: series.metadata.description,
        date: new Date(series.metadata.date),
        image: series.metadata.image,
        individualPages: series.metadata.individualPages,
      },
      path: series.metadata.slug,
      posts: series.posts.map((post) => ({
        metadata: {
          title: post.title,
          image: post.image,
          author: post.author,
          date: post.date,
        },
        markdownBody: post.markdown,
        slug: post.slug,
      })),
    }));
  } catch (error) {
    console.warn("Could not fetch dynamic series:", error);
    return [];
  }
}

async function getSubdirectories(dirPath: string) {
  try {
    const items = await readdir(dirPath);
    const subdirectories = [];

    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const statistic = await stat(fullPath);
      if (statistic.isDirectory()) {
        subdirectories.push(item);
      }
    }

    return subdirectories;
  } catch (error) {
    console.error("Error reading directory:", error);
    return [];
  }
}

export async function getPostBySlug(slug: string): Promise<Post> {
  // First try to find in static posts
  try {
    const postsDirectory = path.join(process.cwd(), "posts");
    const fileNames = fs.readdirSync(postsDirectory);
    const markdownFiles = fileNames.filter((name) => name.startsWith(slug));

    if (markdownFiles.length > 0) {
      const fullPath = path.join(postsDirectory, markdownFiles[0]);
      const fileContents = fs.readFileSync(fullPath, "utf8");
      const document = matter(fileContents);

      return {
        metadata: document.data as PostMetadata,
        markdownBody: document.content,
        slug,
      };
    }
  } catch (error) {
    console.warn(`Could not find static post with slug: ${slug}`, error);
  }

  // If not found in static posts, try Netlify Blobs
  try {
    const store = getStore("posts");
    const data = await store.get(`${slug}.json`);
    
    if (data) {
      const postData = JSON.parse(data as string);
      return {
        metadata: {
          title: postData.title,
          image: postData.image,
          author:
            normalizeDynamicPostAuthor(postData.author) ??
            DEFAULT_DYNAMIC_POST_AUTHOR,
          date: postData.date,
        },
        markdownBody: postData.markdown,
        slug: postData.slug,
      } as Post;
    }
  } catch (error) {
    console.warn(`Could not find dynamic post with slug: ${slug}`, error);
  }

  throw new Error(`Post with slug "${slug}" not found`);
}

export async function getPostBySlugAndSeries(
  postname: string,
  series: string
): Promise<Post> {
  try {
    const postsDirectory = path.join(process.cwd(), "posts", series);

    const fileNames = fs.readdirSync(postsDirectory);
    const markdownFiles = fileNames.filter((name) => name.startsWith(postname));

    if (markdownFiles.length > 0) {
      const fullPath = path.join(postsDirectory, markdownFiles[0]);
      const fileContents = fs.readFileSync(fullPath, "utf8");
      const document = matter(fileContents);

      return {
        metadata: document.data as PostMetadata,
        markdownBody: document.content,
        slug: postname,
      };
    }
  } catch (error) {
    console.warn(`Could not find static series post ${postname} in ${series}:`, error);
  }

  const dynamicSeries = await getDynamicSeriesBySlug(series);
  const dynamicPost = dynamicSeries?.posts.find((post) => post.slug === postname);

  if (dynamicPost) {
    return {
      metadata: {
        title: dynamicPost.title,
        image: dynamicPost.image,
        author: dynamicPost.author,
        date: dynamicPost.date,
      },
      markdownBody: dynamicPost.markdown,
      slug: dynamicPost.slug,
    };
  }

  throw new Error(`Series post with slug "${postname}" not found in "${series}"`);
}

export async function getSeriesByName(slug: string): Promise<Series> {
  try {
    const metadataFile = fs.readFileSync(
      path.join(process.cwd(), "posts", slug, "metadata.json"),
      "utf8"
    );
    const metadata = seriesMetadata.parse(JSON.parse(metadataFile));
    const subdirectory = path.join(process.cwd(), "posts", slug);
    const fileNames = fs.readdirSync(subdirectory);
    const markdownFiles = fileNames.filter((name) => name.endsWith(".md"));

    const posts = markdownFiles.map((fileName) => {
      const slug = fileName.slice(0, -3);
      const fullPath = path.join(subdirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, "utf8");
      const document = matter(fileContents);

      return {
        metadata: document.data as PostMetadata,
        markdownBody: document.content,
        slug,
      };
    });

    return {
      metadata: metadata,
      path: slug,
      posts: posts,
    } as Series;
  } catch (error) {
    console.warn(`Could not find static series with slug: ${slug}`, error);
  }

  const dynamicSeries = await getDynamicSeriesBySlug(slug);
  if (dynamicSeries) {
    return {
      metadata: {
        name: dynamicSeries.metadata.name,
        description: dynamicSeries.metadata.description,
        date: new Date(dynamicSeries.metadata.date),
        image: dynamicSeries.metadata.image,
        individualPages: dynamicSeries.metadata.individualPages,
      },
      path: dynamicSeries.metadata.slug,
      posts: dynamicSeries.posts.map((post) => ({
        metadata: {
          title: post.title,
          image: post.image,
          author: post.author,
          date: post.date,
        },
        markdownBody: post.markdown,
        slug: post.slug,
      })),
    } as Series;
  }

  throw new Error(`Series with slug "${slug}" not found`);
}
