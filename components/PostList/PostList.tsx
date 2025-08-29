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
                  className="w-[300px] rounded-[20px_5px_20px_5px] bg-[var(--post-link-background)] m-5 shadow-[5px_5px_10px_rgb(0,0,0)] animate-[slideInFromBottom_1s_ease-in-out_0s_1,opacityIn_1s_ease-in-out_0s_1]"
                >
                  <Link
                    href={`/post/${post.slug}`}
                    className="flex flex-col align-center justify-between w-[300px]"
                  >
                    <div className="relative rounded-[20px] h-[175px]">
                      <Image
                        className="rounded-tl-[20px] rounded-tr-[5px] object-cover"
                        src={post.metadata.image}
                        alt="Picture of the author."
                        fill
                      />
                    </div>
                    <div className="flex justify-around items-center text-[var(--text-color-dark)] no-underline italic">
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
