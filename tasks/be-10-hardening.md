# Task: be-10-hardening (Gemini, BACKEND)
Work ONLY in your assigned worktree (path given in the launch prompt). No shell or git; file tools only; do not commit.
Read: AGENTS.md sections 3, 6, 13, 14; docs/roadmap/BACKEND.md (BE-10); every file in lib/server-gateway/, lib/actions/, app/api/**, lib/db/queries/, lib/db/schema/, lib/auth/.

## Goal
BE-10.1 (indexes), BE-10.3 (security review), BE-10.4 (error shapes). Do NOT run or generate migrations (the reviewer runs `db:generate`).

## Files allowed (BE-owned only)
lib/db/schema/** (ONLY adding `index(...)` entries), lib/server-gateway/**, lib/actions/**, app/api/**, lib/db/queries/**, lib/auth/**, docs/security_review.md (new), docs/roadmap/BACKEND.md (tick BE-10.1, 10.3, 10.4).
Do NOT touch app pages, components, mocks, contracts, frozen files. No package installs. Do not modify existing behaviour except to close a security gap or fix an error shape.

## Steps (print STEP n DONE)
1. Security audit against the AGENTS.md section 14 table. For EVERY gateway method, server action and route handler write one row in docs/security_review.md: guard used, scope filter, locked-semester check, verdict. Pay special attention to: notes privacy (never visible to faculty or other students), resource section visibility incl. presigned URLs, RAG retrieval filters, faculty section scoping on assignments/marking/graph/dashboard, `app/api/dev/gateway` (must be disabled in production), `app/api/upload` (type + size validation, faculty-only, teaches the unit's subject), `app/api/cron/reminders` (CRON_SECRET), `/api/health`.
2. Fix every gap you find in the BE files (smallest possible change) and list each fix in the doc under "Fixed". Anything you cannot fix inside BE files goes under "Requests".
3. Indexes (BE-10.1): look at the hot queries in lib/db/queries/** (notes by owner/topic/updated, note_links targets, quiz_attempts by student/quiz, assignment_status by student, activity_log by student/created_at, notifications by user/created_at/read, ai_messages by topic, resource_chunks). Add any missing composite `index(...)` to the schema files. Do not add duplicates of existing indexes. List each in the doc with the query it serves.
4. Error shapes (BE-10.4): every gateway method must throw GatewayError (never leak raw Error/SQL text); every server action returns ActionResult; every route handler returns JSON {code,message} with a proper status and logs details server-side only. Fix places that leak raw errors.
5. Tick BE-10.1, BE-10.3, BE-10.4 in docs/roadmap/BACKEND.md.
End with a Report: gaps found/fixed, indexes added, anything unverified.
