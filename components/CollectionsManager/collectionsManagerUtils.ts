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
