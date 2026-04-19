import { NextRequest } from "next/server";
import { getCollections } from "@/lib/collections";
import { getPosts, getSeries } from "@/lib/posts";

type FeedEntry = {
  title: string;
  description: string;
  link: string;
  date: Date;
};

const DEFAULT_FEED_TITLE = "jowtow.dev";
const DEFAULT_FEED_DESCRIPTION = "John Townsend's personal site";
const DEFAULT_TTL_MINUTES = 60;
const DEFAULT_SUMMARY_LENGTH = 400;

function getSiteOrigin(request: NextRequest) {
  const configuredOrigin = process.env.SITE_URL || process.env.URL;
  return (configuredOrigin || request.nextUrl.origin).replace(/\/$/, "");
}

function getFeedTitle() {
  return process.env.SITE_TITLE || DEFAULT_FEED_TITLE;
}

function getFeedDescription() {
  return process.env.SITE_DESCRIPTION || DEFAULT_FEED_DESCRIPTION;
}

function getTtlMinutes() {
  const rawValue = process.env.RSS_TTL_MINUTES ?? "";
  const parsed = Number.parseInt(rawValue, 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return DEFAULT_TTL_MINUTES;
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
    return new Date();
  }
  return parsed;
}

function stripMarkdown(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/^>+\s?/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/[#*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function summarizeMarkdown(markdown: string, limit = DEFAULT_SUMMARY_LENGTH) {
  const normalized = stripMarkdown(markdown);
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
      const itemLink = `${origin}/collections/${collection.path}?item=${encodeURIComponent(item.slug)}`;
      entries.push({
        title: `${collection.metadata.name}: ${item.data.title}`,
        description: summarizeMarkdown(item.markdown),
        link: itemLink,
        date: normalizeDate(item.data.date),
      });
    }
  }

  entries.sort((a, b) => b.date.getTime() - a.date.getTime());

  const feedTitle = getFeedTitle();
  const feedDescription = getFeedDescription();
  const lastBuildDate =
    entries.length > 0 ? entries[0].date.toUTCString() : null;
  const ttlMinutes = getTtlMinutes();

  const rssXml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    "<channel>",
    `<title>${escapeXml(feedTitle)}</title>`,
    `<link>${escapeXml(origin)}</link>`,
    `<description>${escapeXml(feedDescription)}</description>`,
    lastBuildDate ? `<lastBuildDate>${lastBuildDate}</lastBuildDate>` : "",
    `<ttl>${ttlMinutes}</ttl>`,
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
