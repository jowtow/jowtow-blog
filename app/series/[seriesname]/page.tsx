import Link from "next/link";
import { getSeries, getSeriesByName } from "@/lib/posts";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Image from "next/image";
type SeriesParam = {
  seriesname: string;
};
export const dynamic = 'force-dynamic';
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
      <div className="relative h-64 overflow-hidden flex flex-col-reverse ">
        <div className="relative z-10 bg-[var(--color-dark)] mx-auto p-2 rounded-t-lg opacity-[0.8]">
          <h1 className="text-center m-[0px] text-[1.3rem] text-[var(--color-primary)] z-1">
            {series.metadata.name}
          </h1>
          <p className="text-center m-0 italic text-[0.8rem]">
            started on {series.metadata.date.toLocaleDateString()}
          </p>
        </div>
        {series.metadata.image ? (
          <Image
            className="absolute inset-0 object-cover z-0"
            src={series.metadata.image}
            alt={series.metadata.name}
            fill
            unoptimized={series.metadata.image.startsWith('/api/images/')}
          />
        ) : (
          <div className="absolute inset-0 z-0 bg-[var(--color-light)]" />
        )}
      </div>
      <div className="w-full flex flex-col items-center border-t-2 border-[var(--color-primary)] m-3 p-2">
        {/* <h1 className="text-center">{series.metadata.name}</h1> */}
        {series.metadata.individualPages && (
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
        )}
        {!series.metadata.individualPages && (
          <div className="flex flex-col items-center sm:px-10 max-w-[70ch] jowtowarticle  ">
            {series.posts
              .sort((a, b) => (a.metadata.date < b.metadata.date ? 1 : -1))
              .map((post) => (
                <div
                  key={post.slug}
                  className="w-full my-5 flex flex-col items-center text-center"
                >
                  <span className="text-l border-[var(--color-primary)] border-b">
                    {post.metadata.date}
                  </span>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {post.markdownBody}
                  </ReactMarkdown>
                </div>
              ))}
          </div>
        )}
      </div>
    </>
  );
}
