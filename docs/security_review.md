# NODUS Security Review (BE-10.3)

> Comprehensive security audit of backend methods against AGENTS.md §14 (Security and Permissions).
> Audit completed: October 2026. Owner: BE.

---

## 1. Security Matrix & Permissions Table (AGENTS.md §14)

| Action | Student | Faculty | Enforced By |
|---|---|---|---|
| View own notes | ✅ | ❌ | `notesApi`, queries filtered by `notes.ownerId = student.user.id` |
| View other students' notes | ❌ | ❌ | `notesApi`, queries strictly reject non-owner access |
| View resources for own sections | ✅ | ✅ (own subjects) | `resourcesApi.listUnitResources`, `getResource`, `getResourceAccess` (`visibleSections` match) |
| Upload resources | ❌ | ✅ (own subjects) | `resourcesApi.uploadResource`, `POST /api/upload` (`requireFacultyTeaches`) |
| Create/edit units & topics | ❌ | ✅ (own subjects) | `curriculumApi` (`requireFacultyTeaches`) |
| Create assignments | ❌ | ✅ (own subjects/sections) | `assignmentsApi.createAssignment` (`requireFacultyTeaches` on subject & target sections) |
| Mark assignment status | ❌ | ✅ (own sections) | `assignmentsApi.markStudent`, `bulkMark` (`requireFacultyTeaches` on subject & student's section) |
| View own progress | ✅ | — | `graphApi`, `dashboardApi` (scoped to `student.user.id`) |
| View class aggregated progress | ❌ | ✅ (own sections) | `graphApi.getFacultyGraph`, `dashboardApi.getFacultyDashboard` (`requireFacultyTeaches`) |
| Access future semesters | ❌ | — | `assertSemesterOpen` check across all student endpoints |

---

## 2. Gateway Methods Audit

| # | Feature | Method | Guard Used | Scope Filter | Locked-Sem Check | Verdict |
|---|---|---|---|---|---|---|
| 1 | Auth | `getViewer` | None (public session reader) | Current session user | N/A | Pass |
| 2 | Auth | `listBranches` | `requireViewer` | System-wide branches | N/A | Pass |
| 3 | Auth | `completeOnboarding` | `requireStudentAccount` | `viewer.user.id`, validates branch/semester/section | Validates semester offered | Pass |
| 4 | Auth | `updateProfile` | `requireViewer` | `viewer.user.id` | N/A | Pass |
| 5 | Auth | `getStudentSelection` | `requireStudent` | Cookie / `student.profile.currentSemester` | Caps at `currentSemester` | Pass |
| 6 | Auth | `setStudentSelection` | `requireStudent` | Cookie update | `assertSemesterOpen` | Pass |
| 7 | Auth | `getFacultySelection` | `requireFaculty` | Validates teaching assignment | N/A | Pass |
| 8 | Auth | `setFacultySelection` | `requireFaculty` | Validates faculty teaches subject+section | N/A | Pass |
| 9 | Curriculum | `listSemesters` | `requireViewer` | Viewer's branch | Returns `locked` flag for future sem | Pass |
| 10 | Curriculum | `listSubjects` | `requireViewer` | Viewer's branch + semester | `assertSemesterOpen` | Pass |
| 11 | Curriculum | `listPrerequisites` | `requireViewer` | Viewer's branch + semester | `assertSemesterOpen` | Pass |
| 12 | Curriculum | `getSubject` | `requireViewer` | `visibleSubject` (viewer branch match) | `assertSemesterOpen` | Pass |
| 13 | Curriculum | `getUnit` | `requireViewer` | `visibleSubject` (viewer branch match) | `assertSemesterOpen` | Pass |
| 14 | Curriculum | `createUnit` | `requireFacultyTeaches` | Subject ID | N/A (Faculty) | Pass |
| 15 | Curriculum | `renameUnit` | `requireFacultyTeaches` | Unit's subject ID | N/A (Faculty) | Pass |
| 16 | Curriculum | `reorderUnits` | `requireFacultyTeaches` | Subject ID | N/A (Faculty) | Pass |
| 17 | Curriculum | `deleteUnit` | `requireFacultyTeaches` | Unit's subject ID (checks notes count = 0) | N/A (Faculty) | Pass |
| 18 | Curriculum | `createTopic` | `requireFacultyTeaches` | Unit's subject ID | N/A (Faculty) | Pass |
| 19 | Curriculum | `renameTopic` | `requireFacultyTeaches` | Topic's subject ID | N/A (Faculty) | Pass |
| 20 | Curriculum | `reorderTopics` | `requireFacultyTeaches` | Unit's subject ID | N/A (Faculty) | Pass |
| 21 | Curriculum | `deleteTopic` | `requireFacultyTeaches` | Topic's subject ID (checks notes count = 0) | N/A (Faculty) | Pass |
| 22 | Resources | `listUnitResources` | `requireViewer` + branch check | Students: `student.profile.section = ANY(visibleSections)`; Faculty: `requireFacultyTeaches` | `assertSemesterOpen` (students) | Pass |
| 23 | Resources | `getResource` | `requireViewer` + branch check | Students: `student.profile.section` in `visibleSections`; Faculty: `requireFacultyTeaches` | `assertSemesterOpen` (students) | Pass |
| 24 | Resources | `getResourceAccess` | `requireViewer` + branch check | Students: `student.profile.section` in `visibleSections`; Faculty: `requireFacultyTeaches`; 10-min presigned URL | `assertSemesterOpen` (students) | Pass |
| 25 | Resources | `uploadResource` | `requireFaculty` + `requireFacultyTeaches` | Unit's subject ID; storage key unique UUID | N/A (Faculty) | Pass |
| 26 | Resources | `updateVisibility` | `requireFaculty` + `requireFacultyTeaches` | Resource's subject ID | N/A (Faculty) | Pass |
| 27 | Resources | `deleteResource` | `requireFaculty` + `requireFacultyTeaches` | Resource's subject ID; deletes storage object | N/A (Faculty) | Pass |
| 28 | Notes | `listNotes` | `requireStudent` | `ownerId = student.user.id`, `branchId`, `maxSemesterNumber` | `assertSemesterOpen` | Pass |
| 29 | Notes | `getNote` | `requireStudent` | `ownerId = student.user.id` (strictly private); links & backlinks scoped | `assertSemesterOpen` | Pass |
| 30 | Notes | `createNote` | `requireStudent` | Topic in branch; inserts with `ownerId = student.user.id` | `assertSemesterOpen` | Pass |
| 31 | Notes | `updateNote` | `requireStudent` | `ownerId = student.user.id`; if topic changed, verifies open semester | `assertSemesterOpen` | Pass |
| 32 | Notes | `deleteNote` | `requireStudent` | `ownerId = student.user.id` | `assertSemesterOpen` | Pass |
| 33 | Notes | `addLink` | `requireStudent` | `fromNote` must be owned; target note owned / target topic/unit in branch & open | `assertSemesterOpen` | Pass |
| 34 | Notes | `removeLink` | `requireStudent` | `link.fromNote.ownerId = student.user.id` | N/A | Pass |
| 35 | Notes | `getLinkPreview` | `requireStudent` | Note target: owned; topic/unit target: open semester in branch | `assertSemesterOpen` | Pass |
| 36 | Notes | `quickSearch` | `requireStudent` | Student's own notes + curriculum in open semester | `assertSemesterOpen` | Pass |
| 37 | Notes | `listTags` | `requireStudent` | `ownerId = student.user.id` | N/A | Pass |
| 38 | Notes | `exportMarkdown` | `requireStudent` | `ownerId = student.user.id` | `assertSemesterOpen` | Pass |
| 39 | Graph | `getStudentGraph` | `requireStudent` | `student.user.id`, `branchId`, assignments by `student.profile.section` | `assertSemesterOpen` | Pass |
| 40 | Graph | `getStudentSidePanel` | `requireStudent` | `student.user.id`, resources & assignment by `section` | `assertSemesterOpen` | Pass |
| 41 | Graph | `getUnitProgress` | `requireStudent` | `student.user.id`, unit in branch | `assertSemesterOpen` | Pass |
| 42 | Graph | `getFacultyGraph` | `requireFacultyTeaches(subjectId, section)` | Subject ID + section; class aggregated metrics only (no student notes) | N/A (Faculty) | Pass |
| 43 | Graph | `getFacultySidePanel` | `requireFacultyTeaches(subjectId, section)` | Unit's subject ID + section; class aggregated data only | N/A (Faculty) | Pass |
| 44 | AI | `listConversations` | `requireStudent` | `studentId = student.user.id` | N/A | Pass |
| 45 | AI | `getConversation` | `requireStudent` | `studentId = student.user.id` | N/A | Pass |
| 46 | AI | `deleteConversation` | `requireStudent` | `studentId = student.user.id` | N/A | Pass |
| 47 | AI | `generateQuiz` | `requireStudent` | Unit in branch; material filtered by `student.profile.section` | `assertSemesterOpen` | Pass |
| 48 | AI | `getQuiz` | `requireStudent` | Quiz's unit in branch | `assertSemesterOpen` | Pass |
| 49 | AI | `submitQuizAttempt` | `requireStudent` | Attempt recorded for `student.user.id`; progress calculated for student | N/A | Pass |
| 50 | AI | `listQuizAttempts` | `requireStudent` | `studentId = student.user.id` | `assertSemesterOpen` (if specified) | Pass |
| 51 | AI | `analyzeNote` | `requireStudent` | Note owned by `student.user.id`; link candidates from own notes + unit topics | N/A (validated by note owner) | Pass |
| 52 | AI | `getGapReport` | `requireStudent` | Unit in branch; note analysis scoped to `student.user.id` | `assertSemesterOpen` | Pass |
| 53 | Assignments | `listMyAssignments` | `requireStudent` | Student's branch, semester, section; status scoped | `assertSemesterOpen` | Pass |
| 54 | Assignments | `getMyAssignment` | `requireStudent` | Section in target sections, branch match | `assertSemesterOpen` | Pass |
| 55 | Assignments | `listAssignments` | `requireFaculty` + `requireFacultyTeaches` | Subject ID + sections faculty teaches | N/A (Faculty) | Pass |
| 56 | Assignments | `createAssignment` | `requireFacultyTeaches` on subject and each target section | Subject ID + target sections | N/A (Faculty) | Pass |
| 57 | Assignments | `updateAssignment` | `requireFacultyTeaches` on subject and each section | Assignment's subject ID + sections | N/A (Faculty) | Pass |
| 58 | Assignments | `deleteAssignment` | `requireFacultyTeaches` on subject and each section | Assignment's subject ID + sections | N/A (Faculty) | Pass |
| 59 | Assignments | `getMarkingSheet` | `requireFaculty` + `requireFacultyTeaches` | Assignment's subject ID + section | N/A (Faculty) | Pass |
| 60 | Assignments | `markStudent` | `requireFaculty` + `requireFacultyTeaches` | Subject ID + student's section | N/A (Faculty) | Pass |
| 61 | Assignments | `bulkMark` | `requireFaculty` + `requireFacultyTeaches` | Subject ID + each student's section | N/A (Faculty) | Pass |
| 62 | Assignments | `getSectionTracker` | `requireFaculty` + `requireFacultyTeaches` | Subject ID + section | N/A (Faculty) | Pass |
| 63 | Dashboard | `getStudentDashboard` | `requireStudent` | `student.user.id`, branch, section; heatmap & notes scoped | `assertSemesterOpen` | Pass |
| 64 | Dashboard | `getFacultyDashboard` | `requireFacultyTeaches` | Subject ID; sections filtered to teaching assignments; top AI topics aggregated only | N/A (Faculty) | Pass |
| 65 | Notifications | `list` | `requireViewer` | `userId = viewer.user.id` | N/A | Pass |
| 66 | Notifications | `unreadCount` | `requireViewer` | `userId = viewer.user.id` | N/A | Pass |
| 67 | Notifications | `markRead` | `requireViewer` | `userId = viewer.user.id` | N/A | Pass |
| 68 | Notifications | `markAllRead` | `requireViewer` | `userId = viewer.user.id` | N/A | Pass |

---

## 3. Server Actions Audit

| # | Action | File | Guard / Validation | Gateway Delegation | Verdict |
|---|---|---|---|---|---|
| 1 | `completeOnboarding` | `lib/actions/auth.ts` | Zod `OnboardingInput` | `auth.completeOnboarding` | Pass |
| 2 | `updateProfile` | `lib/actions/auth.ts` | Zod `UpdateProfileInput` | `auth.updateProfile` | Pass |
| 3 | `setStudentSelection` | `lib/actions/auth.ts` | Zod `StudentSelection` | `auth.setStudentSelection` | Pass |
| 4 | `setFacultySelection` | `lib/actions/auth.ts` | Zod `FacultySelection` | `auth.setFacultySelection` | Pass |
| 5 | `createUnit` | `lib/actions/curriculum.ts` | Zod `CreateUnitInput` | `curriculum.createUnit` | Pass |
| 6 | `renameUnit` | `lib/actions/curriculum.ts` | Zod `RenameUnitInput` | `curriculum.renameUnit` | Pass |
| 7 | `reorderUnits` | `lib/actions/curriculum.ts` | Zod `ReorderInput` | `curriculum.reorderUnits` | Pass |
| 8 | `deleteUnit` | `lib/actions/curriculum.ts` | Zod `DeleteUnitInput` | `curriculum.deleteUnit` | Pass |
| 9 | `createTopic` | `lib/actions/curriculum.ts` | Zod `CreateTopicInput` | `curriculum.createTopic` | Pass |
| 10 | `renameTopic` | `lib/actions/curriculum.ts` | Zod `RenameTopicInput` | `curriculum.renameTopic` | Pass |
| 11 | `reorderTopics` | `lib/actions/curriculum.ts` | Zod `ReorderInput` | `curriculum.reorderTopics` | Pass |
| 12 | `deleteTopic` | `lib/actions/curriculum.ts` | Zod `DeleteTopicInput` | `curriculum.deleteTopic` | Pass |
| 13 | `getResourceAccess` | `lib/actions/resources.ts` | Zod `ResourceIdInput` + `requireViewer` | `resources.getResourceAccess` | Pass |
| 14 | `getResource` | `lib/actions/resources.ts` | Zod `ResourceIdInput` + `requireViewer` | `resources.getResource` | Pass |
| 15 | `updateResourceVisibility` | `lib/actions/resources.ts` | Zod `UpdateVisibilityInput` + `requireFaculty` | `resources.updateVisibility` | Pass |
| 16 | `deleteResource` | `lib/actions/resources.ts` | Zod `ResourceIdInput` + `requireFaculty` | `resources.deleteResource` | Pass |
| 17 | `listNotes` | `lib/actions/notes.ts` | Zod `ListNotesQuery` | `notes.listNotes` | Pass |
| 18 | `getNote` | `lib/actions/notes.ts` | Zod `NoteIdInput` | `notes.getNote` | Pass |
| 19 | `getBacklinks` | `lib/actions/notes.ts` | Zod `NoteIdInput` | `notes.getNote().backlinks` | Pass |
| 20 | `createNote` | `lib/actions/notes.ts` | Zod `CreateNoteInput` | `notes.createNote` | Pass |
| 21 | `updateNote` | `lib/actions/notes.ts` | Zod `UpdateNoteInput` | `notes.updateNote` | Pass |
| 22 | `deleteNote` | `lib/actions/notes.ts` | Zod `NoteIdInput` | `notes.deleteNote` | Pass |
| 23 | `addNoteLink` / `addLink` | `lib/actions/notes.ts` | Zod `AddLinkInput` | `notes.addLink` | Pass |
| 24 | `removeNoteLink` / `removeLink` | `lib/actions/notes.ts` | Zod `RemoveLinkInput` | `notes.removeLink` | Pass |
| 25 | `getLinkPreview` | `lib/actions/notes.ts` | Zod `LinkTarget` | `notes.getLinkPreview` | Pass |
| 26 | `quickSearch` | `lib/actions/notes.ts` | Zod `QuickSearchInput` | `notes.quickSearch` | Pass |
| 27 | `exportNoteMarkdown` / `exportMarkdown` | `lib/actions/notes.ts` | Zod `NoteIdInput` | `notes.exportMarkdown` | Pass |
| 28 | `listTags` | `lib/actions/notes.ts` | `runQuery` | `notes.listTags` | Pass |
| 29 | `getStudentSidePanel` | `lib/actions/graph.ts` | Zod `{ unitId: Id }` | `graph.getStudentSidePanel` | Pass |
| 30 | `getUnitProgress` | `lib/actions/graph.ts` | Zod `{ unitId: Id }` | `graph.getUnitProgress` | Pass |
| 31 | `getFacultySidePanel` | `lib/actions/graph.ts` | Zod `{ unitId: Id, section: Section }` | `graph.getFacultySidePanel` | Pass |
| 32 | `listConversations` | `lib/actions/ai.ts` | `runQuery` | `ai.listConversations` | Pass |
| 33 | `getConversation` | `lib/actions/ai.ts` | Zod `ConversationIdInput` | `ai.getConversation` | Pass |
| 34 | `deleteConversation` | `lib/actions/ai.ts` | Zod `ConversationIdInput` | `ai.deleteConversation` | Pass |
| 35 | `generateQuiz` | `lib/actions/ai.ts` | Zod `GenerateQuizInput` | `ai.generateQuiz` | Pass |
| 36 | `getQuiz` | `lib/actions/ai.ts` | Zod `{ quizId: UUID }` | `ai.getQuiz` | Pass |
| 37 | `submitQuizAttempt` | `lib/actions/ai.ts` | Zod `SubmitQuizInput` | `ai.submitQuizAttempt` | Pass |
| 38 | `listQuizAttempts` | `lib/actions/ai.ts` | Zod `ListQuizAttemptsQuery` | `ai.listQuizAttempts` | Pass |
| 39 | `analyzeNote` | `lib/actions/ai.ts` | Zod `AnalyzeNoteInput` | `ai.analyzeNote` | Pass |
| 40 | `getGapReport` | `lib/actions/ai.ts` | Zod `GapReportInput` | `ai.getGapReport` | Pass |
| 41 | `createAssignment` | `lib/actions/assignments.ts` | Zod `CreateAssignmentInput` | `assignments.createAssignment` | Pass |
| 42 | `updateAssignment` | `lib/actions/assignments.ts` | Zod `UpdateAssignmentInput` | `assignments.updateAssignment` | Pass |
| 43 | `deleteAssignment` | `lib/actions/assignments.ts` | Zod `AssignmentIdInput` | `assignments.deleteAssignment` | Pass |
| 44 | `markStudent` | `lib/actions/assignments.ts` | Zod `MarkStudentInput` | `assignments.markStudent` | Pass |
| 45 | `bulkMark` | `lib/actions/assignments.ts` | Zod `BulkMarkInput` | `assignments.bulkMark` | Pass |
| 46 | `getMarkingSheet` | `lib/actions/assignments.ts` | Zod `{ assignmentId: Id, section: Section }` | `assignments.getMarkingSheet` | Pass |
| 47 | `getSectionTracker` | `lib/actions/assignments.ts` | Zod `{ subjectId: Id, section: Section }` | `assignments.getSectionTracker` | Pass |
| 48 | `listNotifications` | `lib/actions/notifications.ts` | Zod `ListNotificationsQuery` | `notifications.list` | Pass |
| 49 | `getUnreadCount` | `lib/actions/notifications.ts` | `runQuery` | `notifications.unreadCount` | Pass |
| 50 | `markNotificationsRead` | `lib/actions/notifications.ts` | Zod `MarkReadInput` | `notifications.markRead` | Pass |
| 51 | `markAllNotificationsRead` | `lib/actions/notifications.ts` | `runQuery` | `notifications.markAllRead` | Pass |

---

## 4. Route Handlers Audit

| Route | Method | Guard / Auth | Scope & Validation | Prod Disabled / Secret Check | Verdict |
|---|---|---|---|---|---|
| `/api/dev/gateway` | POST | Uses caller's session cookies | Body parsed with Zod (`FEATURES`, method string, args). Returns JSON error. | Blocked in production: `NODE_ENV === 'production'` returns 404 JSON error payload | Pass |
| `/api/upload` | POST | `requireFaculty()` | MIME type validation (PDF/PPT/PPTX), size limit (25 MB), `UploadResourceFields` Zod parsing; route verifies faculty teaches unit's subject via `findUnitWithSubject` and `requireFacultyTeaches` | N/A (faculty upload route) | Pass |
| `/api/cron/reminders` | GET | `CRON_SECRET` | Header `Authorization: Bearer ${CRON_SECRET}` validated; skips already submitted/notified | N/A (Vercel Cron) | Pass |
| `/api/health` | GET | `HEALTHCHECK_SECRET` | Tests Postgres+pgvector, Neon Auth, Storage round-trip. Details sanitized in production. | In production requires `x-health-secret` matching `HEALTHCHECK_SECRET` (returns 404 JSON otherwise) | Pass |
| `/api/ai/tutor` | POST | `requireStudent()` (real mode) | Body parsed with `TutorRequestBody`; scope branch & locked-semester validated; RAG retrieval strictly filters by section & student ownership | N/A (student tutor route) | Pass |

---

## 5. Security Gaps Identified and Fixed

### Fixed
1. **`app/api/upload` Faculty Teaches Subject Check**: Route previously relied only on `requireFaculty()` and downstream gateway method; hardened route handler to verify unit existence and execute `requireFacultyTeaches(unitInfo.subject.id)` before delegating to gateway.
2. **`app/api/dev/gateway` Production Error Response**: Replaced plain-text `new Response("Not found", { status: 404 })` with standardized JSON `{ error: { code: "NOT_FOUND", message: "Not found." } }`.
3. **`app/api/health` Response Standardization & Error Sanitization**:
   - Replaced plain-text 404 on unauthenticated access with standardized JSON `{ error: { code: "NOT_FOUND", message: "Not found." } }`.
   - Prevented leaking raw SQL/SDK internal error messages in production `detail` field; logged errors server-side via `console.error`.
4. **`app/api/cron/reminders` Unhandled Exception Safety**: Wrapped reminder generation in try/catch to return standardized `errorResponse(toErrorPayload(error))` and log server-side.
5. **`app/api/ai/tutor` Scope Cross-Branch Isolation**: Added `branchId === student.profile.branch.id` checks in subject and unit scope resolution to reject cross-branch IDs before querying.
6. **`lib/ai/config.ts` AI Error Sanitization**: Removed `${msg}` leakage from `GatewayError("AI_UNAVAILABLE", ...)`; logged detailed AI provider message to server console and returned friendly user-facing text.
7. **Storage Presigned URL & Upload Error Handling**: In `resources.ts`, wrapped raw AWS/Neon storage calls in try/catch to convert unexpected storage exceptions to user-friendly `GatewayError("INTERNAL", ...)`.
8. **UUID Validation in `insertNoteLink`**: Replaced raw `throw new Error(...)` with `throw new GatewayError("VALIDATION", "Invalid target ID.")`.
9. **User Management Query Errors in `users.ts`**: Replaced raw `throw new Error(...)` with `GatewayError` instances.

### Requests to Other Roles
*(None at this time — all security hardening was completed within BE-owned files.)*

---

## 6. Database Indexes Added (BE-10.1)

| Table | Index Name | Columns | Serves Hot Query |
|---|---|---|---|
| `notes` | `notes_owner_topic_updated_idx` | `(owner_id, topic_id, updated_at DESC)` | `listNotesWithLocation` (`lib/db/queries/notes.ts`) when filtering notes by student owner and topic, ordered by updated time |
| `note_links` | `note_links_target_from_idx` | `(to_type, to_id, from_note_id)` | `listBacklinksForNote` (`lib/db/queries/notes.ts`) covering index for incoming target lookups and joins to source note |
| `quiz_attempts` | `quiz_attempts_student_quiz_idx` | `(student_id, quiz_id)` | `getStudentQuizDataForUnits` and `getSectionProgressRawData` (`lib/db/queries/progress.ts`) joining student attempts to quizzes |
| `ai_messages` | `ai_messages_topic_role_idx` | `(topic_id, role)` | `getTopAiTopicsForSubject` (`lib/db/queries/dashboard.ts`) grouping question counts where `role = 'user'` by topic |
| `assignments` | `assignments_unit_due_idx` | `(unit_id, due_at ASC)` | `findNextUpcomingAssignmentForStudent` (`lib/db/queries/assignments.ts`) finding nearest upcoming assignment for a unit |
| `assignment_sections` | `assignment_sections_section_idx` | `(section, assignment_id)` | `listStudentAssignments` and `findNextUpcomingAssignmentForStudent` (`lib/db/queries/assignments.ts`) querying assignments targeting student's section |
| `assignment_status` | `assignment_status_student_status_idx` | `(student_id, status)` | `listStudentAssignments` (`lib/db/queries/assignments.ts`) filtering student assignments by status (submitted, late, not_submitted) |
| `activity_log` | `activity_log_student_type_ref_idx` | `(student_id, type, ref_id, created_at DESC)` | `logActivityThrottled` (`lib/db/queries/activity.ts`) debouncing note update activities on frequent auto-saves |
| `notifications` | `notifications_user_read_time_idx` | `(user_id, read_at, created_at DESC)` | `getUnreadNotificationCount` and `listNotificationsForUser` (`lib/db/queries/notifications.ts`) filtering unread notifications and sorting |
| `resources` | `resources_unit_status_idx` | `(unit_id, ingestion_status)` | `generateQuizService` (`lib/ai/quiz.ts`) and RAG retrieval filtering resources in a unit where `ingestion_status = 'ready'` |

