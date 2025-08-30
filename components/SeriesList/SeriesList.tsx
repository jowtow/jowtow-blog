import Link from "next/link";
import Image from "next/image";
import { Series } from "@/lib/posts";

export default function SeriesList({ seriesList }: { seriesList: Series[] }) {
  if (seriesList === undefined) return null;

  return (
    <div>
      {!seriesList && <div>No series!</div>}
      <div className="flex flex-wrap justify-center">
        {seriesList &&
          seriesList.map((series) => {
            return (
              <div
                key={series.metadata.name}
                className="w-[300px] rounded bg-[var(--post-link-background)] m-5 shadow-[5px_5px_10px_rgb(0,0,0)]"
              >
                <Link
                  href={`/series/${series.path}`}
                  className="flex flex-col align-center justify-between w-[300px]"
                >
                  <div className="relative rounded h-[175px]">
                    <Image
                      className="rounded-t object-cover"
                      src={series.metadata.image}
                      alt="Picture of the author."
                      fill
                    />
                  </div>
                  <div className="flex justify-around items-center no-underline italic  border-t-[var(--primary)] border-t-3">
                    <span className="text-start font-bold mx-2 text-[1.2em]">
                      {series.metadata.name}
                    </span>
                    <span className="text-[0.8rem] m-2">
                      {series.metadata.date.toLocaleDateString()}
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
