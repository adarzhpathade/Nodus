# Task: be-7-fixes (Gemini, BACKEND) - review fixes, round 1
Work ONLY in E:\Projects\College Projects\nodus-be7. No shell or git; file tools only. Fix exactly these:
1. app/api/ai/tutor/route.ts (~line 250): `writer.write({ type: "error", error: mapped.message })` is invalid for the AI SDK UI stream; the field is `errorText`. Use `{ type: "error", errorText: mapped.message }`.
2. lib/actions/ai.ts (~line 31): `z` is used (getQuiz action) but not imported. Prefer reusing a Zod schema from contracts/ai.ts if one exists for quiz ids (check for QuizIdInput or similar); otherwise add `import { z } from "zod";`.
3. lib/ai/rag/retrieve.ts: the query vector is spliced into SQL with `sql.raw`. Replace with a parameterized value: build the literal string `[${queryEmbedding.join(",")}]` once and use `sql\`${vectorLiteral}::vector\`` (a bound parameter, no sql.raw) in both distance expressions.
4. lib/ai/rag/retrieve.ts: the doc comment on NOT_COVERED_DISTANCE_THRESHOLD says 0.38 but the value is 0.42; make comment and value agree (keep 0.42) and move the constant into lib/ai/config.ts as an exported `NOT_COVERED_DISTANCE_THRESHOLD`, importing it here.
Do not change anything else. End with a Report listing the 4 edits.
