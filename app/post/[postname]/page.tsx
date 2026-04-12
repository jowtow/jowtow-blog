import Link from "next/link";
import { getPosts, getPostBySlug } from "@/lib/posts";
import { Post } from "@/lib/posts";
import Author from "../../../components/Author/Author";
import MarkdownRenderer from "@/components/MarkdownRenderer/MarkdownRenderer";
import styles from "./page.module.css";
import Image from "next/image";

type PostParam = {
  postname: string;
};

// This replaces getStaticPaths
export async function generateStaticParams() {
  const posts = await getPosts();

  const postSlugs = posts.map((post: Post) => ({
    postname: post.slug, // Return the dynamic segment directly
  }));

  return postSlugs;
}

export default async function BlogPost({ params }: { params: PostParam }) {
  const post = await getPostBySlug((await params).postname);

  return (
    <>
      <div className="relative h-64 overflow-hidden flex flex-col-reverse">
        <div className="relative z-10 bg-[var(--color-dark)] mx-auto p-2 rounded-t-lg opacity-[0.8]">
          <h1 className="text-center m-[0px] text-[1.3rem] text-[var(--color-primary)] z-1">
            {post.metadata.title}
          </h1>
          <p className="text-center text-[var(--color-secondary)] m-0">
            by {post.metadata.author}
          </p>
          <p className="text-center m-0 italic text-[0.8rem]">
            {post.metadata.date}
          </p>
        </div>
        {post.metadata.image ? (
          <Image
            className="absolute inset-0 object-cover z-0"
            src={post.metadata.image}
            alt={post.metadata.title}
            fill
            priority
            unoptimized={post.metadata.image.startsWith("/api/images/")}
          />
        ) : (
          <div className="absolute inset-0 z-0 bg-[var(--color-light)]" />
        )}
      </div>
      <article
        className={`${styles.jowtowarticle} m-3 p-2 flex flex-col border-t-2 border-[var(--color-primary)]`}
      >
        <div className="p-[0px 5vw] flex flex-col">
          <MarkdownRenderer content={post.markdownBody} />
        </div>
      </article>
      <Author></Author>
      <Link href="/" className="underline">
        ←_← more posts!
      </Link>
    </>
  );
}
