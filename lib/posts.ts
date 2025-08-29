import fs from "fs";
import path from "path";
import { readdir, stat } from "fs/promises";
import matter from "gray-matter";

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

export async function getPosts() {
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

  // Sort posts by date (newest first)
  const sortedPosts = posts.sort((a, b) =>
    Date.parse(a.metadata.date) < Date.parse(b.metadata.date) ? 1 : -1
  );

  return sortedPosts;
}

export async function getSeries() {
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
  const postsDirectory = path.join(process.cwd(), "posts");

  const fileNames = fs.readdirSync(postsDirectory);
  const markdownFiles = fileNames.filter((name) => name.startsWith(slug));

  console.log(slug);
  console.log(markdownFiles);
  console.log(postsDirectory);
  const fullPath = path.join(postsDirectory, markdownFiles[0]);
  const fileContents = fs.readFileSync(fullPath, "utf8");
  const document = matter(fileContents);

  return {
    metadata: document.data as PostMetadata,
    markdownBody: document.content,
    slug,
  };
}

export async function getPostBySlugAndSeries(
  postname: string,
  series: string
): Promise<Post> {
  const postsDirectory = path.join(process.cwd(), "posts", series);

  const fileNames = fs.readdirSync(postsDirectory);
  const markdownFiles = fileNames.filter((name) => name.startsWith(postname));

  const fullPath = path.join(postsDirectory, markdownFiles[0]);
  console.log(fullPath);
  const fileContents = fs.readFileSync(fullPath, "utf8");
  const document = matter(fileContents);

  return {
    metadata: document.data as PostMetadata,
    markdownBody: document.content,
    slug: postname,
  };
}

export async function getSeriesByName(slug: string): Promise<Series> {
  const metadataFile = fs.readFileSync(
    path.join(process.cwd(), "posts", slug, "metadata.json"),
    "utf8"
  );
  const metadata = seriesMetadata.parse(JSON.parse(metadataFile));
  const subdirectory = path.join(process.cwd(), "posts", slug);
  const fileNames = fs.readdirSync(subdirectory);
  const markdownFiles = fileNames.filter((name) => name.endsWith(".md"));

  const posts = markdownFiles.map((fileName) => {
    // Remove ".md" from file name to get slug
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
}
