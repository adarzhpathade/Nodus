// AI configuration — the single place for providers, models and dimensions (AGENTS.md §10.1). Owner: BE.
// Plain module (no "server-only") because the DB schema imports EMBEDDING_DIMENSIONS and runs in drizzle-kit too.
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { GatewayError } from "@/contracts/common";

/**
 * Embedding vector size for resource_chunks / note_chunks (pgvector).
 * Gemini embeddings are requested with this output dimensionality; changing it needs a migration + re-embed.
 */
export const EMBEDDING_DIMENSIONS = 768;

/**
 * Gemini embedding model ID (used via @ai-sdk/google).
 * Model IDs only in lib/ai/config.ts per AGENTS.md §10.1.
 */
export const EMBEDDING_MODEL_ID = "text-embedding-004";

/**
 * Primary chat model ID (Gemini 2.0 Flash via @ai-sdk/google).
 */
export const CHAT_MODEL_ID = "gemini-2.0-flash";

/**
 * Optional fallback chat model ID (Groq Llama 3.3 70B via @ai-sdk/groq).
 */
export const GROQ_CHAT_MODEL_ID = "llama-3.3-70b-versatile";

/**
 * Maximum cosine distance to be considered "covered".
 * Cosine distance = 1 - cosine similarity.
 * < 0.42 indicates strong relevance.
 */
export const NOT_COVERED_DISTANCE_THRESHOLD = 0.42;

/**
 * Resolves the chat model to use.
 * Prefers Google Gemini (GOOGLE_GENERATIVE_AI_API_KEY).
 * Falls back to Groq (GROQ_API_KEY) if Gemini key is absent.
 * Throws GatewayError("AI_UNAVAILABLE") if no provider is configured.
 */
export function getChatModel() {
  const googleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
  if (googleKey) {
    const google = createGoogleGenerativeAI({ apiKey: googleKey });
    return google(CHAT_MODEL_ID);
  }

  const groqKey = process.env.GROQ_API_KEY?.trim();
  if (groqKey) {
    const groq = createGroq({ apiKey: groqKey });
    return groq(GROQ_CHAT_MODEL_ID);
  }

  throw new GatewayError("AI_UNAVAILABLE", "AI service is not configured (missing API keys).");
}

/**
 * Resolves the embedding model. Embeddings only supported via Gemini.
 */
export function getEmbeddingModel() {
  const googleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
  if (!googleKey) {
    throw new GatewayError("AI_UNAVAILABLE", "Google Generative AI API key is not configured.");
  }
  const google = createGoogleGenerativeAI({ apiKey: googleKey });
  return google.textEmbeddingModel(EMBEDDING_MODEL_ID);
}

/**
 * Maps provider errors (429/quota to RATE_LIMITED, others to AI_UNAVAILABLE).
 */
export function mapAiError(error: unknown): GatewayError {
  if (error instanceof GatewayError) return error;

  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();

  if (
    lower.includes("429") ||
    lower.includes("quota") ||
    lower.includes("rate limit") ||
    lower.includes("resource_exhausted")
  ) {
    return new GatewayError("RATE_LIMITED", "AI rate limit reached. Please try again shortly.", {
      retryAfterSeconds: 60,
    });
  }

  return new GatewayError("AI_UNAVAILABLE", `AI service error: ${msg}`);
}
