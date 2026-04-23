export type ImageMetadata = Record<string, unknown>;

export type ImageMetadataStore = {
  getMetadata: (key: string) => Promise<{ metadata: ImageMetadata } | null>;
  get: (key: string, options: { type: 'arrayBuffer' }) => Promise<ArrayBuffer>;
};

export const parseNumber = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'bigint') {
    if (value < BigInt(0)) {
      return null;
    }
    const maxSafe = BigInt(Number.MAX_SAFE_INTEGER);
    if (value > maxSafe) {
      return null;
    }
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const applyResolvedSize = (metadata: ImageMetadata, size: number): ImageMetadata => ({
  ...metadata,
  optimizedSize:
    metadata.optimizedSize == null || metadata.optimizedSize === ''
      ? size.toString()
      : metadata.optimizedSize,
  originalSize:
    metadata.originalSize == null || metadata.originalSize === ''
      ? size.toString()
      : metadata.originalSize,
});

export async function resolveImageMetadataWithSize(
  store: ImageMetadataStore,
  key: string,
  blobSize?: number | null,
  logger: Pick<Console, 'error'> = console
): Promise<ImageMetadata> {
  let metadataResult: { metadata: ImageMetadata } | null = null;

  try {
    metadataResult = await store.getMetadata(key);
  } catch (error) {
    logger.error(`Error loading metadata for image ${key}:`, error);
  }

  const metadata: ImageMetadata = { ...(metadataResult?.metadata ?? {}) };
  let resolvedSize =
    parseNumber(metadata.optimizedSize) ??
    parseNumber(metadata.originalSize) ??
    parseNumber(blobSize);

  if (resolvedSize === null) {
    try {
      const data = await store.get(key, { type: 'arrayBuffer' });
      resolvedSize = data.byteLength;
    } catch (error) {
      logger.error(`Error loading data for image ${key}:`, error);
    }
  }

  if (resolvedSize !== null) {
    return applyResolvedSize(metadata, resolvedSize);
  }

  return metadata;
}
