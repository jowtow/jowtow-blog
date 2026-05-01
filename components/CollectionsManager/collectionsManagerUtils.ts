export type AdminCollectionMetadata = {
  slug: string;
  name: string;
  description: string;
  date: string;
  image: string;
};

export type AdminCollectionItem = {
  collectionSlug: string;
  slug: string;
  title: string;
  markdown: string;
  image: string;
  date: string;
};

export type AdminCollection = {
  metadata: AdminCollectionMetadata;
  items: AdminCollectionItem[];
};

export type ResolvedCollectionViewState = {
  selectedCollection: AdminCollection | null;
  selectedCollectionSlug: string | null;
  selectedItem: AdminCollectionItem | null;
  selectedItemSlug: string | null;
  itemDrawerOpen: boolean;
  itemPreview: boolean;
  itemSearch: string;
};

type ResolveCollectionViewStateOptions = {
  preferredCollectionSlug?: string | null;
  selectedCollectionSlug?: string | null;
  preferredItemSlug?: string | null;
  selectedItemSlug?: string | null;
  itemDrawerOpen: boolean;
  itemPreview: boolean;
  itemSearch: string;
  preserveItemSearch?: boolean;
  preserveItemDrawer?: boolean;
  preserveItemPreview?: boolean;
};

const normalizeText = (value: string) => value.toLowerCase().trim();

const parseTimestamp = (value: string) => {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const sortCollectionItems = (items: AdminCollectionItem[]) =>
  [...items].sort((left, right) => {
    const dateDifference = parseTimestamp(right.date) - parseTimestamp(left.date);

    if (dateDifference !== 0) {
      return dateDifference;
    }

    return left.title.localeCompare(right.title);
  });

export const getItemSearchText = (item: AdminCollectionItem) =>
  normalizeText([item.title, item.slug, item.date, item.markdown].join(" "));

export const resolveCollectionViewState = (
  collections: AdminCollection[],
  options: ResolveCollectionViewStateOptions,
): ResolvedCollectionViewState => {
  const nextCollectionSlug =
    options.preferredCollectionSlug !== undefined
      ? options.preferredCollectionSlug
      : options.selectedCollectionSlug ?? null;

  const selectedCollection = nextCollectionSlug
    ? collections.find((collection) => collection.metadata.slug === nextCollectionSlug) ?? null
    : null;

  if (!selectedCollection) {
    return {
      selectedCollection: null,
      selectedCollectionSlug: null,
      selectedItem: null,
      selectedItemSlug: null,
      itemDrawerOpen: false,
      itemPreview: false,
      itemSearch: "",
    };
  }

  const candidateItemSlug =
    options.preferredItemSlug !== undefined
      ? options.preferredItemSlug
      : options.preserveItemDrawer
        ? options.selectedItemSlug ?? null
        : null;
  const selectedItem = candidateItemSlug
    ? selectedCollection.items.find((item) => item.slug === candidateItemSlug) ?? null
    : null;
  const keepDrawerOpen = Boolean(options.preserveItemDrawer && options.itemDrawerOpen && selectedItem);

  return {
    selectedCollection,
    selectedCollectionSlug: selectedCollection.metadata.slug,
    selectedItem,
    selectedItemSlug: selectedItem?.slug ?? null,
    itemDrawerOpen: keepDrawerOpen,
    itemPreview: Boolean(keepDrawerOpen && options.preserveItemPreview && options.itemPreview),
    itemSearch: options.preserveItemSearch ? options.itemSearch : "",
  };
};

export const filterCollectionItems = (
  items: AdminCollectionItem[],
  query: string,
) => {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return sortCollectionItems(items);
  }

  return sortCollectionItems(items).filter((item) =>
    getItemSearchText(item).includes(normalizedQuery),
  );
};

export const getItemSummary = (markdown: string) =>
  markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/[`*_>#~-]/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
