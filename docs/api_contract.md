# NODUS — API Contract (v1.1)

> **Owner: BE.** Source of truth is the code in [`contracts/`](../contracts) and [`lib/server-gateway/`](../lib/server-gateway).
> Referenced task: `BE-11.5`. Any contract change requires a `contract/<slug>` PR reviewed by FE before merging (AGENTS.md §5.4).

---

## 1. How the Frontend Interacts with the Backend

| Interaction | Mechanism | Location | Access Pattern |
|---|---|---|---|
| Read data in a **Server Component** | `getGateway().<feature>.<method>()` | `@/lib/gateway` | Direct server-to-server; throws `GatewayError` caught by nearest `error.tsx` |
| **Mutate**, or read from a **Client Component** | Server action → `ActionResult<T>` | `@/lib/actions/<feature>` | Returns `{ ok: true, data }` or `{ ok: false, error: ErrorPayload }` |
| **Sign in / sign up / sign out** | `authClient.signIn.email(...)`, `signUp`, `signOut` | `@/lib/auth/client` | Better Auth / Neon Auth client SDK |
| **AI Tutor Chat** (streaming) | `useChat<TutorUIMessage>()` → `POST /api/ai/tutor` | `@ai-sdk/react` | AI SDK UI message stream with inline `[Sn]` citation metadata |
| **Upload Lecture Notes / Slides** | `POST /api/upload` | Route handler | `multipart/form-data` with PDF/PPT/PPTX (<= 25 MB) |
| **Service Health Check** | `GET /api/health` | Route handler | End-to-end check of Postgres, pgvector, Auth, and Storage |
| **Deadline Reminders Cron** | `GET /api/cron/reminders` | Route handler | Vercel Cron with `Authorization: Bearer ${CRON_SECRET}` |

`MOCK_FEATURES` controls whether the gateway (and API routes) serve **in-memory mocks** (`mocks/`) or the **real backend** (`lib/server-gateway/`).

### 1.1 Data Conventions
- **Identifiers:** UUID v4 strings for entities (`Id`).
- **Timestamps:** ISO-8601 strings (`Timestamp`, e.g. `2026-10-19T14:00:00.000Z`).
- **Calendar Dates:** `YYYY-MM-DD` (`DateOnly`, e.g. `2026-10-19`).
- **Percentages:** Floating-point numbers `0–100` rounded to 1 decimal place (`round1`).
- **Status Bands:** `not_started` (0%) · `low` (1–39%) · `in_progress` (40–75%) · `mastered` (>75%).
- **Academic Coordinates:** Semesters `1–8` (`SemesterNumber`), sections single uppercase ASCII (`"A" | "B" | "C"`).
- **Offline Submissions:** Assignments are submitted on paper; status is marked by faculty (`pending` · `submitted` · `late` · `not_submitted`).

### 1.2 Error Codes (`ErrorPayload.code`)

