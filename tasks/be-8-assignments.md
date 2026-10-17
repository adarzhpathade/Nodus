# Task: be-8-assignments  (worker: Gemini / agy, role: BACKEND)

## Setup
- Work ONLY in the worktree `E:\Projects\College Projects\nodus-be8` (branch `be/BE-8-assignments`).
- Do NOT run shell commands or git (they are denied). Use only file read/write/edit/search tools. Do not commit or push; the reviewer does that.
- Read `AGENTS.md` (sections 3, 6.5, 9.4, 9.9, 9.10, 13, 14), `docs/roadmap/BACKEND.md` (BE-8), `contracts/assignments.ts`, `contracts/notifications.ts`, `contracts/gateway.ts`, `lib/db/schema/assignments.ts`, `lib/db/schema/activity.ts` (notifications table), and the style references `lib/server-gateway/notes.ts`, `lib/server-gateway/resources.ts`, `lib/db/queries/notes.ts`, `lib/actions/assignments.ts`, `lib/actions/notifications.ts`.

## Goal
Implement BE-8.1 to BE-8.7: the real `assignments` and `notifications` gateway modules.

## Files allowed (BE-owned only)
- `lib/db/queries/assignments.ts`, `lib/db/queries/notifications.ts` (new)
- `lib/server-gateway/assignments.ts`, `lib/server-gateway/notifications.ts` (new)
- `lib/server-gateway/index.ts`: replace ONLY the `assignments` and `notifications` lines (and add the two imports)
- `lib/actions/assignments.ts`, `lib/actions/notifications.ts` only if an action is missing for a gateway method
- `app/api/cron/reminders/route.ts` (deadline reminders)
- `docs/roadmap/BACKEND.md` (tick BE-8 tasks only)

## Do NOT touch
`app/**` except `app/api/**`, `components/**`, `mocks/**`, `contracts/**` (gaps go in "Requests to FE" in BACKEND.md), frozen files. No package installs. No build/lint/tests. Do not touch `lib/progress`, `lib/server-gateway/graph.ts` (another worker owns them).

## Rules
- Submission is OFFLINE. Never add upload or student submit actions. No row in `assignment_status` = `pending`.
- Guards on every method (`lib/auth/guards.ts`). Student sees only assignments targeting their own section, in open semesters. Faculty only for subjects/sections they teach (`requireFacultyTeaches`). Reject `markStudent` for a student not in the assignment's sections (FORBIDDEN / VALIDATION).
- DB types never leave `lib/db`; map to contract types in the gateway. Timestamps as ISO strings. No `any`.

## Steps (print "STEP n DONE" after each)
1. Queries + gateway for student view: `listMyAssignments` (grouped/filtered per `ListMyAssignmentsQuery`), `getMyAssignment`.
2. Faculty: `listAssignments` (with `StatusCounts`, pending = students in the target sections minus marked rows), `createAssignment`, `updateAssignment`, `deleteAssignment`.
3. Marking: `getMarkingSheet`, `markStudent` (upsert, sets markedBy/markedAt), `bulkMark` (one transaction), `getSectionTracker` (counts per section and per-student rows).
4. Notifications: `list` (cursor pagination), `unreadCount`, `markRead`, `markAllRead`, own rows only.
5. Triggers: create notifications on `createAssignment` (students of target sections), on `markStudent`/`bulkMark` (that student, "status marked"). Export a helper `notifyNewResource(unitId, visibleSections, resourceName)` in `lib/db/queries/notifications.ts` for the upload flow, but do NOT edit the resources gateway (record this in your report as a request for the reviewer).
6. `app/api/cron/reminders/route.ts`: keep the `CRON_SECRET` check; when not in mock mode create deadline reminders for assignments due within 2 days and due today, skipping students who already have a reminder of that kind for that assignment (idempotent).
7. Wire the two modules in `lib/server-gateway/index.ts`. Tick BE-8.1 to BE-8.7 in `docs/roadmap/BACKEND.md`.

## Report (last message)
Files changed, assumptions, requests for FE/reviewer, anything unverified.
