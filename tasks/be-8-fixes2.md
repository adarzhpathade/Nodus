# Task: be-8-fixes2 (Gemini, BACKEND) - round 2
Work ONLY in E:\Projects\College Projects\nodus-be8. No shell or git; file tools only. This branch now contains lib/progress/index.ts and lib/db/queries/progress.ts (from BE-6). Read both first.
1. lib/db/queries/assignments.ts: DELETE `calculateStudentsSubjectProgress` (it duplicates the progress formula and ignores quizzes, which AGENTS.md section 6.6 forbids). Remove imports that become unused.
2. lib/server-gateway/assignments.ts `getSectionTracker`: compute each student's subject % with the real engine: call `getSectionProgressRawData(subjectId, section)` from "@/lib/db/queries/progress", then per student per unit `calculateUnitProgress` and `calculateSubjectProgress` from "@/lib/progress" (same pattern as getFacultyGraph in lib/server-gateway/graph.ts). If the subject has no units, percent is 0.
3. lib/server-gateway/assignments.ts lines ~305 and ~480: `faculty` is assigned but never used; drop the variable binding (keep the guard call).
4. lib/server-gateway/resources.ts `uploadResource`: you may edit this ONE file for this ONE change: after the resource row is inserted and ingestion is scheduled, call `notifyNewResource(input.unitId, input.visibleSections, input.file.name)` from lib/db/queries/notifications.ts inside `waitUntil(...)` with a `.catch` that only logs, so a notification failure never fails the upload.
5. lib/db/queries/resources.ts has an unused `asc` import: remove it.
Change nothing else. End with a Report listing each edit.
