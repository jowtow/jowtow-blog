import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveImageMetadataWithSize } from '../lib/imageMetadata';

const createStore = (metadata: Record<string, unknown>, bufferLength: number | null) => {
  let getCalls = 0;
  const store = {
    async getMetadata(_key: string) {
      return { metadata };
    },
    async get(_key: string, _options: { type: 'arrayBuffer' }) {
      getCalls += 1;
      if (bufferLength === null) {
        throw new Error('No buffer available');
      }
      return new ArrayBuffer(bufferLength);
    },
  };

  return { store, getCalls: () => getCalls };
};

test('uses blob size when metadata is missing', async () => {
  const { store, getCalls } = createStore({}, 2048);

  const metadata = await resolveImageMetadataWithSize(store, 'image.jpg', 2048);

  assert.equal(metadata.originalSize, '2048');
  assert.equal(metadata.optimizedSize, '2048');
  assert.equal(getCalls(), 0);
});

test('falls back to blob data size when metadata is missing', async () => {
  const { store, getCalls } = createStore({}, 4096);

  const metadata = await resolveImageMetadataWithSize(store, 'image.jpg', null);

  assert.equal(metadata.originalSize, '4096');
  assert.equal(metadata.optimizedSize, '4096');
  assert.equal(getCalls(), 1);
});

test('respects existing metadata sizes', async () => {
  const { store, getCalls } = createStore({ optimizedSize: '512' }, 1024);

  const metadata = await resolveImageMetadataWithSize(store, 'image.jpg', null);

  assert.equal(metadata.originalSize, '512');
  assert.equal(metadata.optimizedSize, '512');
  assert.equal(getCalls(), 0);
});
