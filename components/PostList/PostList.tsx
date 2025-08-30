import Link from "next/link";
import Image from "next/image";
import { Post } from "@/lib/posts";

export default function PostList({ posts }: { posts: Post[] }) {
  if (posts === undefined) return null;

  return (
    <div>
      {!posts && <div>No posts!</div>}
      <div className="flex flex-wrap justify-center">
        {posts &&
          posts
            .sort((a, b) => (a.metadata.date < b.metadata.date ? 1 : -1))
            .map((post) => {
              return (
                <div
                  key={post.slug}
                  className="w-[300px] rounded bg-[var(--post-link-background)] m-5 shadow-[5px_5px_10px_rgb(0,0,0)]"
                >
                  <Link
                    href={`/post/${post.slug}`}
                    className="flex flex-col align-center justify-between w-[300px]"
                  >
                    <div className="relative h-[175px]">
                      <Image
                        className="rounded-tl rounded-tr object-cover"
                        src={post.metadata.image}
                        alt="Picture of the author."
                        fill
                      />
                    </div>
                    <div className="flex justify-around items-center no-underline italic border-t-[var(--primary)] border-t-3">
                      <span className="text-start font-bold mx-2 text-[1.2em]">
                        {post.metadata.title}
                      </span>
                      <span className="text-[0.8rem] m-2">
                        {post.metadata.date}
                      </span>
                    </div>
                  </Link>
                </div>
              );
            })}
      </div>
    </div>
  );
}
