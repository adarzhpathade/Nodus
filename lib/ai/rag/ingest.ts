// Ingestion pipeline: extraction → chunking → embeddings → resource_chunks (BE-4.6, BE-4.7). Owner: BE.
import "server-only";
import type { ResourceType } from "@/contracts/resources";
import { getStorage } from "@/lib/storage";
import {
  insertResourceChunks,
  updateResourceIngestion,
} from "@/lib/db/queries/resources";
import { extractDocumentText } from "./extract";
import { chunkExtractedPages } from "./chunk";
import { generateEmbeddings } from "./embed";

export interface IngestResourceParams {
  resourceId: string;
  storageKey: string;
  fileBytes?: Buffer;
  fileType: ResourceType;
}

/**
 * Runs the extraction, chunking, and embedding pipeline for an uploaded resource.
 * Updates ingestion status from "processing" to "ready" or "failed".
 */
export async function ingestResource(params: IngestResourceParams): Promise<void> {
  try {
    let buffer = params.fileBytes;
    if (!buffer) {
      const files = getStorage();
      const stored = await files.download(params.storageKey);
      buffer = Buffer.from(await stored.arrayBuffer());
    }

    // 1. Extract text per page/slide (BE-4.5)
    const extracted = await extractDocumentText(buffer, params.fileType);

    // 2. Chunk text (~500-800 tokens, small overlap, 1-based page) (BE-4.6)
    const chunks = chunkExtractedPages(extracted.pages);

    // 3. Generate Gemini embeddings via Vercel AI SDK (skips and returns null when key missing)
    const chunkTexts = chunks.map((c) => c.content);
    const embeddings = await generateEmbeddings(chunkTexts);

    // 4. Store chunks in database
    if (chunks.length > 0) {
      await insertResourceChunks(
        chunks.map((chunk, idx) => ({
          resourceId: params.resourceId,
          chunkIndex: chunk.chunkIndex,
          content: chunk.content,
          page: chunk.page,
          embedding: embeddings ? embeddings[idx] ?? null : null,
        })),
      );
    }

    // 5. Mark ingestion ready (BE-4.7)
    await updateResourceIngestion(params.resourceId, {
      status: "ready",
      pageCount: extracted.pageCount,
      error: null,
    });
  } catch (error) {
    console.error(`[nodus] ingestion failed for resource ${params.resourceId}:`, error);
    const errorMessage = error instanceof Error ? error.message : "Document ingestion failed";
    await updateResourceIngestion(params.resourceId, {
      status: "failed",
      pageCount: null,
      error: errorMessage,
    });
  }
}
