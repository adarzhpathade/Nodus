# Task: be-9-dashboard (Gemini, BACKEND)
Work ONLY in E:\Projects\College Projects\nodus-be9 (branch be/BE-9-dashboard). No shell or git; file tools only; do not commit.
Read: AGENTS.md sections 3, 6.6, 9.1, 9.7, 9.9, 13, 14; docs/roadmap/BACKEND.md (BE-9); contracts/dashboard.ts; contracts/gateway.ts; lib/progress/index.ts; lib/db/queries/progress.ts; lib/db/queries/assignments.ts; lib/db/queries/activity.ts; lib/server-gateway/graph.ts and assignments.ts (style + guard patterns); lib/db/schema/activity.ts and ai.ts.

## Goal
BE-9.1 to BE-9.3: the real `dashboard` gateway (student + faculty loaders) and fill the assignment deadline gaps left in the graph.

## Files allowed (BE-owned only)
lib/db/queries/dashboard.ts (new), lib/server-gateway/dashboard.ts (new), the `dashboard` line + import in lib/server-gateway/index.ts, lib/server-gateway/graph.ts (ONLY to replace the `nextDeadline: null` and `assignment: null` placeholders), lib/db/queries/assignments.ts (ONLY to add a read helper for the next upcoming assignment per unit/subject for a student and a pending-count helper for faculty), lib/actions/dashboard.ts only if an action is missing, docs/roadmap/BACKEND.md (tick BE-9.1-9.3).
Do NOT touch app/** (except app/api), components, mocks, contracts, frozen files. No package installs.

## Rules
- Progress numbers ONLY via lib/progress (never re-implement the formula). Student sees own data only; faculty sees aggregates only (never note content) and only for subjects/sections they teach (requireFacultyTeaches). Locked semesters rejected for students (assertSemesterOpen).
- DB types never leave lib/db; map to contract types in the gateway. No any.

## Steps (print STEP n DONE)
1. Student dashboard (`getStudentDashboard`): stat cards (notes count, semester %, quiz average, assignments submitted, study streak from activity_log: consecutive days ending today or yesterday), coverage rings per subject, activity heatmap (daily counts, last ~120 days, shape per contract), deadline timeline with status, optional radar + quiz trend per contract. All for the selected semester.
2. Faculty dashboard (`getFacultyDashboard`): section comparison, weak-units heatmap (units x sections class average), submission donuts per section, from lib/progress + assignment counts. Use the selected subject/section selection pattern already used by getFacultyGraph.
3. Most-asked AI topics (BE-9.3): counts of ai_messages.topic_id per topic for the faculty's subject, aggregated only, no message content.
4. Graph gaps: in lib/server-gateway/graph.ts replace `nextDeadline: null` (hover cards) and `assignment: null` (side panels, student and faculty) with real data from the assignments tables (student: nearest upcoming assignment for the unit/subject in their section with their status; faculty: assignment summary with pendingCount).
5. Wire dashboard in index.ts, tick BE-9.1-9.3 in docs/roadmap/BACKEND.md.
End with a Report: files changed, assumptions, anything unverified.
