import { getStore } from '@netlify/blobs';
import * as z from 'zod';

const seriesMetadataSchema = z.object({
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  date: z.string(),
  image: z.string(),
  individualPages: z.boolean(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

const seriesPostSchema = z.object({
  seriesSlug: z.string(),
  slug: z.string(),
  title: z.string(),
  markdown: z.string(),
  image: z.string(),
  author: z.string(),
  date: z.string(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type DynamicSeriesMetadata = z.infer<typeof seriesMetadataSchema>;
export type DynamicSeriesPost = z.infer<typeof seriesPostSchema>;

const SERIES_STORE_NAME = 'series';

function getSeriesStore() {
  return getStore(SERIES_STORE_NAME);
}

export function getSeriesMetadataKey(slug: string) {
  return `${slug}/metadata.json`;
}

export function getSeriesPostKey(seriesSlug: string, postSlug: string) {
  return `${seriesSlug}/posts/${postSlug}.json`;
}

export async function listDynamicSeries() {
  const store = getSeriesStore();
  const listResult = await store.list();

  const metadataBlobs = listResult.blobs.filter((blob: { key: string }) =>
    blob.key.endsWith('/metadata.json')
  );

  const series = await Promise.all(
    metadataBlobs.map(async (blob: { key: string }) => {
      const metadataData = await store.get(blob.key);
      if (!metadataData) {
        return null;
      }

      const metadata = seriesMetadataSchema.parse(JSON.parse(metadataData as string));
      const postPrefix = `${metadata.slug}/posts/`;
      const postBlobs = listResult.blobs.filter((item: { key: string }) =>
        item.key.startsWith(postPrefix)
      );

      const posts = await Promise.all(
        postBlobs.map(async (postBlob: { key: string }) => {
          const postData = await store.get(postBlob.key);
          if (!postData) {
            return null;
          }

          return seriesPostSchema.parse(JSON.parse(postData as string));
        })
      );

      return {
        metadata,
        posts: posts.filter(Boolean) as DynamicSeriesPost[],
      };
    })
  );

  return series.filter(Boolean) as Array<{
    metadata: DynamicSeriesMetadata;
    posts: DynamicSeriesPost[];
  }>;
}

export async function getDynamicSeriesBySlug(slug: string) {
  const allSeries = await listDynamicSeries();
  return allSeries.find((series) => series.metadata.slug === slug) ?? null;
}

export async function deleteDynamicSeriesBySlug(slug: string) {
  const store = getSeriesStore();
  const listResult = await store.list();
  const keys = listResult.blobs
    .map((blob: { key: string }) => blob.key)
    .filter((key: string) => key === getSeriesMetadataKey(slug) || key.startsWith(`${slug}/posts/`));

  await Promise.all(keys.map((key: string) => store.delete(key)));
}