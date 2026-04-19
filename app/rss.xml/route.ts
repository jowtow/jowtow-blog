import { NextRequest } from "next/server";
import { getCollections } from "@/lib/collections";
import { getPosts, getSeries } from "@/lib/posts";

type FeedEntry = {
  title: string;
  description: string;
  link: string;
  date: Date;
};

function getSiteOrigin(request: NextRequest) {
  const configuredOrigin = process.env.SITE_URL || process.env.URL;
  return (configuredOrigin || request.nextUrl.origin).replace(/\/$/, "");
}

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (char) => {
    switch (char) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case '"':
        return "&quot;";
      case "'":
        return "&apos;";
      default:
        return char;
    }
  });
}

function normalizeDate(value: string | Date) {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date(0);
  }
  return parsed;
}

function summarizeMarkdown(markdown: string, limit = 400) {
  const normalized = markdown.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }
  if (normalized.length <= limit) {
    return normalized;
  }
  const truncated = normalized.slice(0, limit);
  return `${truncated.replace(/\s+\S*$/, "")}…`;
}

function buildItemXml(entry: FeedEntry) {
  const title = escapeXml(entry.title);
  const description = escapeXml(entry.description);
  const link = escapeXml(entry.link);
  const pubDate = entry.date.toUTCString();

  return [
    "<item>",
    `<title>${title}</title>`,
    `<link>${link}</link>`,
    `<guid isPermaLink="true">${link}</guid>`,
    `<pubDate>${pubDate}</pubDate>`,
    `<description>${description}</description>`,
    "</item>",
  ].join("");
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const origin = getSiteOrigin(request);
  const [posts, series, collections] = await Promise.all([
    getPosts(),
    getSeries(),
    getCollections(),
  ]);

  const entries: FeedEntry[] = [];

  for (const post of posts) {
    entries.push({
      title: post.metadata.title,
      description: summarizeMarkdown(post.markdownBody),
      link: `${origin}/post/${post.slug}`,
      date: normalizeDate(post.metadata.date),
    });
  }

  for (const seriesItem of series) {
    entries.push({
      title: seriesItem.metadata.name,
      description: seriesItem.metadata.description,
      link: `${origin}/series/${seriesItem.path}`,
      date: normalizeDate(seriesItem.metadata.date),
    });

    for (const post of seriesItem.posts) {
      const postLink = seriesItem.metadata.individualPages
        ? `${origin}/post/${seriesItem.path}/${post.slug}`
        : `${origin}/series/${seriesItem.path}`;

      entries.push({
        title: `${seriesItem.metadata.name}: ${post.metadata.title}`,
        description: summarizeMarkdown(post.markdownBody),
        link: postLink,
        date: normalizeDate(post.metadata.date),
      });
    }
  }

  for (const collection of collections) {
    entries.push({
      title: collection.metadata.name,
      description: collection.metadata.description,
      link: `${origin}/collections/${collection.path}`,
      date: normalizeDate(collection.metadata.date),
    });

    for (const item of collection.items) {
      entries.push({
        title: `${collection.metadata.name}: ${item.data.title}`,
        description: summarizeMarkdown(item.markdown),
        link: `${origin}/collections/${collection.path}`,
        date: normalizeDate(item.data.date),
      });
    }
  }

  entries.sort((a, b) => b.date.getTime() - a.date.getTime());

  const feedTitle = "jowtow.dev";
  const feedDescription = "John Townsend's personal site";
  const lastBuildDate = (entries[0]?.date ?? new Date()).toUTCString();

  const rssXml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    "<channel>",
    `<title>${escapeXml(feedTitle)}</title>`,
    `<link>${escapeXml(origin)}</link>`,
    `<description>${escapeXml(feedDescription)}</description>`,
    `<lastBuildDate>${lastBuildDate}</lastBuildDate>`,
    `<ttl>60</ttl>`,
    entries.map(buildItemXml).join(""),
    "</channel>",
    "</rss>",
  ].join("");

  return new Response(rssXml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
