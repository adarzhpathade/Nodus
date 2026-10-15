# NODUS — API Contract (v1)

> **Owner: BE.** Source of truth is the code in [`contracts/`](../contracts). This page is the readable map.
> Any change → `contract/<slug>` PR by BE, reviewed by FE, merged before dependent work (AGENTS.md §5.4).

---

## 1. How FE talks to the backend

| Need | Use | Where |
|---|---|---|
| Read data in a **server component** | `getGateway().<feature>.<method>()` | `@/lib/gateway` |
| **Mutate**, or read from a **client component** | server action → `ActionResult<T>` | `@/lib/actions/<feature>` |
| **Sign in / sign up / sign out** | `authClient.signIn.email(...)`, `authClient.signUp.email(...)`, `authClient.signOut()` | `@/lib/auth/client` |
| **Tutor chat** (streaming) | `useChat<TutorUIMessage>()` → `POST /api/ai/tutor` | `ai` / `@ai-sdk/react` |
| **Upload** a PDF/PPT (faculty) | `fetch("/api/upload", { method: "POST", body: formData })` | route |

`MOCK_FEATURES` decides per feature whether the gateway (and the tutor route) serve **mocks** (`mocks/`) or the **real** backend.

### Conventions
- IDs are UUID strings. Times are ISO-8601 strings (`Timestamp`), calendar days are `YYYY-MM-DD` (`DateOnly`).
- Percentages are `0–100`. Progress status: `not_started` (0) · `low` (1–39) · `in_progress` (40–75) · `mastered` (>75).
- Sections are single uppercase letters (`"A"`). Semesters are `1–8`.
- **Gateway methods throw** `GatewayError`. Server components let it reach the nearest `error.tsx`.
- **Server actions never throw**; they return:
  ```ts
  type ActionResult<T> = { ok: true; data: T } | { ok: false; error: ErrorPayload };
  ```
- **Routes** return `{ error: ErrorPayload }` with an HTTP status on failure.

### Error codes (`ErrorPayload.code`)

| Code | HTTP | Meaning | Typical UI |
|---|---|---|---|
| `UNAUTHENTICATED` | 401 | Not signed in | Redirect to `/login` |
| `FORBIDDEN` | 403 | Wrong role / not your data / not your section | "You don't have access" |
| `NOT_FOUND` | 404 | Missing entity | Not-found state |
| `VALIDATION` | 400 | Bad input; see `fieldErrors` | Inline field errors |
| `CONFLICT` | 409 | e.g. deleting a topic that has notes; already onboarded | Explain + suggest action |
| `LOCKED` | 423 | Future semester | Lock state |
| `RATE_LIMITED` | 429 | AI free-tier quota; see `retryAfterSeconds` | "Try again in N s" + retry |
| `AI_UNAVAILABLE` | 503 | AI provider error / not configured | Friendly error + retry |
| `NOT_IMPLEMENTED` | 501 | Real backend not built yet | Dev only — add feature to `MOCK_FEATURES` |
| `INTERNAL` | 500 | Unexpected | Generic error |

### Decisions

- **Note links derivation:** `updateNote` re-derives `note_links` rows from `nodus://(note|topic|unit)/<id>` hrefs in `contentMd` when saved.
- **Note images:** Note images are URL-only in v1; there is no separate note image upload route.
- **Unit titles:** `Unit.title` is stored without the `"Unit N - "` prefix (e.g. `"Graphs"`). The frontend renders `"Unit {order} - {title}"` (or 1-based display as appropriate).
- **User registration:** Sign-up always creates a student user. Faculty accounts are provisioned exclusively via seed or admin.

---

## 2. Gateway by feature


Feature flag names (for `MOCK_FEATURES`) are in brackets.

### C-01 Auth `[auth]` — `contracts/auth.ts`
| Method | Returns | Notes |
|---|---|---|
| `getViewer()` | `Viewer \| null` | `{ role: "student", user, profile \| null }` or `{ role: "faculty", user, profile }`. Student `profile: null` → onboarding. |
| `listBranches()` | `BranchOption[]` | Onboarding form options |
| `completeOnboarding(input)` | `StudentProfile` | `CONFLICT` if already onboarded |
| `updateProfile(input)` | `SessionUser` | |
| `getStudentSelection()` / `setStudentSelection(input)` | `StudentSelection` | Top-bar semester. `LOCKED` for future semesters |
| `getFacultySelection()` / `setFacultySelection(input)` | `FacultySelection \| null` | Top-bar subject + section. `FORBIDDEN` if not taught |

### C-02 Curriculum `[curriculum]` — `contracts/curriculum.ts`
| Method | Returns | Notes |
|---|---|---|
| `listSemesters()` | `Semester[]` | With `locked`, `isCurrent` |
| `listSubjects(semesterNumber)` | `Subject[]` | `LOCKED` for future semesters |
| `listPrerequisites(semesterNumber)` | `Prerequisite[]` | |
| `getSubject(subjectId)` | `SubjectDetail` | Units with topics |
| `getUnit(unitId)` | `UnitDetail` | |
| `createUnit` · `renameUnit` · `reorderUnits` · `deleteUnit` | `Unit` / `Unit[]` / `void` | Faculty. `deleteUnit` → `CONFLICT` if notes exist |
| `createTopic` · `renameTopic` · `reorderTopics` · `deleteTopic` | `Topic` / `Topic[]` / `void` | Faculty. `deleteTopic` → `CONFLICT` if notes exist |

