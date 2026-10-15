// Shared primitives used by every contract. Owner: BE (FE reviews). Expanded in BE-1.1.
import { z } from "zod";

export const Id = z.uuid();
export type Id = z.infer<typeof Id>;

export const ProgressStatus = z.enum(["not_started", "low", "in_progress", "mastered"]);
export type ProgressStatus = z.infer<typeof ProgressStatus>;

export type Result<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };
