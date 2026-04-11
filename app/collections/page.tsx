import Link from 'next/link';
import Image from 'next/image';
import { getCollections } from '@/lib/collections';

export const dynamic = 'force-dynamic';

export default async function CollectionsPage() {
  const collections = await getCollections();

  return (
    <div>
      <h1 className="text-2xl font-bold text-center my-6 text-[var(--color-primary)]">Collections</h1>

      {collections.length === 0 ? (
        <p className="text-center text-[var(--text-light)]/60">No collections yet.</p>
      ) : (
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
                <p className="px-3 pb-2 text-sm text-[var(--text-light)]/60">
                  {collection.items.length} item{collection.items.length !== 1 ? 's' : ''}
                </p>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
