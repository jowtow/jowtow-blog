import fs from "fs";
import path from "path";
import matter from "gray-matter";
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

export async function getPostBySlug(slug: string): Promise<Post> {
  const postsDirectory = path.join(process.cwd(), "posts");

  const fileNames = fs.readdirSync(postsDirectory);
  const markdownFiles = fileNames.filter((name) => name.startsWith(slug));

  const fullPath = path.join(postsDirectory, markdownFiles[0]);
  const fileContents = fs.readFileSync(fullPath, "utf8");
  const document = matter(fileContents);

  return {
    metadata: document.data as PostMetadata,
    markdownBody: document.content,
    slug,
  };
}