### C-03 Resources `[resources]` — `contracts/resources.ts`
| Method | Returns | Notes |
|---|---|---|
| `listUnitResources(unitId)` | `Resource[]` | Students: only their section's |
| `getResource(resourceId)` | `Resource` | Poll `ingestion.status` after upload |
| `getResourceAccess({ resourceId })` | `ResourceAccess` | Presigned URL, ~10 min. Logs activity |
| `uploadResource(input)` | `Resource` | Via `POST /api/upload` only |
| `updateVisibility(input)` | `Resource` | Faculty |
| `deleteResource({ resourceId })` | `void` | Faculty |

### C-04 Notes `[notes]` — `contracts/notes.ts`
| Method | Returns | Notes |
|---|---|---|
| `listNotes(query)` | `Paginated<NoteSummary>` | Filters: semester/subject/unit/topic/tag/search; sort |
| `getNote(noteId)` | `Note` | Includes `links` and `backlinks` |
| `createNote({ topicId, title? })` | `Note` | Every note belongs to a topic |
| `updateNote(input)` | `SaveResult` | Auto-save; send only changed fields |
| `deleteNote({ noteId })` | `void` | |
| `addLink({ fromNoteId, target })` / `removeLink({ linkId })` | `NoteLink` / `void` | `target`: `{ type: "note" \| "topic" \| "unit", id }` |
| `getLinkPreview(target)` | `LinkPreview` | Hover preview |
| `quickSearch(input)` | `QuickSearchResult[]` | Ctrl+K: notes, topics, units, subjects |
| `listTags()` | `{ tag, count }[]` | |
| `exportMarkdown({ noteId })` | `MarkdownExport` | `{ fileName, content }` — FE triggers the download |

### C-05 / C-06 Progress & Graph `[graph]` — `contracts/progress.ts`, `contracts/graph.ts`
| Method | Returns | Notes |
|---|---|---|
| `getStudentGraph(semesterNumber)` | `StudentGraph` | `nodes` (semester → subjects → units), `edges` (`hierarchy` / `prerequisite`), **`hoverCards` keyed by node id** (no fetch on hover) |
| `getStudentSidePanel(unitId)` | `StudentSidePanel` | Topics ✅/⬜ (`progress.topics`), resources, next assignment |
| `getUnitProgress(unitId)` | `UnitProgress` | Refresh after a note/quiz |
| `getFacultyGraph({ subjectId, section })` | `FacultyGraph` | Subject → units → topics, class averages, `hoverCards` |
| `getFacultySidePanel({ unitId, section })` | `FacultySidePanel` | Class topic coverage, students needing help, resources, assignment + pending count |

### C-07 AI `[ai]` — `contracts/ai.ts`
| Method | Returns | Notes |
|---|---|---|
| `listConversations()` / `getConversation(id)` / `deleteConversation({ conversationId })` | | Tutor history |
| `generateQuiz(input)` | `Quiz` | Cached per unit/topic unless `fresh`. May throw `RATE_LIMITED` / `AI_UNAVAILABLE` |
| `getQuiz(quizId)` | `Quiz` | |
| `submitQuizAttempt({ quizId, answers })` | `QuizAttemptResult` | Includes updated `unitProgress` |
| `listQuizAttempts(query)` | `QuizAttemptSummary[]` | |
| `analyzeNote({ noteId })` | `NoteAnalysis` | Cached by content hash (`cached: true`) |
| `getGapReport({ unitId })` | `GapReport` | Missing + weak topics with reasons |

### C-08 Assignments `[assignments]` — `contracts/assignments.ts`
Submission is **offline**: there is no student upload.

| Method | Returns | Notes |
|---|---|---|
| `listMyAssignments(query)` / `getMyAssignment(id)` | `StudentAssignment[]` / `StudentAssignment` | Student. `status`: `pending` · `submitted` · `late` · `not_submitted` |
| `listAssignments({ subjectId, section? })` | `FacultyAssignmentSummary[]` | With status `counts` |
| `createAssignment` · `updateAssignment` · `deleteAssignment` | `Assignment` / `void` | Faculty |
| `getMarkingSheet({ assignmentId, section })` | `MarkingSheet` | One row per student |
| `markStudent(input)` / `bulkMark(input)` | `MarkingRow` / `MarkingRow[]` | |
| `getSectionTracker({ subjectId, section })` | `SectionTracker` | |

### C-09 Dashboard `[dashboard]` — `contracts/dashboard.ts`
| Method | Returns | Notes |
|---|---|---|
| `getStudentDashboard(semesterNumber)` | `StudentDashboard` | `stats`, `coverage` rings, `activity` (~180 days, zeros included), `deadlines`, `radar`, `quizTrend` |
| `getFacultyDashboard({ subjectId })` | `FacultyDashboard` | `stats`, `sectionComparison`, `weakUnits` (units × sections), `submissions` donuts, `topAiTopics` (aggregated only) |

