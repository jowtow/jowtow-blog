import type sharp from 'sharp';

export type SharpFactory = typeof sharp;

type SharpCache =
  | { status: 'unloaded' }
  | { status: 'failed'; message?: string }
  | { status: 'loaded'; factory: SharpFactory };

let sharpCache: SharpCache = { status: 'unloaded' };

export async function getSharp(): Promise<SharpFactory> {
  if (sharpCache.status === 'loaded') {
    return sharpCache.factory;
  }
  if (sharpCache.status === 'failed') {
    throw new Error(
      sharpCache.message ?? 'Sharp is not available in this deployment.'
    );
  }

  try {
    const sharpImport = await import('sharp');
    const resolvedSharp =
      typeof sharpImport === 'function'
        ? sharpImport
        : (sharpImport as { default?: unknown }).default;
    if (typeof resolvedSharp !== 'function') {
      throw new Error('Sharp import returned no callable export.');
    }

    sharpCache = { status: 'loaded', factory: resolvedSharp as SharpFactory };
    return sharpCache.factory;
  } catch (error) {
    console.error('Failed to load sharp:', error);
    const message =
      error instanceof Error
        ? error.message
        : 'Sharp is not available in this deployment.';
    sharpCache = { status: 'failed', message };
    throw new Error(message);
  }
}
