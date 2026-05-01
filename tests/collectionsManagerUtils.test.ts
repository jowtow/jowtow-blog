import assert from 'node:assert/strict';
import test from 'node:test';
import {
  filterCollectionItems,
  getItemSummary,
  resolveCollectionViewState,
  sortCollectionItems,
  type AdminCollection,
  type AdminCollectionItem,
} from '../components/CollectionsManager/collectionsManagerUtils';

const items: AdminCollectionItem[] = [
  {
    collectionSlug: 'records',
    slug: 'deep-cut',
    title: 'Deep Cut',
    markdown: 'A hidden favorite with layered **notes**.',
    image: '/images/deep-cut.jpg',
    date: '2024-01-10',
  },
  {
    collectionSlug: 'records',
    slug: 'anthem',
    title: 'Anthem',
    markdown: 'The loud opener.',
    image: '/images/anthem.jpg',
    date: '2025-02-01',
  },
  {
    collectionSlug: 'records',
    slug: 'closer',
    title: 'Closer',
    markdown: 'Finale with ![cover](/cover.jpg) [liner notes](/notes).',
    image: '',
    date: '2025-02-01',
  },
];

const collections: AdminCollection[] = [
  {
    metadata: {
      slug: 'records',
      name: 'Records',
      description: 'Main collection',
      date: '2025-02-01',
      image: '/images/records.jpg',
    },
    items,
  },
  {
    metadata: {
      slug: 'mixtapes',
      name: 'Mixtapes',
      description: 'Secondary collection',
      date: '2025-01-01',
      image: '/images/mixtapes.jpg',
    },
    items: [
      {
        collectionSlug: 'mixtapes',
        slug: 'demo',
        title: 'Demo',
        markdown: 'Rough cut.',
        image: '',
        date: '2024-05-01',
      },
    ],
  },
];

test('sortCollectionItems orders by newest date and then title', () => {
  const sorted = sortCollectionItems(items);

  assert.deepEqual(
    sorted.map((item) => item.slug),
    ['anthem', 'closer', 'deep-cut'],
  );
});

test('filterCollectionItems matches title, slug, and markdown content', () => {
  assert.deepEqual(
    filterCollectionItems(items, 'favorite').map((item) => item.slug),
    ['deep-cut'],
  );
  assert.deepEqual(
    filterCollectionItems(items, 'closer').map((item) => item.slug),
    ['closer'],
  );
  assert.deepEqual(
    filterCollectionItems(items, '').map((item) => item.slug),
    ['anthem', 'closer', 'deep-cut'],
  );
});

test('getItemSummary strips markdown formatting and image syntax', () => {
  assert.equal(
    getItemSummary('Finale with ![cover](/cover.jpg) [liner notes](/notes).'),
    'Finale with liner notes.',
  );
});

test('resolveCollectionViewState preserves item drawer context after a save refresh', () => {
  const refreshedCollections: AdminCollection[] = [
    {
      ...collections[0],
      items: collections[0].items.map((item) =>
        item.slug === 'anthem'
          ? {
              ...item,
              slug: 'anthem-remix',
              title: 'Anthem Remix',
            }
          : item,
      ),
    },
    collections[1],
  ];

  const result = resolveCollectionViewState(refreshedCollections, {
    preferredCollectionSlug: 'records',
    preferredItemSlug: 'anthem-remix',
    selectedCollectionSlug: 'records',
    selectedItemSlug: 'anthem',
    itemDrawerOpen: true,
    itemPreview: true,
    itemSearch: 'anthem',
    preserveItemSearch: true,
    preserveItemDrawer: true,
    preserveItemPreview: true,
  });

  assert.equal(result.selectedCollectionSlug, 'records');
  assert.equal(result.selectedItemSlug, 'anthem-remix');
  assert.equal(result.selectedItem?.title, 'Anthem Remix');
  assert.equal(result.itemDrawerOpen, true);
  assert.equal(result.itemPreview, true);
  assert.equal(result.itemSearch, 'anthem');
});

test('resolveCollectionViewState preserves search but closes the drawer after delete refresh', () => {
  const refreshedCollections: AdminCollection[] = [
    {
      ...collections[0],
      items: collections[0].items.filter((item) => item.slug !== 'anthem'),
    },
    collections[1],
  ];

  const result = resolveCollectionViewState(refreshedCollections, {
    preferredCollectionSlug: 'records',
    selectedCollectionSlug: 'records',
    selectedItemSlug: 'anthem',
    itemDrawerOpen: true,
    itemPreview: true,
    itemSearch: 'anthem',
    preserveItemSearch: true,
  });

  assert.equal(result.selectedCollectionSlug, 'records');
  assert.equal(result.selectedItemSlug, null);
  assert.equal(result.selectedItem, null);
  assert.equal(result.itemDrawerOpen, false);
  assert.equal(result.itemPreview, false);
  assert.equal(result.itemSearch, 'anthem');
});

test('resolveCollectionViewState resets item context when switching collections', () => {
  const result = resolveCollectionViewState(collections, {
    preferredCollectionSlug: 'mixtapes',
    selectedCollectionSlug: 'records',
    selectedItemSlug: 'anthem',
    itemDrawerOpen: true,
    itemPreview: true,
    itemSearch: 'anthem',
  });

  assert.equal(result.selectedCollectionSlug, 'mixtapes');
  assert.equal(result.selectedItemSlug, null);
  assert.equal(result.itemDrawerOpen, false);
  assert.equal(result.itemPreview, false);
  assert.equal(result.itemSearch, '');
});
