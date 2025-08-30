import PostList from "@/components/PostList/PostList";
import SeriesList from "@/components/SeriesList/SeriesList";
import { getPosts, getSeries } from "@/lib/posts";

export default async function Home() {
  const posts = await getPosts();
  const series = await getSeries();
  return (
    <>
      <main>
        <div className="flex flex-col items-center">
          <h2 className="text-xl font-bold mt-3 text-center border-b-[var(--secondary)] border-b-1">
            Series
          </h2>
          <SeriesList seriesList={series} />
        </div>
        <div className="flex flex-col items-center">
          <h2 className="text-xl font-bold text-center border-b-[var(--secondary)] border-b-1 inline">
            Posts
          </h2>
          <PostList posts={posts} />
        </div>
      </main>
    </>
  );
}
