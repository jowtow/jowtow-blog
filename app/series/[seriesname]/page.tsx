import Link from "next/link";
import { getSeries, getSeriesByName } from "@/lib/posts";

type SeriesParam = {
  seriesname: string;
};
export const dynamicParams = false;
export async function generateStaticParams() {
  const series = await getSeries();

  return series.map((x) => ({ seriesname: x.path }));
}

export default async function SeriesListing({
  params,
}: {
  params: SeriesParam;
}) {
  const series = await getSeriesByName((await params).seriesname);
  return (
    <>
      <h1 className="text-center">{series.metadata.name}</h1>
      <div className="flex flex-col items-center">
        {series.posts
          .sort((a, b) => (a.metadata.date < b.metadata.date ? 1 : -1))
          .map((post) => (
            <Link
              key={post.metadata.title}
              href={`/post/${series.path}/${post.slug}`}
            >
              {post.metadata.title}
            </Link>
          ))}
      </div>
    </>
  );
}
