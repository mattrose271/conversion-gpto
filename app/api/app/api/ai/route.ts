import { NextResponse } from "next/server";
import { z } from "zod";
import * as cheerio from "cheerio";
import { XMLParser } from "fast-xml-parser";

export const runtime = "nodejs";

const Body = z.object({ url: z.string().url() });

function toGrade(score: number) {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 50) return "C";
  return "D";
}

function containsAIText(text: string) {
  const t = text.toLowerCase();
  return (
    t.includes("artificial intelligence") ||
    t.includes("machine learning") ||
    t.includes("automation") ||
    t.includes("ai ")
  );
}

async function fetchText(url: string, timeoutMs = 12000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "GPTO-AuditBot/0.1" }
    });
    const text = await res.text();
    return { status: res.status, text };
  } finally {
    clearTimeout(t);
  }
}

async function getSitemapUrls(origin: string, maxPages: number) {
  try {
    const { status, text } = await fetchText(`${origin}/sitemap.xml`);
    if (status >= 400) return null;

    con