### C-10 Notifications `[notifications]` — `contracts/notifications.ts`
| Method | Returns | Notes |
|---|---|---|
| `list(query)` | `Paginated<Notification>` | `target`: unit / resource / assignment → FE builds the link |
| `unreadCount()` | `number` | |
| `markRead({ ids })` / `markAllRead()` | `void` | |

---

## 3. Server actions (`@/lib/actions/*`)

All return `Promise<ActionResult<T>>` and validate input with the contract schema.

| File | Actions |
|---|---|
| `auth.ts` | `completeOnboarding`, `updateProfile`, `setStudentSelection`, `setFacultySelection` |
| `curriculum.ts` | `createUnit`, `renameUnit`, `reorderUnits`, `deleteUnit`, `createTopic`, `renameTopic`, `reorderTopics`, `deleteTopic` |
| `resources.ts` | `getResourceAccess`, `getResource`, `updateResourceVisibility`, `deleteResource` |
| `notes.ts` | `listNotes`, `createNote`, `updateNote`, `deleteNote`, `addNoteLink`, `removeNoteLink`, `getLinkPreview`, `quickSearch`, `exportNoteMarkdown` |
| `graph.ts` | `getStudentSidePanel`, `getUnitProgress`, `getFacultySidePanel` |
| `ai.ts` | `listConversations`, `getConversation`, `deleteConversation`, `generateQuiz`, `submitQuizAttempt`, `listQuizAttempts`, `analyzeNote`, `getGapReport` |
| `assignments.ts` | `createAssignment`, `updateAssignment`, `deleteAssignment`, `markStudent`, `bulkMark`, `getMarkingSheet` |
| `notifications.ts` | `listNotifications`, `getUnreadCount`, `markNotificationsRead`, `markAllNotificationsRead` |

```ts
const result = await createNote({ topicId });
if (!result.ok) return showError(result.error); // result.error.code, .message, .fieldErrors
router.push(`/notes/${result.data.id}`);
```

---

## 4. Route handlers

### `POST /api/ai/tutor` — streaming tutor
- **Body:** `{ messages: TutorUIMessage[], conversationId: string | null, scope: TutorScope }`
- **Response:** AI SDK UI message stream. Assistant message `metadata: TutorMessageMetadata` = `{ conversationId, citations: Citation[], notCovered }`, sent on `start` and `finish`.
- Answer text references citations by `ref` (e.g. `[S1]`) — FE renders them as chips.
- **Mock mode:** streams `mocks/ai-tutor.ts`. **Real mode:** BE-7.3.

```tsx
const { messages, sendMessage } = useChat<TutorUIMessage>({
  transport: new DefaultChatTransport({ api: TUTOR_ROUTE }),
});
sendMessage({ text }, { body: { conversationId, scope } });
// message.metadata?.citations
```

### `POST /api/upload` — faculty upload
- **Body:** `multipart/form-data` — `file` (PDF/PPT/PPTX, ≤ 25 MB), `unitId`, `visibleSections` (`"A,B"`).
- **Response:** `201 { resource: Resource }` or `{ error }` (400 for type/size/fields).
- Then poll `getResource` until `ingestion.status` is `ready` or `failed`.

### `GET /api/cron/reminders` — deadline reminders (Vercel Cron)
- Header `Authorization: Bearer ${CRON_SECRET}`. Real logic: BE-8.7.

### `GET /api/health` — service check
- Postgres + pgvector, Neon Auth, storage round trip. Open in dev; production needs `x-health-secret`.

### `/api/auth/*` — Neon Auth proxy
- Used by `authClient`. Don't call directly.

### `POST /api/dev/gateway` — gateway explorer (development only)
- Body: `{ "feature": "curriculum", "method": "listSubjects", "args": [3] }`
- Runs the method with **your session cookies** and the current `MOCK_FEATURES`, and returns `{ ok, data }` or `{ error }` — exactly what a page would get. Handy during integration checkpoints.
- 404 in production.

---

## 4b. Real backend status

| Feature | Real? | Since |
|---|---|---|
| `auth` | ✅ all methods | BE-3 |
| `curriculum` | ✅ all methods (reads + faculty edits) | BE-4 |
| `resources` | ✅ all methods (reads, presigned URLs, upload, ingest) | BE-4 |
| `notes` | ✅ all methods (CRUD, links, search, tags, quick search, export) | BE-5 |
| everything else | ⏳ NOT_IMPLEMENTED — keep in `MOCK_FEATURES` | — |

**Routing (`proxy.ts`, real auth only):** signed out → `/login` · student without profile → `/onboarding` · student on `/faculty/*` or `/onboarding` → `/dashboard` · faculty on student pages → `/faculty/dashboard` · signed in on `/login`/`/signup` → their home. Selections are stored in httpOnly cookies (`nodus_semester`, `nodus_faculty`).

---

## 5. Changelog

| Version | Date | Change |
|---|---|---|
| v1 | 2026-10-15 | Initial contracts C-00 … C-11, server actions, tutor/upload/cron routes |
