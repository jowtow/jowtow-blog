import { getStore } from '@netlify/blobs';
import * as z from 'zod';

const collectionMetadataSchema = z.object({
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  date: z.string(),
  image: z.string(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

const collectionItemSchema = z.object({
  collectionSlug: z.string(),
  slug: z.string(),
  title: z.string(),
  markdown: z.string(),
  image: z.string(),
  date: z.string(),
  order: z.number().int().nonnegative().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type DynamicCollectionMetadata = z.infer<typeof collectionMetadataSchema>;
export type DynamicCollectionItem = z.infer<typeof collectionItemSchema>;

const COLLECTION_STORE_NAME = 'collections';
const MAX_ITEM_ORDER = Number.MAX_SAFE_INTEGER;

function getCollectionStore() {
  return getStore(COLLECTION_STORE_NAME);
}

function compareLegacyCollectionItems(left: DynamicCollectionItem, right: DynamicCollectionItem) {
  const leftDate = Date.parse(left.date);
  const rightDate = Date.parse(right.date);

  if (!Number.isNaN(leftDate) || !Number.isNaN(rightDate)) {
    if (Number.isNaN(leftDate)) {
      return 1;
    }

    if (Number.isNaN(rightDate)) {
      return -1;
    }

    if (leftDate !== rightDate) {
      return rightDate - leftDate;
    }
  }

  const leftCreatedAt = left.createdAt ? Date.parse(left.createdAt) : Number.NaN;
  const rightCreatedAt = right.createdAt ? Date.parse(right.createdAt) : Number.NaN;

  if (!Number.isNaN(leftCreatedAt) || !Number.isNaN(rightCreatedAt)) {
    if (Number.isNaN(leftCreatedAt)) {
      return 1;
    }

    if (Number.isNaN(rightCreatedAt)) {
      return -1;
    }

    if (leftCreatedAt !== rightCreatedAt) {
      return rightCreatedAt - leftCreatedAt;
    }
  }

  return left.slug.localeCompare(right.slug);
}

export function normalizeDynamicCollectionItems(items: DynamicCollectionItem[]) {
  const fallbackOrder = new Map(
    items
      .filter((item) => item.order === undefined)
      .slice()
      .sort(compareLegacyCollectionItems)
      .map((item, index) => [item.slug, index])
  );

  return items
    .slice()
    .sort((left, right) => {
      const leftOrder = left.order ?? fallbackOrder.get(left.slug) ?? MAX_ITEM_ORDER;
      const rightOrder = right.order ?? fallbackOrder.get(right.slug) ?? MAX_ITEM_ORDER;

      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      return compareLegacyCollectionItems(left, right);
    })
    .map((item, index) => ({
      ...item,
      order: index,
    }));
}

export function getCollectionMetadataKey(slug: string) {
  return `${slug}/metadata.json`;
}

export function getCollectionItemKey(collectionSlug: string, itemSlug: string) {
  return `${collectionSlug}/items/${itemSlug}.json`;
}

export async function listDynamicCollections() {
  const store = getCollectionStore();
  const listResult = await store.list();

  const metadataBlobs = listResult.blobs.filter((blob: { key: string }) =>
    blob.key.endsWith('/metadata.json')
  );

  const collections = await Promise.all(
    metadataBlobs.map(async (blob: { key: string }) => {
      const metadataData = await store.get(blob.key);
      if (!metadataData) {
        return null;
      }

      const metadata = collectionMetadataSchema.parse(JSON.parse(metadataData as string));
      const itemPrefix = `${metadata.slug}/items/`;
      const itemBlobs = listResult.blobs.filter((item: { key: string }) =>
        item.key.startsWith(itemPrefix)
      );

      const items = await Promise.all(
        itemBlobs.map(async (itemBlob: { key: string }) => {
          const itemData = await store.get(itemBlob.key);
          if (!itemData) {
            return null;
          }

          return collectionItemSchema.parse(JSON.parse(itemData as string));
        })
      );

      return {
        metadata,
        items: normalizeDynamicCollectionItems(items.filter(Boolean) as DynamicCollectionItem[]),
      };
    })
  );

  return collections.filter(Boolean) as Array<{
    metadata: DynamicCollectionMetadata;
    items: DynamicCollectionItem[];
  }>;
}

export async function getDynamicCollectionBySlug(slug: string) {
  const allCollections = await listDynamicCollections();
  return allCollections.find((collection) => collection.metadata.slug === slug) ?? null;
}

export async function deleteDynamicCollectionBySlug(slug: string) {
  const store = getCollectionStore();
  const listResult = await store.list();
  const keys = listResult.blobs
    .map((blob: { key: string }) => blob.key)
    .filter((key: string) => key === getCollectionMetadataKey(slug) || key.startsWith(`${slug}/items/`));

  await Promise.all(keys.map((key: string) => store.delete(key)));
}
