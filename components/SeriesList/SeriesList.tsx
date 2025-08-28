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
                className="w-[300px] rounded-[20px_5px_20px_5px] bg-[var(--post-link-background)] m-5 shadow-[5px_5px_10px_rgb(0,0,0)] animate-[slideInFromBottom_1s_ease-in-out_0s_1,opacityIn_1s_ease-in-out_0s_1]"
              >
                <Link
                  href={`/series/${series.path}`}
                  className="flex flex-col align-center justify-between w-[300px]"
                >
                  <div className="relative rounded-[20px] h-[175px]">
                    <Image
                      className="rounded-tl-[20px] rounded-tr-[5px] object-cover"
                      src={series.metadata.image}
                      alt="Picture of the author."
                      fill
                    />
                  </div>
                  <div className="flex justify-around items-center text-[var(--text-color-dark)] no-underline italic">
                    <span className="text-start font-bold m-[10px] text-[1.2em]">
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
