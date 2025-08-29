import PostList from "@/components/PostList/PostList";
import SeriesList from "@/components/SeriesList/SeriesList";
import { getPosts, getSeries } from "@/lib/posts";

export default async function Home() {
  const posts = await getPosts();
  const series = await getSeries();
  return (
    <>
      <h1 className="text-2xl font-bold ">Welcome to my blog!</h1>
      <p className="description">
        I&apos;m a not-so-ordinary guy from the southeast corner of South
        Dakota. I am on a constant journey of curiosity and learning so hop
        aboard the blog train and let&apos;s partake in some tomfoolery!
      </p>
      <main>
        <div>
          <h2 className="text-xl font-bold mt-3 text-center border-b border-[var(--color-secondary)] text-[var(--color-secondary)]">
            Series
          </h2>
          <SeriesList seriesList={series} />
        </div>
        <div>
          <h2 className="text-xl font-bold  text-center border-b border-[var(--color-secondary)] text-[var(--color-secondary)]">
            Posts
          </h2>
          <PostList posts={posts} />
        </div>
      </main>
    </>
  );
}
