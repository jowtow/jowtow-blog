import PostList from "@/components/PostList/PostList";
import { getPosts } from "@/lib/posts";

export const dynamic = "force-dynamic";

export default async function Page() {
  const posts = await getPosts();
  return (
    <>
      <main>
        <PostList posts={posts} />
      </main>
    </>
  );
}
