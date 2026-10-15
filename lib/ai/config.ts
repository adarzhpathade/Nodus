// AI configuration — the single place for providers, models and dimensions (AGENTS.md §10.1). Owner: BE.
// Plain module (no "server-only") because the DB schema imports EMBEDDING_DIMENSIONS and runs in drizzle-kit too.
// Models and providers are filled in BE-7.1.

/**
 * Embedding vector size for resource_chunks / note_chunks (pgvector).
 * Gemini embeddings are requested with this output dimensionality; changing it needs a migration + re-embed.
 */
export const EMBEDDING_DIMENSIONS = 768;
