// Text chunker for extracted document pages (~500–800 tokens, small overlap). Owner: BE.
import "server-only";
import type { ExtractedPage } from "./extract";

export interface DocumentChunk {
  chunkIndex: number;
  content: string;
  page: number;
}

const TARGET_CHUNK_CHARS = 2400; // ~600 tokens
const OVERLAP_CHARS = 300; // ~75 tokens

function splitTextIntoParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function splitParagraphIntoSentences(paragraph: string): string[] {
  return paragraph
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function chunkText(text: string): string[] {
  return chunkPageText(text);
}

function chunkPageText(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.length <= TARGET_CHUNK_CHARS) {
    return [trimmed];
  }

  const paragraphs = splitTextIntoParagraphs(trimmed);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const paragraph of paragraphs) {
    if (paragraph.length > TARGET_CHUNK_CHARS) {
      const sentences = splitParagraphIntoSentences(paragraph);
      for (const sentence of sentences) {
        if (!currentChunk) {
          currentChunk = sentence;
        } else if (currentChunk.length + sentence.length + 1 <= TARGET_CHUNK_CHARS) {
          currentChunk += " " + sentence;
        } else {
          chunks.push(currentChunk.trim());
          const overlap = currentChunk.slice(-OVERLAP_CHARS).trim();
          currentChunk = overlap ? `${overlap} ${sentence}` : sentence;
        }
      }
    } else {
      if (!currentChunk) {
        currentChunk = paragraph;
      } else if (currentChunk.length + paragraph.length + 2 <= TARGET_CHUNK_CHARS) {
        currentChunk += "\n\n" + paragraph;
      } else {
        chunks.push(currentChunk.trim());
        const overlap = currentChunk.slice(-OVERLAP_CHARS).trim();
        currentChunk = overlap ? `${overlap}\n\n${paragraph}` : paragraph;
      }
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

export function chunkExtractedPages(pages: ExtractedPage[]): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  let chunkIndex = 0;

  for (const page of pages) {
    const pageChunks = chunkPageText(page.text);
    for (const content of pageChunks) {
      chunks.push({
        chunkIndex: chunkIndex++,
        content,
        page: page.pageNumber,
      });
    }
  }

  return chunks;
}
