// Deterministic helpers for the seed: stable UUIDs, seeded randomness, dates, tiny PDFs. Owner: BE.
import { createHash } from "node:crypto";

/** Stable UUID (v5-style) from a name, so re-seeding keeps the same ids (handy for mocks and links). */
export function uid(...parts: (string | number)[]): string {
  const hash = createHash("sha1").update(`nodus:${parts.join(":")}`).digest();
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Seeded PRNG (mulberry32) so every seed run produces the same data. */
export function createRandom(seed: number) {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    chance: (probability: number) => next() < probability,
    int: (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min,
    pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)],
    between: (min: number, max: number) => min + next() * (max - min),
  };
}

export const DAY = 24 * 60 * 60 * 1000;
export const NOW = new Date();

export function daysAgo(days: number, hour = 18, minute = 0): Date {
  const date = new Date(NOW.getTime() - days * DAY);
  date.setHours(hour, minute, 0, 0);
  return date;
}

export function daysFromNow(days: number, hour = 23, minute = 59): Date {
  const date = new Date(NOW.getTime() + days * DAY);
  date.setHours(hour, minute, 0, 0);
  return date;
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export type PdfPage = { title: string; lines: string[] };

/** A minimal valid multi-page PDF — one page per entry, title + wrapped lines (Helvetica). */
export function makePdf(pages: PdfPage[]): Uint8Array {
  const escape = (text: string) => text.replace(/[\\()]/g, (c) => `\\${c}`).replace(/[^\x20-\x7e]/g, "-");
  const wrap = (text: string, width = 85) =>
    text.split(/\s+/).reduce<string[]>((rows, word) => {
      const last = rows[rows.length - 1];
      if (last !== undefined && (last + " " + word).length <= width) rows[rows.length - 1] = `${last} ${word}`;
      else rows.push(word);
      return rows;
    }, []);

  // Object layout: 1 catalog, 2 pages, 3 font, then (page, content) pairs.
  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "", // filled below once page ids are known
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  const pageIds: number[] = [];
  for (const page of pages) {
    const textOps = [
      "BT /F1 20 Tf 56 750 Td",
      `(${escape(page.title)}) Tj`,
      "/F1 12 Tf 0 -36 Td 16 TL",
      ...page.lines.flatMap((line) => wrap(line)).map((line) => `(${escape(line)}) Tj T*`),
      "ET",
    ].join("\n");
    const pageId = objects.length + 1;
    pageIds.push(pageId);
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${pageId + 1} 0 R /Resources << /Font << /F1 3 0 R >> >> >>`,
    );
    objects.push(`<< /Length ${Buffer.byteLength(textOps)} >>\nstream\n${textOps}\nendstream`);
  }
  objects[1] = `<< /Type /Pages /Kids [${pageIds.map((pageId) => `${pageId} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}
