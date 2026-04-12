import Image from "next/image";
import { getCollections, getCollectionBySlug } from "@/lib/collections";
import CollectionCarousel from "@/components/CollectionCarousel/CollectionCarousel";

type CollectionParam = {
  slug: string;
};

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  const collections = await getCollections();
  return collections.map((c) => ({ slug: c.path }));
}

export default async function CollectionPage({
  params,
}: {
  params: CollectionParam;
}) {
  const collection = await getCollectionBySlug((await params).slug);

  const carouselItems = collection.items
    .sort((a, b) => (a.data.date < b.data.date ? 1 : -1))
    .map((item) => ({
      title: item.data.title,
      image: item.data.image,
      markdown: item.markdown,
      slug: item.slug,
      date: item.data.date,
    }));

  return (
    <>
      <div className="relative h-64 overflow-visible flex flex-col-reverse">
        <div className="relative z-10 bg-[var(--color-dark)] mx-auto p-2 rounded-t-lg opacity-[0.8]">
          <h1 className="text-center m-[0px] text-[1.3rem] text-[var(--color-primary)] z-1">
            {collection.metadata.name}
          </h1>
          <p className="text-center m-0 italic text-[0.8rem]">
            {collection.metadata.date.toLocaleDateString()}
          </p>
        </div>
        {collection.metadata.image ? (
          <Image
            className="absolute inset-0 object-cover z-0"
            src={collection.metadata.image}
            alt={collection.metadata.name}
            fill
            unoptimized={collection.metadata.image.startsWith("/api/images/")}
          />
        ) : (
          <div className="absolute inset-0 z-0 bg-[var(--color-light)]" />
        )}
      </div>

      <CollectionCarousel items={carouselItems} />

      <div className="w-full border-t-2 border-[var(--color-primary)] mt-0 pt-4 px-2">
        {collection.metadata.description && (
          <p className="text-center text-[var(--text-light)]/70 mb-6 max-w-[60ch] mx-auto">
            {collection.metadata.description}
          </p>
        )}
      </div>
    </>
  );
}
