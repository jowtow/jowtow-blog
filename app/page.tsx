import PostList from "@/components/PostList/PostList";
import { getPosts } from "@/lib/posts";

export default async function Home() {
  const posts = await getPosts();
  return (
    <>
      <h1 className="text-2xl font-bold">Welcome to my blog!</h1>
      <p className="description">
        I&apos;m a not-so-ordinary guy from the southeast corner of South
        Dakota. I am on a constant journey of curiosity and learning so hop
        aboard the blog train and let&apos;s partake in some tomfoolery!
      </p>
      <main>
        <PostList posts={posts} />
      </main>
    </>
  );
}
