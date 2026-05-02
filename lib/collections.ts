import { listDynamicCollections, getDynamicCollectionBySlug } from '@/lib/dynamicCollections';

import * as z from 'zod';

const collectionMetadata = z.object({
  name: z.string(),
  description: z.string(),
  date: z.coerce.date(),
  image: z.string(),
});
type CollectionMetadata = z.infer<typeof collectionMetadata>;

export type CollectionItemData = {
  title: string;
  image: string;
  date: string;
  order: number;
};

export type CollectionItem = {
  data: CollectionItemData;
  markdown: string;
  slug: string;
};

export type Collection = {
  metadata: CollectionMetadata;
  path: string;
  items: CollectionItem[];
};

export async function getCollections(): Promise<Collection[]> {
  try {
    const dynamicCollections = await listDynamicCollections();

    const collections = dynamicCollections.map((collection) => ({
      metadata: {
        name: collection.metadata.name,
        description: collection.metadata.description,
        date: new Date(collection.metadata.date),
        image: collection.metadata.image,
      },
      path: collection.metadata.slug,
      items: collection.items.map((item) => ({
        data: {
          title: item.title,
          image: item.image,
          date: item.date,
          order: item.order ?? 0,
        },
        markdown: item.markdown,
        slug: item.slug,
      })),
    }));

    const sortedCollections = collections.sort((a, b) =>
      a.metadata.date < b.metadata.date ? 1 : -1
    );

    return sortedCollections;
  } catch (error) {
    console.warn('Could not fetch collections:', error);
    return [];
  }
}

export async function getCollectionBySlug(slug: string): Promise<Collection> {
  const dynamicCollection = await getDynamicCollectionBySlug(slug);
  if (dynamicCollection) {
    return {
      metadata: {
        name: dynamicCollection.metadata.name,
        description: dynamicCollection.metadata.description,
        date: new Date(dynamicCollection.metadata.date),
        image: dynamicCollection.metadata.image,
      },
      path: dynamicCollection.metadata.slug,
      items: dynamicCollection.items.map((item) => ({
        data: {
          title: item.title,
          image: item.image,
          date: item.date,
          order: item.order ?? 0,
        },
        markdown: item.markdown,
        slug: item.slug,
      })),
    };
  }

  throw new Error(`Collection with slug "${slug}" not found`);
}
