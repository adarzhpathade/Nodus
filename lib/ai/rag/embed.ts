// Gemini embeddings via Vercel AI SDK (BE-4.6). Owner: BE.
import "server-only";
import { embedMany } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL_ID } from "@/lib/ai/config";
import { env } from "@/lib/env";

const BATCH_SIZE = 50;

/**
 * Computes embeddings for an array of text chunks using Google Gemini.
 * Model IDs only in lib/ai/config.ts per AGENTS.md §10.1.
 * Skips embeddings when GOOGLE_GENERATIVE_AI_API_KEY is missing, returning null.
 */
export async function generateEmbeddings(
  texts: string[],
): Promise<number[][] | null> {
  const apiKey = env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey || !apiKey.trim() || texts.length === 0) {
    return null;
  }

  const google = createGoogleGenerativeAI({ apiKey: apiKey.trim() });
  const model = google.textEmbeddingModel(EMBEDDING_MODEL_ID);

  const allEmbeddings: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const { embeddings } = await embedMany({
      model,
      values: batch,
      providerOptions: { google: { outputDimensionality: EMBEDDING_DIMENSIONS } },
    });
    allEmbeddings.push(...embeddings);
  }

  return allEmbeddings;
}