| Code | HTTP | Meaning | Typical UI Handling |
|---|---|---|---|
| `UNAUTHENTICATED` | 401 | Not signed in or invalid session cookie | Redirect to `/login` |
| `FORBIDDEN` | 403 | Wrong role / data belongs to another student / faculty does not teach section | "You don't have access to this resource" |
| `NOT_FOUND` | 404 | Entity ID does not exist or was deleted | Render `not-found.tsx` |
| `VALIDATION` | 400 | Invalid payload; see `fieldErrors` | Inline form validation errors |
| `CONFLICT` | 409 | Unique constraint violated, topic contains notes, or already onboarded | Dialog explaining collision |
| `LOCKED` | 423 | Semester is locked (future semester beyond student's current semester) | Render lock state card |
| `RATE_LIMITED` | 429 | AI provider rate limit or quota exceeded; see `retryAfterSeconds` | "AI rate limit reached. Try again in N s" |
| `AI_UNAVAILABLE` | 503 | AI API key missing or provider error | Friendly error banner with retry button |
| `NOT_IMPLEMENTED` | 501 | Feature not built yet | Dev error; check `MOCK_FEATURES` |
| `INTERNAL` | 500 | Unexpected server error | Generic error boundary fallback |

---

## 2. Gateway API Reference by Feature

### 2.1 C-01 Auth `[auth]` — `contracts/auth.ts`
Implemented in `lib/server-gateway/auth.ts`.

| Method | Inputs | Output | Error Codes | Guards |
|---|---|---|---|---|
| `getViewer()` | None | `Promise<Viewer \| null>` | `INTERNAL` | Reads session; resolves student/faculty profile |
| `listBranches()` | None | `Promise<BranchOption[]>` | `INTERNAL` | Public / Onboarding |
| `completeOnboarding(input)` | `OnboardingInput` (`branchId`, `currentSemester`, `section`) | `Promise<StudentProfile>` | `UNAUTHENTICATED`, `VALIDATION`, `CONFLICT`, `NOT_FOUND` | `requireStudentAccount` (must not have profile already) |
| `updateProfile(input)` | `UpdateProfileInput` (`name?`, `image?`) | `Promise<SessionUser>` | `UNAUTHENTICATED`, `VALIDATION` | `requireViewer` |
| `getStudentSelection()` | None | `Promise<StudentSelection>` | `UNAUTHENTICATED`, `FORBIDDEN` | `requireStudent`; reads `nodus_semester` cookie |
| `setStudentSelection(input)` | `StudentSelectionInput` (`semesterNumber`) | `Promise<StudentSelection>` | `UNAUTHENTICATED`, `FORBIDDEN`, `LOCKED` | `requireStudent`; asserts `semesterNumber <= currentSemester` |
| `getFacultySelection()` | None | `Promise<FacultySelection \| null>` | `UNAUTHENTICATED`, `FORBIDDEN` | `requireFaculty`; reads `nodus_faculty` cookie |
| `setFacultySelection(input)` | `FacultySelectionInput` (`subjectId`, `section`) | `Promise<FacultySelection>` | `UNAUTHENTICATED`, `FORBIDDEN` | `requireFaculty`; asserts faculty teaches `(subjectId, section)` |

---

### 2.2 C-02 Curriculum `[curriculum]` — `contracts/curriculum.ts`
Implemented in `lib/server-gateway/curriculum.ts`.

| Method | Inputs | Output | Error Codes | Guards |
|---|---|---|---|---|
| `listSemesters()` | None | `Promise<Semester[]>` | `UNAUTHENTICATED` | `requireViewer`; marks `locked` for students if `> currentSemester` |
| `listSubjects(semesterNumber)` | `semesterNumber: number` | `Promise<Subject[]>` | `UNAUTHENTICATED`, `LOCKED` | `requireViewer`; student `assertSemesterOpen` |
| `listPrerequisites(semesterNumber)` | `semesterNumber: number` | `Promise<Prerequisite[]>` | `UNAUTHENTICATED`, `LOCKED` | `requireViewer`; student `assertSemesterOpen` |
| `getSubject(subjectId)` | `subjectId: string` | `Promise<SubjectDetail>` | `UNAUTHENTICATED`, `NOT_FOUND`, `LOCKED` | `requireViewer`; student `assertSemesterOpen` |
| `getUnit(unitId)` | `unitId: string` | `Promise<UnitDetail>` | `UNAUTHENTICATED`, `NOT_FOUND`, `LOCKED` | `requireViewer`; student `assertSemesterOpen` |
| `createUnit(input)` | `CreateUnitInput` (`subjectId`, `title`) | `Promise<Unit>` | `FORBIDDEN`, `VALIDATION` | `requireFacultyTeaches(subjectId)` |
| `renameUnit(input)` | `RenameUnitInput` (`unitId`, `title`) | `Promise<Unit>` | `FORBIDDEN`, `NOT_FOUND`, `VALIDATION` | `requireFacultyTeaches(subjectId)` |
| `reorderUnits(input)` | `ReorderUnitsInput` (`subjectId`, `unitIds: string[]`) | `Promise<Unit[]>` | `FORBIDDEN`, `VALIDATION` | `requireFacultyTeaches(subjectId)` |
| `deleteUnit(input)` | `DeleteUnitInput` (`unitId`) | `Promise<void>` | `FORBIDDEN`, `NOT_FOUND`, `CONFLICT` | `requireFacultyTeaches(subjectId)`; `CONFLICT` if any topic has notes |
| `createTopic(input)` | `CreateTopicInput` (`unitId`, `title`) | `Promise<Topic>` | `FORBIDDEN`, `NOT_FOUND`, `VALIDATION` | `requireFacultyTeaches(subjectId)` |
| `renameTopic(input)` | `RenameTopicInput` (`topicId`, `title`) | `Promise<Topic>` | `FORBIDDEN`, `NOT_FOUND`, `VALIDATION` | `requireFacultyTeaches(subjectId)` |
| `reorderTopics(input)` | `ReorderTopicsInput` (`unitId`, `topicIds: string[]`) | `Promise<Topic[]>` | `FORBIDDEN`, `VALIDATION` | `requireFacultyTeaches(subjectId)` |
| `deleteTopic(input)` | `DeleteTopicInput` (`topicId`) | `Promise<void>` | `FORBIDDEN`, `NOT_FOUND`, `CONFLICT` | `requireFacultyTeaches(subjectId)`; `CONFLICT` if topic has notes |

---

### 2.3 C-03 Resources `[resources]` — `contracts/resources.ts`
Implemented in `lib/server-gateway/resources.ts`.

| Method | Inputs | Output | Error Codes | Guards |
|---|---|---|---|---|
| `listUnitResources(unitId)` | `unitId: string` | `Promise<Resource[]>` | `UNAUTHENTICATED`, `NOT_FOUND`, `LOCKED` | `requireViewer`; student views only resources where `section = ANY(visibleSections)` |
| `getResource(resourceId)` | `resourceId: string` | `Promise<Resource>` | `UNAUTHENTICATED`, `NOT_FOUND`, `FORBIDDEN`, `LOCKED` | `requireViewer`; student section & semester access checked |
| `getResourceAccess(input)` | `ResourceAccessInput` (`resourceId`) | `Promise<ResourceAccess>` | `UNAUTHENTICATED`, `NOT_FOUND`, `FORBIDDEN` | `requireViewer`; generates presigned S3 URL (~10 min validity); logs `resource_opened` activity |
| `uploadResource(input)` | `UploadResourceInput` (`unitId`, `visibleSections`, `file: File`) | `Promise<Resource>` | `FORBIDDEN`, `VALIDATION`, `INTERNAL` | `requireFacultyTeaches(subjectId)`; uploads to bucket `nodus-uploads`; triggers async RAG ingestion |
| `updateVisibility(input)` | `UpdateResourceVisibilityInput` (`resourceId`, `visibleSections`) | `Promise<Resource>` | `FORBIDDEN`, `NOT_FOUND`, `VALIDATION` | `requireFacultyTeaches(subjectId)` |
| `deleteResource(input)` | `DeleteResourceInput` (`resourceId`) | `Promise<void>` | `FORBIDDEN`, `NOT_FOUND` | `requireFacultyTeaches(subjectId)`; deletes S3 object & cascades chunks |

---

### 2.4 C-04 Notes `[notes]` — `contracts/notes.ts`
Implemented in `lib/server-gateway/notes.ts`.

| Method | Inputs | Output | Error Codes | Guards |
|---|---|---|---|---|
| `listNotes(query)` | `ListNotesQuery` (`semesterNumber?`, `subjectId?`, `unitId?`, `topicId?`, `tag?`, `search?`, `limit?`, `cursor?`) | `Promise<Paginated<NoteSummary>>` | `UNAUTHENTICATED`, `LOCKED` | `requireStudent`; strictly private (owner filter `ownerId = student.id`); full-text search via GIN index |
| `getNote(noteId)` | `noteId: string` | `Promise<Note>` | `UNAUTHENTICATED`, `NOT_FOUND`, `FORBIDDEN` | `requireStudent`; owner-only; returns Markdown, JSON, outgoing links, and backlinks |
| `createNote(input)` | `CreateNoteInput` (`topicId`, `title?`) | `Promise<Note>` | `UNAUTHENTICATED`, `NOT_FOUND`, `LOCKED` | `requireStudent`; asserts open semester; creates note under topic; logs `note_created` |
| `updateNote(input)` | `UpdateNoteInput` (`noteId`, `title?`, `contentMd?`, `contentJson?`, `tags?`) | `Promise<SaveResult>` | `UNAUTHENTICATED`, `NOT_FOUND`, `FORBIDDEN`, `VALIDATION` | `requireStudent`; owner-only; auto-derives links from `nodus://` URIs; schedules background re-embed; logs `note_updated` |
| `deleteNote(input)` | `DeleteNoteInput` (`noteId`) | `Promise<void>` | `UNAUTHENTICATED`, `NOT_FOUND`, `FORBIDDEN` | `requireStudent`; owner-only; cascades links & chunks |
| `addLink(input)` | `AddLinkInput` (`fromNoteId`, `target: { type, id }`) | `Promise<NoteLink>` | `UNAUTHENTICATED`, `NOT_FOUND`, `FORBIDDEN`, `VALIDATION` | `requireStudent`; owner-only; links stored by immutable UUID |
| `removeLink(input)` | `RemoveLinkInput` (`linkId`) | `Promise<void>` | `UNAUTHENTICATED`, `NOT_FOUND`, `FORBIDDEN` | `requireStudent`; owner-only |
| `getLinkPreview(target)` | `LinkTarget` (`type`, `id`) | `Promise<LinkPreview>` | `UNAUTHENTICATED`, `NOT_FOUND` | `requireStudent`; hovers note (own only), topic, or unit |
| `quickSearch(input)` | `QuickSearchInput` (`query`, `semesterNumber`) | `Promise<QuickSearchResult[]>` | `UNAUTHENTICATED`, `LOCKED` | `requireStudent`; Ctrl+K ranked search across notes, topics, units, subjects |
| `listTags()` | None | `Promise<{ tag: string; count: number }[]>` | `UNAUTHENTICATED` | `requireStudent`; owner-only tag aggregations |
| `exportMarkdown(input)` | `ExportMarkdownInput` (`noteId`) | `Promise<MarkdownExport>` | `UNAUTHENTICATED`, `NOT_FOUND`, `FORBIDDEN` | `requireStudent`; owner-only; returns `{ fileName, content }` |

---

### 2.5 C-05 / C-06 Progress & Graph `[graph]` — `contracts/progress.ts`, `contracts/graph.ts`
Implemented in `lib/server-gateway/graph.ts` and `lib/progress/index.ts`.

| Method | Inputs | Output | Error Codes | Guards |
|---|---|---|---|---|
| `getStudentGraph(semesterNumber)` | `semesterNumber: number` | `Promise<StudentGraph>` | `UNAUTHENTICATED`, `NOT_FOUND`, `LOCKED` | `requireStudent`; `assertSemesterOpen`; returns hierarchy + prerequisite edges, and pre-computed `hoverCards` |
| `getStudentSidePanel(unitId)` | `unitId: string` | `Promise<StudentSidePanel>` | `UNAUTHENTICATED`, `NOT_FOUND`, `LOCKED` | `requireStudent`; `assertSemesterOpen`; topics ✅/⬜, note counts, resources, next upcoming assignment |
| `getUnitProgress(unitId)` | `unitId: string` | `Promise<UnitProgress>` | `UNAUTHENTICATED`, `NOT_FOUND`, `LOCKED` | `requireStudent`; calculates unit %, topic coverage, quizAverage |
| `getFacultyGraph(input)` | `{ subjectId: string; section: string }` | `Promise<FacultyGraph>` | `UNAUTHENTICATED`, `NOT_FOUND`, `FORBIDDEN` | `requireFacultyTeaches(subjectId, section)`; class tree (subject → units → topics) with class coverage % |
| `getFacultySidePanel(input)` | `{ unitId: string; section: string }` | `Promise<FacultySidePanel>` | `UNAUTHENTICATED`, `NOT_FOUND`, `FORBIDDEN` | `requireFacultyTeaches(subjectId, section)`; class topic coverage, students needing help (<40%), resources, assignment |

---

### 2.6 C-07 AI `[ai]` — `contracts/ai.ts`
Implemented in `lib/server-gateway/ai.ts`, `lib/ai/quiz.ts`, `lib/ai/analyze.ts`, `lib/ai/gap.ts`.

| Method | Inputs | Output | Error Codes | Guards |
|---|---|---|---|---|
| `listConversations()` | None | `Promise<Conversation[]>` | `UNAUTHENTICATED` | `requireStudent`; returns student's conversation history |
| `getConversation(conversationId)` | `conversationId: string` | `Promise<ConversationDetail>` | `UNAUTHENTICATED`, `NOT_FOUND` | `requireStudent`; owner-only; includes messages and citations |
| `deleteConversation(input)` | `ConversationIdInput` (`conversationId`) | `Promise<void>` | `UNAUTHENTICATED`, `NOT_FOUND` | `requireStudent`; owner-only |
| `generateQuiz(input)` | `GenerateQuizInput` (`unitId`, `topicId?`, `questionCount?`, `fresh?`) | `Promise<Quiz>` | `UNAUTHENTICATED`, `NOT_FOUND`, `LOCKED`, `RATE_LIMITED`, `AI_UNAVAILABLE` | `requireStudent`; `assertSemesterOpen`; cached per unit/topic in `quizzes` table unless `fresh: true` |
| `getQuiz(quizId)` | `quizId: string` | `Promise<Quiz>` | `UNAUTHENTICATED`, `NOT_FOUND`, `LOCKED` | `requireStudent`; `assertSemesterOpen` |
| `submitQuizAttempt(input)` | `SubmitQuizInput` (`quizId`, `answers: (number \| null)[]`) | `Promise<QuizAttemptResult>` | `UNAUTHENTICATED`, `NOT_FOUND`, `VALIDATION` | `requireStudent`; scores 0–100, persists `quiz_attempts`, logs `quiz_attempted` activity, returns updated `unitProgress` |
| `listQuizAttempts(query)` | `ListQuizAttemptsQuery` (`semesterNumber?`, `unitId?`, `limit?`) | `Promise<QuizAttemptSummary[]>` | `UNAUTHENTICATED`, `LOCKED` | `requireStudent`; `assertSemesterOpen` |
| `analyzeNote(input)` | `AnalyzeNoteInput` (`noteId`) | `Promise<NoteAnalysis>` | `UNAUTHENTICATED`, `NOT_FOUND`, `FORBIDDEN`, `RATE_LIMITED`, `AI_UNAVAILABLE` | `requireStudent`; owner-only; cached in `note_analyses` by SHA-256 hash |
| `getGapReport(input)` | `GapReportInput` (`unitId`) | `Promise<GapReport>` | `UNAUTHENTICATED`, `NOT_FOUND`, `LOCKED`, `RATE_LIMITED`, `AI_UNAVAILABLE` | `requireStudent`; `assertSemesterOpen`; identifies missing & weak topics with grounded AI remedial guidance |

---

### 2.7 C-08 Assignments `[assignments]` — `contracts/assignments.ts`
Implemented in `lib/server-gateway/assignments.ts`. Submission is **strictly offline (paper-based)**.

| Method | Inputs | Output | Error Codes | Guards |
|---|---|---|---|---|
| `listMyAssignments(query)` | `ListMyAssignmentsQuery` (`semesterNumber`, `subjectId?`, `status?`) | `Promise<StudentAssignment[]>` | `UNAUTHENTICATED`, `NOT_FOUND`, `LOCKED` | `requireStudent`; `assertSemesterOpen`; filters assignments targeted at student's section |
| `getMyAssignment(assignmentId)` | `assignmentId: string` | `Promise<StudentAssignment>` | `UNAUTHENTICATED`, `NOT_FOUND`, `LOCKED` | `requireStudent`; verifies student's section is targeted and semester is open |
| `listAssignments(query)` | `ListAssignmentsQuery` (`subjectId`, `section?`) | `Promise<FacultyAssignmentSummary[]>` | `UNAUTHENTICATED`, `NOT_FOUND`, `FORBIDDEN` | `requireFacultyTeaches(subjectId, section)`; includes status counts |
| `createAssignment(input)` | `CreateAssignmentInput` (`subjectId`, `unitId?`, `title`, `description?`, `dueAt`, `sections`, `maxMarks?`) | `Promise<Assignment>` | `FORBIDDEN`, `NOT_FOUND`, `VALIDATION` | `requireFacultyTeaches(subjectId, sec)` for all sections; inserts `assignments` and `assignment_sections`; dispatches notifications |
| `updateAssignment(input)` | `UpdateAssignmentInput` (`assignmentId`, `title?`, `description?`, `dueAt?`, `sections?`, `maxMarks?`, `unitId?`) | `Promise<Assignment>` | `FORBIDDEN`, `NOT_FOUND`, `VALIDATION` | `requireFacultyTeaches(subjectId, sec)` |
| `deleteAssignment(input)` | `AssignmentIdInput` (`assignmentId`) | `Promise<void>` | `FORBIDDEN`, `NOT_FOUND` | `requireFacultyTeaches(subjectId)` |
| `getMarkingSheet(input)` | `{ assignmentId: string; section: string }` | `Promise<MarkingSheet>` | `FORBIDDEN`, `NOT_FOUND`, `VALIDATION` | `requireFacultyTeaches(subjectId, section)`; returns roster with status, marks, remarks |
| `markStudent(input)` | `MarkStudentInput` (`assignmentId`, `studentId`, `status`, `marks?`, `remark?`) | `Promise<MarkingRow>` | `FORBIDDEN`, `NOT_FOUND`, `VALIDATION` | `requireFacultyTeaches(subjectId, student.section)`; validates `marks <= maxMarks`; upserts `assignment_status`; dispatches notification |
| `bulkMark(input)` | `BulkMarkInput` (`assignmentId`, `studentIds: string[]`, `status`) | `Promise<MarkingRow[]>` | `FORBIDDEN`, `NOT_FOUND`, `VALIDATION` | `requireFacultyTeaches(subjectId, student.section)` for each student; bulk upserts `assignment_status`; bulk dispatches notifications |
| `getSectionTracker(input)` | `{ subjectId: string; section: string }` | `Promise<SectionTracker>` | `FORBIDDEN`, `NOT_FOUND` | `requireFacultyTeaches(subjectId, section)`; returns student rows with submission counts and subject progress % |

---

### 2.8 C-09 Dashboard `[dashboard]` — `contracts/dashboard.ts`
Implemented in `lib/server-gateway/dashboard.ts`.

| Method | Inputs | Output | Error Codes | Guards |
|---|---|---|---|---|
| `getStudentDashboard(semesterNumber)` | `semesterNumber: number` | `Promise<StudentDashboard>` | `UNAUTHENTICATED`, `NOT_FOUND`, `LOCKED` | `requireStudent`; `assertSemesterOpen`; stats, coverage rings, 180-day activity heatmap, streak, deadlines, radar, quizTrend |
| `getFacultyDashboard(input)` | `{ subjectId: string }` | `Promise<FacultyDashboard>` | `UNAUTHENTICATED`, `NOT_FOUND`, `FORBIDDEN` | `requireFacultyTeaches(subjectId)`; stats, section comparison, weak units matrix (units × sections), submission donuts, top AI topics (aggregated only) |

---

### 2.9 C-10 Notifications `[notifications]` — `contracts/notifications.ts`
Implemented in `lib/server-gateway/notifications.ts`.

| Method | Inputs | Output | Error Codes | Guards |
|---|---|---|---|---|
| `list(query)` | `ListNotificationsQuery` (`unreadOnly?`, `limit?`, `cursor?`) | `Promise<NotificationPage>` | `UNAUTHENTICATED` | `requireViewer`; returns user's notifications sorted newest first |
| `unreadCount()` | None | `Promise<number>` | `UNAUTHENTICATED` | `requireViewer`; returns count of notifications where `read_at IS NULL` |
| `markRead(input)` | `MarkReadInput` (`ids: string[]`) | `Promise<void>` | `UNAUTHENTICATED`, `VALIDATION` | `requireViewer`; sets `read_at = NOW()` for specified IDs |
| `markAllRead()` | None | `Promise<void>` | `UNAUTHENTICATED` | `requireViewer`; sets `read_at = NOW()` for all user notifications |

---

## 3. Server Actions Reference (`@/lib/actions/*`)

Server actions validate inputs with Zod schemas and wrap executions with `runAction` or `runQuery`. They return `Promise<ActionResult<T>>`:
```ts
type ActionResult<T> = 
  | { ok: true; data: T } 
  | { ok: false; error: ErrorPayload };
```

| File | Exported Actions | Input Schema / Validation | Target Gateway Function |
|---|---|---|---|
| `auth.ts` | `completeOnboarding` | `OnboardingInput` | `auth.completeOnboarding(data)` |
| | `updateProfile` | `UpdateProfileInput` | `auth.updateProfile(data)` |
| | `setStudentSelection` | `StudentSelectionInput` | `auth.setStudentSelection(data)` |
| | `setFacultySelection` | `FacultySelectionInput` | `auth.setFacultySelection(data)` |
| `curriculum.ts` | `createUnit` | `CreateUnitInput` | `curriculum.createUnit(data)` |
| | `renameUnit` | `RenameUnitInput` | `curriculum.renameUnit(data)` |
| | `reorderUnits` | `ReorderUnitsInput` | `curriculum.reorderUnits(data)` |
| | `deleteUnit` | `DeleteUnitInput` | `curriculum.deleteUnit(data)` |
| | `createTopic` | `CreateTopicInput` | `curriculum.createTopic(data)` |
| | `renameTopic` | `RenameTopicInput` | `curriculum.renameTopic(data)` |
| | `reorderTopics` | `ReorderTopicsInput` | `curriculum.reorderTopics(data)` |
| | `deleteTopic` | `DeleteTopicInput` | `curriculum.deleteTopic(data)` |
| `resources.ts` | `getResourceAccess` | `ResourceAccessInput` | `resources.getResourceAccess(data)` |
| | `getResource` | `ResourceIdInput` | `resources.getResource(data.resourceId)` |
| | `updateResourceVisibility` | `UpdateResourceVisibilityInput` | `resources.updateVisibility(data)` |
| | `deleteResource` | `DeleteResourceInput` | `resources.deleteResource(data)` |
| `notes.ts` | `listNotes` | `ListNotesQuery` | `notes.listNotes(data)` |
| | `createNote` | `CreateNoteInput` | `notes.createNote(data)` |
| | `updateNote` | `UpdateNoteInput` | `notes.updateNote(data)` |
| | `deleteNote` | `DeleteNoteInput` | `notes.deleteNote(data)` |
| | `addNoteLink` | `AddLinkInput` | `notes.addLink(data)` |
| | `removeNoteLink` | `RemoveLinkInput` | `notes.removeLink(data)` |
| | `getLinkPreview` | `LinkTarget` | `notes.getLinkPreview(data)` |
| | `quickSearch` | `QuickSearchInput` | `notes.quickSearch(data)` |
| | `exportNoteMarkdown` | `ExportMarkdownInput` | `notes.exportMarkdown(data)` |
| `graph.ts` | `getStudentSidePanel` | `{ unitId: Id }` | `graph.getStudentSidePanel(data.unitId)` |
| | `getUnitProgress` | `{ unitId: Id }` | `graph.getUnitProgress(data.unitId)` |
| | `getFacultySidePanel` | `{ unitId: Id, section: Section }` | `graph.getFacultySidePanel(data)` |
| `ai.ts` | `listConversations` | None | `ai.listConversations()` |
| | `getConversation` | `ConversationIdInput` | `ai.getConversation(data.conversationId)` |
| | `deleteConversation` | `ConversationIdInput` | `ai.deleteConversation(data)` |
| | `generateQuiz` | `GenerateQuizInput` | `ai.generateQuiz(data)` |
| | `getQuiz` | `{ quizId: uuid }` | `ai.getQuiz(data.quizId)` |
| | `submitQuizAttempt` | `SubmitQuizInput` | `ai.submitQuizAttempt(data)` |
| | `listQuizAttempts` | `ListQuizAttemptsQuery` | `ai.listQuizAttempts(data)` |
| | `analyzeNote` | `AnalyzeNoteInput` | `ai.analyzeNote(data)` |
| | `getGapReport` | `GapReportInput` | `ai.getGapReport(data)` |
| `assignments.ts`| `createAssignment` | `CreateAssignmentInput` | `assignments.createAssignment(data)` |
| | `updateAssignment` | `UpdateAssignmentInput` | `assignments.updateAssignment(data)` |
| | `deleteAssignment` | `AssignmentIdInput` | `assignments.deleteAssignment(data)` |
| | `markStudent` | `MarkStudentInput` | `assignments.markStudent(data)` |
| | `bulkMark` | `BulkMarkInput` | `assignments.bulkMark(data)` |
| | `getMarkingSheet` | `{ assignmentId: Id, section: Section }` | `assignments.getMarkingSheet(data)` |
| | `getSectionTracker` | `{ subjectId: Id, section: Section }` | `assignments.getSectionTracker(data)` |
| `notifications.ts` | `listNotifications` | `ListNotificationsQuery` | `notifications.list(data)` |
| | `getUnreadCount` | None | `notifications.unreadCount()` |
| | `markNotificationsRead` | `MarkReadInput` | `notifications.markRead(data)` |
| | `markAllNotificationsRead` | None | `notifications.markAllRead()` |

---

## 4. Route Handlers Reference

### 4.1 `POST /api/ai/tutor`
- **Purpose:** Streaming AI tutor grounded exclusively in faculty slides and the student's private notes.
- **Request Headers:** `Content-Type: application/json`
- **Request Body:**
  ```ts
  {
    messages: TutorUIMessage[];
    conversationId: string | null;
    scope: TutorScope; // { type: "semester", semesterNumber } | { type: "subject", subjectId } | { type: "unit", unitId }
  }
  ```
- **Guards:** `requireStudent()`, `assertSemesterOpen(scope)`.
- **Response:** AI SDK UI Message Stream.
  - `start` & `finish` frames contain `metadata`: `{ conversationId, citations: Citation[], notCovered: boolean }`.
  - Assistant message contains inline citation references `[S1]`, `[S2]`.
  - When best chunk cosine distance >= 0.42, sets `notCovered: true` and streams polite refusal with syllabus suggestions.
- **Mock Mode:** Returns canned stream from `mocks/ai-tutor.ts` when `"ai"` is in `MOCK_FEATURES`.

### 4.2 `POST /api/upload`
- **Purpose:** Upload faculty lecture slides and notes in PDF, PPT, or PPTX format.
- **Request Headers:** `Content-Type: multipart/form-data`
- **Request Body:**
  - `file`: File blob (`application/pdf`, `application/vnd.ms-powerpoint`, `application/vnd.openxmlformats-officedocument.presentationml.presentation`, <= 25 MB).
  - `unitId`: UUID of target unit.
  - `visibleSections`: Comma-separated section list, e.g. `"A,B"`.
- **Guards:** `requireFaculty()`, `requireFacultyTeaches(subjectId)`.
- **Response:**
  - `201 Created`: `{ resource: Resource }`
  - `400 Bad Request`: `{ error: ErrorPayload }` (unsupported type, size exceeded, missing fields).
  - `403 Forbidden`: Faculty does not teach unit's subject.
- **Pipeline:** Stores file in Neon Object Storage (`nodus-uploads`), creates `resources` record (`ingestionStatus: "processing"`), and initiates background text extraction, chunking, and Gemini embeddings.

### 4.3 `GET /api/cron/reminders`
- **Purpose:** Scheduled deadline reminder cron (called by Vercel Cron).
- **Request Headers:** `Authorization: Bearer ${CRON_SECRET}`
- **Guards:** Validates bearer token against `process.env.CRON_SECRET`.
- **Action:** Identifies assignments due in <= 48 hours and <= 24 hours; inserts `notifications` records (`deadline_reminder`) for enrolled students who have not yet submitted.
- **Response:** `200 OK`: `{ ok: true, created: number }` or `401 Unauthorized`.

### 4.4 `GET /api/health`
- **Purpose:** Deep health check of all external infrastructure components.
- **Request Headers:** In production, requires `x-health-secret: ${HEALTHCHECK_SECRET}`.
- **Sub-Checks:**
  1. **Postgres & pgvector:** Executes `SELECT version()` and verifies `vector` extension version.
  2. **Neon Auth:** Executes `getAuth().getSession()`.
  3. **Neon Storage:** Writes temporary file to `healthcheck/`, generates presigned download URL, verifies content roundtrip, and deletes file.
- **Response:** `200 OK`: `{ ok: true, checks: { postgres, auth, storage } }` or `503 Service Unavailable`.

### 4.5 `/api/auth/*`
- **Purpose:** Neon Auth HTTP handler and session proxy.
- **Usage:** Managed by `@neon/auth` SDK; handles `/api/auth/sign-in`, `/api/auth/sign-up`, `/api/auth/sign-out`, and session token renewal.

### 4.6 `POST /api/dev/gateway`
- **Purpose:** Interactive gateway explorer for development and integration checks.
- **Guards:** Returns `404 Not Found` in production (`NODE_ENV === "production"`).
- **Body:** `{ feature: Feature, method: string, args: unknown[] }`
- **Response:** Runs the gateway method with the caller's session cookies and active `MOCK_FEATURES`, returning `{ ok: true, data }` or `{ ok: false, error }`.

---

## 5. Real Backend Status Matrix

All 9 domain features are **fully implemented** in the real backend (`lib/server-gateway/*`):

| Feature | Gateway Implementation | Queries & Database Tables | Status |
|---|---|---|---|
| `auth` | `lib/server-gateway/auth.ts` | `users`, `student_profiles`, `faculty_teaching`, `branches` | ✅ Real (BE-3) |
| `curriculum` | `lib/server-gateway/curriculum.ts` | `semesters`, `subjects`, `units`, `topics`, `subject_prerequisites` | ✅ Real (BE-4) |
| `resources` | `lib/server-gateway/resources.ts` | `resources`, `resource_chunks`, Neon Storage, RAG pipeline | ✅ Real (BE-4) |
| `notes` | `lib/server-gateway/notes.ts` | `notes`, `note_links`, `note_chunks`, GIN full-text search | ✅ Real (BE-5) |
| `graph` | `lib/server-gateway/graph.ts` | `lib/progress/index.ts`, `semesters`, `subjects`, `units`, `topics` | ✅ Real (BE-6) |
| `ai` | `lib/server-gateway/ai.ts` | `quizzes`, `quiz_attempts`, `ai_conversations`, `ai_messages`, `note_analyses` | ✅ Real (BE-7) |
| `assignments` | `lib/server-gateway/assignments.ts`| `assignments`, `assignment_sections`, `assignment_status` | ✅ Real (BE-8) |
| `dashboard` | `lib/server-gateway/dashboard.ts` | `activity_log`, `quiz_attempts`, `notes`, `assignments` | ✅ Real (BE-9) |
| `notifications`| `lib/server-gateway/notifications.ts`| `notifications`, `createDeadlineReminders` cron | ✅ Real (BE-8) |

**Production Cutover:**
In production, set `MOCK_FEATURES=""` (or omit the variable). The application will automatically execute all calls through the live Neon database and AI pipelines.

---
