// app/lib/goga/pinterest-logic.ts
import type { PinContentType, PinStatus } from "@/app/lib/db/pinterest-types";

export function resolveBoard(
  contentType: PinContentType,
  categorySlug: string | null,
  boardMap: Record<string, string>,
  defaultBoardId: string | null,
): string | null {
  if (categorySlug && boardMap[`${contentType}:${categorySlug}`])
    return boardMap[`${contentType}:${categorySlug}`];
  if (boardMap[contentType]) return boardMap[contentType];
  return defaultBoardId ?? null;
}

export interface PinPayloadInput {
  contentType: PinContentType;
  slug: string;
  titleKa: string;
  titleEn: string;
  excerptKa: string;
  excerptEn: string;
  coverUrl: string;
  origin: string;
}
export interface PinPayload {
  title: string;
  description: string;
  link: string;
  image_url: string;
}

function pick(ka: string, en: string): string {
  return ka && ka.trim() ? ka : en;
}
function pathFor(contentType: PinContentType, slug: string): string {
  if (contentType === "blog") return `/blog/${slug}`;
  if (contentType === "product") return `/store/${slug}`;
  return `/#portfolio`;
}

export function buildPinPayload(input: PinPayloadInput): PinPayload {
  const title = pick(input.titleKa, input.titleEn).slice(0, 100);
  const description = pick(input.excerptKa, input.excerptEn).slice(0, 500);
  const link = `${input.origin.replace(/\/$/, "")}${pathFor(input.contentType, input.slug)}`;
  return { title, description, link, image_url: input.coverUrl };
}

export interface DueRow {
  id: string;
  status: PinStatus;
  scheduled_for: string;
}
export function dueItems<T extends DueRow>(
  rows: T[],
  now: Date,
  limit: number,
): T[] {
  return rows
    .filter(
      (r) =>
        r.status === "queued" &&
        new Date(r.scheduled_for).getTime() <= now.getTime(),
    )
    .sort(
      (a, b) =>
        new Date(a.scheduled_for).getTime() -
        new Date(b.scheduled_for).getTime(),
    )
    .slice(0, Math.max(0, limit));
}

export function needsRefresh(
  expiresAt: string | null,
  now: Date,
  skewMs = 60_000,
): boolean {
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() - skewMs <= now.getTime();
}
