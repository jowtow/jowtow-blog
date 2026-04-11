import PostList from "@/components/PostList/PostList";
import SeriesList from "@/components/SeriesList/SeriesList";
import { getPosts, getSeries } from "@/lib/posts";
import { getCollections } from "@/lib/collections";
import Link from "next/link";
import Image from "next/image";

export const dynamic = "force-dynamic";

export default async function Home() {
  const posts = await getPosts();
  const series = await getSeries();
  const collections = await getCollections();
  return (
    <>
      <main>
        <div className="flex flex-col items-center">
          <h2 className="text-xl font-bold mt-3 text-center border-b-[var(--secondary)] border-b-1">
            Series
          </h2>
          <SeriesList seriesList={series} />
        </div>
        {collections.length > 0 && (
          <div className="flex flex-col items-center">
            <h2 className="text-xl font-bold mt-3 text-center border-b-[var(--secondary)] border-b-1">
              Collections
            </h2>
            <div className="flex flex-wrap justify-center">
              {collections.map((collection) => (
                <div
                  key={collection.path}
                  className="w-[300px] rounded bg-[var(--post-link-background)] m-5 shadow-[5px_5px_10px_rgb(0,0,0)]"
                >
                  <Link
                    href={`/collections/${collection.path}`}
                    className="flex flex-col align-center justify-between w-[300px]"
                  >
                    <div className="relative rounded h-[175px]">
                      {collection.metadata.image ? (
                        <Image
                          className="rounded-t object-cover"
                          src={collection.metadata.image}
                          alt={collection.metadata.name}
                          fill
                          unoptimized={collection.metadata.image.startsWith('/api/images/')}
                        />
                      ) : (
                        <div className="h-full w-full rounded-t bg-[var(--color-light)] flex items-center justify-center text-[0.9rem] text-[var(--color-dark)]">
                          No cover image
                        </div>
                      )}
                    </div>
                    <div className="flex justify-around items-center no-underline italic border-t-[var(--primary)] border-t-3">
                      <span className="text-start font-bold mx-2 text-[1.2em]">
                        {collection.metadata.name}
                      </span>
                      <span className="text-[0.8rem] m-2">
                        {collection.metadata.date.toLocaleDateString()}
                      </span>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
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
