# NODUS — System Architecture

> Specification and architectural blueprint for the NODUS platform.
> Owner: **BE**.
> Referenced tasks: `BE-0.2`, `BE-0.4`, `BE-11.5`.

---

## 1. System Overview

NODUS is built on Next.js 16 (React 19 App Router) with a strict contract-driven, modular architecture. The application is decoupled between the Frontend (presentation, mock gateways, client stores) and the Backend (data layer, business logic, RAG engine, external integrations) via a shared Gateway interface.

### 1.1 Architectural Component Diagram

```mermaid
flowchart TB
    subgraph Client["Client Tier (Browser)"]
        UI_Student["Student UI<br/>(/dashboard, /graph, /notes, /tutor)"]
        UI_Faculty["Faculty UI<br/>(/faculty/dashboard, /faculty/graph, /faculty/assignments)"]
        ChatClient["AI Tutor Chat Client<br/>(AI SDK useChat)"]
    end

    subgraph NextServer["Next.js 16 App Tier"]
        Proxy["proxy.ts<br/>(Auth Guards & Role Redirects)"]
        RSC["Server Components (RSC)<br/>(Data Fetching via Gateway)"]
        Actions["Server Actions (@/lib/actions/*)<br/>(Input Validation & Mutations)"]
        
        subgraph API_Routes["Route Handlers (app/api/*)"]
            TutorRoute["POST /api/ai/tutor<br/>(Streaming AI Tutor)"]
            UploadRoute["POST /api/upload<br/>(Faculty PDF/PPT Upload)"]
            CronRoute["GET /api/cron/reminders<br/>(Vercel Cron)"]
            HealthRoute["GET /api/health<br/>(Service Healthcheck)"]
            AuthProxy["/api/auth/*<br/>(Neon Auth Proxy)"]
        end

        subgraph Dispatcher["Gateway Switch (@/lib/gateway)"]
            Switch{"MOCK_FEATURES<br/>Environment Switch"}
            MockGateway["mocks/gateway.ts<br/>(FE In-Memory Fixtures)"]
            ServerGateway["lib/server-gateway/*<br/>(Real BE Services)"]
        end

        subgraph Contracts["Contracts (@/contracts/*)"]
            ContractDefs["Zod Schemas + TS Types<br/>NodusGateway Interface"]
        end

        subgraph BusinessEngine["Backend Engines"]
            ProgressEngine["lib/progress/*<br/>(Deterministic Progress Logic)"]
            RAGEngine["lib/ai/rag/*<br/>(Extract, Chunk, Embed, Retrieve)"]
            AuthGuards["lib/auth/guards.ts<br/>(requireStudent, requireFaculty)"]
        end
    end

    subgraph DataServices["Infrastructure & External Services"]
        NeonDB[("Neon Postgres 18<br/>+ pgvector extension<br/>(Drizzle ORM)")]
        NeonAuth["Neon Auth<br/>(Users, Sessions, Passwords)"]
        NeonStorage["Neon Object Storage<br/>(S3 API / bucket: nodus-uploads)"]
        GeminiAI["Google Gemini API<br/>(gemini-2.0-flash / text-embedding-004)"]
        GroqAI["Groq Cloud API<br/>(llama-3.3-70b-versatile fallback)"]
    end

    UI_Student --> Proxy
    UI_Faculty --> Proxy
    Proxy --> RSC
    UI_Student --> Actions
    UI_Faculty --> Actions
    ChatClient --> TutorRoute

    RSC --> Switch
    Actions --> Switch
    Switch -- "Feature in MOCK_FEATURES" --> MockGateway
    Switch -- "Feature Real (empty flag)" --> ServerGateway

    ServerGateway --> Contracts
    MockGateway --> Contracts
    Actions --> Contracts

    ServerGateway --> AuthGuards
    ServerGateway --> ProgressEngine
    ServerGateway --> RAGEngine

    ServerGateway --> NeonDB
    ServerGateway --> NeonStorage
    RAGEngine --> NeonDB
    RAGEngine --> GeminiAI
    TutorRoute --> GeminiAI
    TutorRoute -. "Fallback" .-> GroqAI
    UploadRoute --> NeonStorage
    AuthProxy --> NeonAuth
```

---

## 2. Gateway / Mock Pattern and File Ownership

### 2.1 The Gateway/Mock Architectural Pattern

To decouple Frontend and Backend velocities, NODUS uses a **contract-first, switchable gateway pattern**:

1. **Contracts as Single Source of Truth (`contracts/*`):**
   - Data models and payloads are declared using Zod schemas and TypeScript types.
   - The unified `NodusGateway` interface defines every domain method across 9 feature namespaces: `auth`, `curriculum`, `resources`, `notes`, `graph`, `ai`, `assignments`, `dashboard`, `notifications`.
2. **Dual Implementation:**
   - **Frontend Mocks (`mocks/gateway.ts`):** High-fidelity, deterministic in-memory fixtures implementing `NodusGateway`. FE builds complete UIs with zero waiting for DB or AI APIs.
   - **Backend Implementation (`lib/server-gateway/*`):** Real database queries (Drizzle), role permissions, AI services, and transaction logic implementing `NodusGateway`.
3. **Runtime Feature Switching (`lib/gateway/index.ts`):**
   - The frozen switcher inspects `process.env.MOCK_FEATURES`.
   - `MOCK_FEATURES=all`: Complete mock mode for isolated UI development.
   - `MOCK_FEATURES=graph,ai`: Only graph and AI use mocks; other domains use the real backend.
   - `MOCK_FEATURES=` (empty): Production mode — all 9 features run on the real backend.
4. **Server Actions as Mutation Boundaries (`lib/actions/*`):**
   - Actions receive inputs from client components, validate them against contract Zod schemas, execute `getGateway().<feature>.<method>()`, and return safe `ActionResult<T>` structures (`{ ok: true, data }` or `{ ok: false, error }`).
   - Exceptions never leak raw stack traces to the browser.

### 2.2 Strict Codebase Ownership

| Role | Owned Paths | Description |
|---|---|---|
| **BE** | `contracts/**`, `lib/server-gateway/**`, `lib/actions/**`, `lib/ai/**`, `lib/db/**`, `lib/progress/**`, `lib/auth/**`, `lib/storage/**`, `lib/env.ts`, `app/api/**`, `proxy.ts`, `neon.ts`, `drizzle.config.ts`, `scripts/**`, `.env.example`, `.github/**`, `docs/architecture.md`, `docs/database_schema.md`, `docs/api_contract.md`, `docs/progress_logic.md`, `docs/environment_setup.md`, `docs/test_cases_backend.md`, `docs/roadmap/BACKEND.md` | Data access, business logic, AI pipelines, API contracts, backend documentation. |
| **FE** | `app/**` (except `app/api/**`), `components/**`, `hooks/**`, `stores/**`, `mocks/**`, `public/**`, `docs/roadmap/FRONTEND.md`, `docs/user_flow.md`, `docs/ui_design.md`, `docs/test_cases.md` | Pages, UI components, client stores, visual styling, mock implementations. |
| **FROZEN** | `package.json`, `package-lock.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `components.json`, `lib/gateway/index.ts`, `lib/utils.ts` | Shared configurations changed only via dedicated `chore/` PRs. |

> **ESLint Boundary Rule:** ESLint rules block all frontend code (`app/`, `components/`, `hooks/`, `stores/`) from directly importing `@/lib/db`, `@/lib/ai`, `@/lib/progress`, and `@/lib/server-gateway`. The frontend can only access backend capabilities via `@/contracts`, `@/lib/gateway`, `@/lib/actions`, and `@/lib/auth/client`.

---

## 3. RAG Pipeline Architecture (Ingestion & Query)

The Retrieval-Augmented Generation (RAG) pipeline is grounded strictly in two layers:
1. **Official Layer:** Faculty-uploaded lecture slides and notes (PDF/PPT/PPTX).
2. **Personal Layer:** The student's own private notes created under curriculum topics.

Internet sources and ungrounded LLM hallucinations are blocked by design.

```mermaid
flowchart TD
    subgraph IngestionPipeline["1. Ingestion Pipeline (Upload & Notes)"]
        direction TB
        F_Upload["Faculty Uploads File<br/>(PDF/PPT/PPTX, <= 25MB)"] --> UploadAPI["POST /api/upload"]
        UploadAPI --> StorageSave["Save to S3 Bucket<br/>(nodus-uploads)"]
        StorageSave --> DB_Res["Insert 'resources' record<br/>(status: 'processing')"]
        
        DB_Res --> Extract["Text Extraction (extract.ts)<br/>- PDF: pdf-parse<br/>- PPT/PPTX: officeparser"]
        Extract --> Pages["Page-Aware Extracted Text<br/>(1-based page / slide numbers)"]
        Pages --> Chunk["Text Chunking (chunk.ts)<br/>~500-800 tokens (~2400 chars)<br/>Overlap: ~300 chars"]
        
        Chunk --> Embed["Gemini Embeddings (embed.ts)<br/>model: text-embedding-004<br/>dimensions: 768"]
        Embed --> VectorInsert["Insert into 'resource_chunks'<br/>(HNSW cosine index on embedding)"]
        VectorInsert --> Ready["Update 'resources'<br/>(status: 'ready', pageCount)"]

        StudentNote["Student Saves Note<br/>(updateNote)"] --> NoteSave["Update 'notes' record"]
        NoteSave --> NoteBG["rechunkAndEmbedNote<br/>(Background Task)"]
        NoteBG --> NoteChunk["Chunk Note Body"]
        NoteChunk --> NoteEmbed["Embed Chunks (768 dim)"]
        NoteEmbed --> NoteVector["Upsert 'note_chunks'<br/>(HNSW cosine index)"]
    end

    subgraph QueryPipeline["2. Tutor Query & Grounded Answering Pipeline"]
        direction TB
        UserQ["Student Asks Question<br/>(TutorScope: semester/subject/unit)"] --> TutorAPI["POST /api/ai/tutor"]
        TutorAPI --> CheckScope["Scope & Permission Check<br/>(assertSemesterOpen)"]
        CheckScope --> EmbedQuery["Embed User Query<br/>(text-embedding-004, 768 dim)"]
        
        EmbedQuery --> CosineSearch["pgvector Cosine Distance Search (<=>)<br/>- resource_chunks: visible to student's section<br/>- note_chunks: owner_id = student.id only<br/>- Filter by scope & active semester"]
        
        CosineSearch --> Rank["Sort by Distance & Top-K (K=6)"]
        Rank --> DistCheck{"Best Distance < 0.42?<br/>(NOT_COVERED_THRESHOLD)"}
        
        DistCheck -- "No (Distance >= 0.42)" --> NotCoveredFlow["Trigger 'Not Covered' Branch<br/>- notCovered: true<br/>- Find Syllabus Suggestion<br/>- Stream polite refusal + suggestion<br/>- citations: []"]
        
        DistCheck -- "Yes (Distance < 0.42)" --> CoveredFlow["Trigger Grounded Tutor Branch<br/>- System Prompt with numbered snippets [S1]..[Sn]<br/>- Stream LLM Answer (gemini-2.0-flash)<br/>- Strict rules: cite sources inline [Sn]"]
        
        NotCoveredFlow --> SaveChat["Persist to DB<br/>- ai_conversations<br/>- ai_messages (topic_id, not_covered)<br/>- logActivity('ai_question')"]
        CoveredFlow --> SaveChat
    end
```

---
## 4. Data Flow Diagrams (BE-0.4)

### 4.1 DFD Level 0 — Context Diagram

```mermaid
flowchart TD
    Student(("Student"))
    Faculty(("Faculty"))
    Cron(("Vercel Cron"))
    NeonAuth(("Neon Auth Engine"))
    Gemini(("Google Gemini / AI SDK"))
    S3Storage(("Neon Object Storage"))

    NODUS["0.0<br/>NODUS Academic Mastery Platform"]

    %% Student Flows
    Student -->|"Auth Credentials, Profile Selection"| NODUS
    Student -->|"Student Notes (Markdown, Links)"| NODUS
    Student -->|"Tutor Inquiries (Question, Scope)"| NODUS
    Student -->|"Practice Quiz Submissions"| NODUS
    NODUS -->|"Knowledge Graph & Visual Status"| Student
    NODUS -->|"Grounded Answers + Inline Citations"| Student
    NODUS -->|"Adaptive Quizzes & Progress Feedback"| Student
    NODUS -->|"Deadlines & In-App Notifications"| Student

    %% Faculty Flows
    Faculty -->|"Curriculum Units, Topics, Reorders"| NODUS
    Faculty -->|"Lecture Slides & Notes (PDF/PPT)"| NODUS
    Faculty -->|"Offline Assignment Details & Targets"| NODUS
    Faculty -->|"Student Marking (Submitted/Late/Marks)"| NODUS
    NODUS -->|"Class Progress & Section Analytics"| Faculty
    NODUS -->|"Section Submission Tracker"| Faculty
    NODUS -->|"Aggregated Weak Topics & Top AI Queries"| Faculty

    %% External System Flows
    NODUS <-->|"User Identity, Sessions & Tokens"| NeonAuth
    NODUS -->|"Binary Document Streams"| S3Storage
    S3Storage -->|"Presigned Document URLs"| NODUS
    NODUS <-->|"Vector Embeddings & Chat Completions"| Gemini
    Cron -->|"Scheduled Reminder Trigger (Bearer CRON_SECRET)"| NODUS
```

### 4.2 DFD Level 1 — Decomposed System Processes

```mermaid
flowchart TB
    subgraph Entities["External Entities"]
        Student(("Student"))
        Faculty(("Faculty"))
        Cron(("Vercel Cron"))
        Gemini(("Gemini AI"))
    end

    subgraph Processes["NODUS Core Sub-Processes"]
        P1["1.0 Auth & Role Gatekeeper<br/>(proxy.ts, guards.ts)"]
        P2["2.0 Curriculum & Resource Ingestion<br/>(upload/route.ts, ingest.ts)"]
        P3["3.0 Note Authoring & Knowledge Graph<br/>(notesApi, graphApi, progress engine)"]
        P4["4.0 RAG Retrieval & AI Tutor<br/>(tutor/route.ts, retrieve.ts)"]
        P5["5.0 Offline Assignment & Marking Engine<br/>(assignmentsApi, tracker)"]
        P6["6.0 Quiz Engine & Practice Mastery<br/>(quiz.ts, aiApi)"]
        P7["7.0 Notification & Event Dispatcher<br/>(notifications.ts, cron/reminders)"]
    end

    subgraph DataStores["Postgres Database Stores"]
        D1[("D1: Curriculum Store<br/>(branches, semesters, subjects, units, topics)")]
        D2[("D2: User & Roster Store<br/>(users, student_profiles, faculty_teaching)")]
        D3[("D3: Resources & Vector Store<br/>(resources, resource_chunks)")]
        D4[("D4: Notes & Graph Store<br/>(notes, note_links, note_chunks)")]
        D5[("D5: Assignments Store<br/>(assignments, assignment_sections, assignment_status)")]
        D6[("D6: AI & Quiz Store<br/>(quizzes, quiz_attempts, ai_conversations, ai_messages)")]
        D7[("D7: Activity & Notification Store<br/>(activity_log, notifications)")]
    end

    %% P1 Flows
    Student -->|"Sign-in / Selection"| P1
    Faculty -->|"Sign-in / Selection"| P1
    P1 <--> D2
    P1 -->|"Validated Context"| P2
    P1 -->|"Validated Context"| P3
    P1 -->|"Validated Context"| P4
    P1 -->|"Validated Context"| P5

    %% P2 Flows
    Faculty -->|"Upload Slides / Edit Topics"| P2
    P2 <--> D1
    P2 -->|"Chunks & Embeddings"| D3
    P2 -.->|"Generate Embeddings"| Gemini
    P2 -->|"Resource Uploaded Event"| P7

    %% P3 Flows
    Student -->|"Write / Update Note"| P3
    P3 <--> D1
    P3 <--> D4
    P3 <--> D6
    P3 -->|"Log Activity"| D7
    P3 -->|"Calculated Progress & Graph"| Student

    %% P4 Flows
    Student -->|"Ask Tutor Question"| P4
    P4 -.->|"Embed Query & Completion"| Gemini
    P4 <--> D3
    P4 <--> D4
    P4 <--> D1
    P4 -->|"Store Chat & Log Activity"| D6
    P4 -->|"Stream Answer + Citations"| Student

    %% P5 Flows
    Faculty -->|"Create Assignment / Mark Student"| P5
    P5 <--> D5
    P5 <--> D2
    P5 -->|"Assignment Created / Marked Event"| P7
    P5 -->|"Submission Tracker"| Faculty
    P5 -->|"Deadlines & Marks"| Student

    %% P6 Flows
    Student -->|"Generate & Submit Quiz"| P6
    P6 <--> D3
    P6 <--> D6
    P6 -->|"Log Activity"| D7
    P6 -->|"Quiz Result & Progress Signal"| Student

    %% P7 Flows
    Cron -->|"Daily Reminder Check"| P7
    P7 <--> D5
    P7 -->|"Insert Notifications"| D7
    D7 -->|"Unread Bell & Push"| Student
```

---

## 5. Sequence Diagrams (BE-0.4)

### 5.1 Sequence 1: AI Tutor Streaming Question Flow

This sequence models `POST /api/ai/tutor`, `lib/ai/rag/retrieve.ts`, and the AI SDK UI message streaming pipeline.

```mermaid
sequenceDiagram
    autonumber
    actor Student as Student Browser
    participant API as POST /api/ai/tutor
    participant Guard as Auth & Scope Guard
    participant DB as Postgres (getDb)
    participant RAG as retrieveChunks()
    participant GeminiEmbed as Gemini text-embedding-004
    participant pgvector as Postgres (pgvector)
    participant GeminiChat as Gemini 2.0 Flash
    participant Activity as Activity & Chat Logger

    Student->>API: POST { messages, conversationId, scope }
    API->>Guard: requireStudent()
    Guard-->>API: OnboardedStudent context
    API->>Guard: assertSemesterOpen(scope)
    Guard-->>API: Validated (or throws LOCKED / NOT_FOUND)

    API->>RAG: retrieveChunks({ student, scope, question, topK: 6 })
    RAG->>GeminiEmbed: generateEmbeddings([question])
    GeminiEmbed-->>RAG: queryEmbedding [768 floats]

    par Query Faculty Resource Chunks
        RAG->>pgvector: SELECT from resource_chunks <=> queryEmbedding<br/>WHERE visibleSections ? section AND open semester
        pgvector-->>RAG: Top matching resource chunks
    and Query Student's Private Note Chunks
        RAG->>pgvector: SELECT from note_chunks <=> queryEmbedding<br/>WHERE ownerId = student.id AND open semester
        pgvector-->>RAG: Top matching personal note chunks
    end

    RAG->>RAG: Sort merged chunks by cosine distance; Assign [S1]..[Sn]
    
    alt Best Distance >= 0.42 (Not Covered)
        RAG->>DB: findTopicSuggestion(student, question)
        DB-->>RAG: Suggested topic from syllabus (or null)
        RAG-->>API: { notCovered: true, citations: [], suggestion }
        API->>DB: ensureConversation() & insertAiMessage(user)
        API->>Student: createUIMessageStream({ notCovered: true, citations: [] })
        API->>Student: Stream refusal message + suggested syllabus topic
        API->>Activity: insertAiMessage(assistant) & logActivity('ai_question')
    else Best Distance < 0.42 (Covered)
        RAG-->>API: { notCovered: false, citations: [S1..Sn], chunks }
        API->>DB: ensureConversation() & insertAiMessage(user)
        API->>GeminiChat: streamText({ system: buildTutorSystemPrompt(chunks), messages: history })
        API->>Student: createUIMessageStream({ messageMetadata: { citations, notCovered: false } })
        
        loop Token Streaming
            GeminiChat-->>API: text-delta chunk
            API-->>Student: text-delta (e.g. "...as shown in [S1]...")
        end

        GeminiChat-->>API: Stream finish
        API->>Student: stream finish event
        API->>Activity: insertAiMessage(assistant, citations, topicId)
        API->>Activity: logActivity({ type: 'ai_question', refId: conversationId })
    end
```

### 5.2 Sequence 2: Faculty Offline Assignment Marking Flow

This sequence models `markStudent` / `bulkMark` in `lib/server-gateway/assignments.ts` and notification dispatching.

```mermaid
sequenceDiagram
    autonumber
    actor Faculty as Faculty Browser
    participant Action as markStudent() / bulkMark() Server Action
    participant Guard as requireFacultyTeaches()
    participant Gateway as assignmentsApi (lib/server-gateway)
    participant DB as Postgres (assignments / status)
    participant Notif as Notification Dispatcher (lib/db/queries/notifications)
    actor Student as Student Browser

    Faculty->>Action: markStudent({ assignmentId, studentId, status, marks?, remark? })
    Action->>Action: Validate schema with Zod (MarkStudentInput)
    Action->>Gateway: assignmentsApi.markStudent(input)

    Gateway->>Guard: requireFaculty() & requireFacultyTeaches(subjectId, section)
    Guard-->>Gateway: Confirmed teaching assignment

    Gateway->>DB: findAssignmentById(assignmentId)
    DB-->>Gateway: Assignment metadata (subjectId, maxMarks, sections)

    Gateway->>DB: findUserWithProfile(studentId)
    DB-->>Gateway: Student profile (section, branchId, currentSemester)

    Gateway->>Gateway: Assert student.section IN assignment.sections
    Gateway->>Gateway: Assert marks <= assignment.maxMarks (or throws VALIDATION)

    Gateway->>DB: upsertMarkingStatusRecord({ assignmentId, studentId, status, marks, remark, markedBy })
    DB-->>Gateway: Updated assignment_status record

    opt status != 'pending'
        Gateway->>Notif: notifyStatusMarked({ studentId, assignmentId, status, marks, remark })
        Notif->>DB: INSERT INTO notifications (userId=studentId, type='status_marked')
        Notif-->>Student: (On next query / stream: new unread notification)
    end

    Gateway-->>Action: MarkingRow { studentId, name, section, status, marks, remark, markedAt }
    Action-->>Faculty: ActionResult { ok: true, data: MarkingRow }
```

### 5.3 Sequence 3: Upload Ingestion Pipeline Flow

This sequence models `POST /api/upload`, `lib/storage`, `lib/ai/rag/ingest.ts`, text extraction, and pgvector embeddings generation.

```mermaid
sequenceDiagram
    autonumber
    actor Faculty as Faculty Browser
    participant Route as POST /api/upload
    participant Guard as requireFaculty()
    participant Storage as Neon Object Storage (nodus-uploads)
    participant ResDB as Resources Query (lib/db/queries/resources)
    participant Ingest as ingestResource() (lib/ai/rag/ingest)
    participant Extract as extractDocumentText() (extract.ts)
    participant Chunk as chunkExtractedPages() (chunk.ts)
    participant Gemini as Gemini text-embedding-004 (embed.ts)
    participant Notif as notifyNewResource()

    Faculty->>Route: POST multipart/form-data (file, unitId, visibleSections)
    Route->>Guard: requireFaculty()
    Guard-->>Route: Authenticated faculty
    Route->>Route: Validate file type (PDF/PPT/PPTX) & size (<= 25MB)

    Route->>Storage: upload(storageKey, fileBuffer, mimeType)
    Storage-->>Route: Storage confirmation

    Route->>ResDB: insertResource({ unitId, uploadedBy, storageKey, visibleSections, ingestionStatus: 'processing' })
    ResDB-->>Route: Created Resource record (id, storageKey)

    par Async Ingestion in Background
        Route->>Ingest: ingestResource({ resourceId, storageKey, fileBytes, fileType })
        Route-->>Faculty: HTTP 201 Created { resource }
    end

    Note over Ingest: Background Ingestion Processing
    alt File type is PDF
        Ingest->>Extract: extractPdf(buffer) via pdf-parse
        Extract-->>Ingest: Extracted pages with 1-based page numbers
    else File type is PPT / PPTX
        Ingest->>Extract: extractOffice(buffer) via officeparser
        Extract-->>Ingest: Extracted slides with 1-based slide numbers
    end

    Ingest->>Chunk: chunkExtractedPages(pages)<br/>(~500-800 tokens, 300 char overlap)
    Chunk-->>Ingest: DocumentChunk[] ({ chunkIndex, content, page })

    Ingest->>Gemini: generateEmbeddings(chunkTexts) [batch size 50]
    Gemini-->>Ingest: Vector array (768 float dimensions)

    Ingest->>ResDB: insertResourceChunks(chunks with embeddings)
    ResDB-->>Ingest: Bulk insert committed (indexed via HNSW cosine)

    Ingest->>ResDB: updateResourceIngestion(resourceId, { status: 'ready', pageCount, error: null })
    Ingest->>Notif: notifyNewResource(resourceId, unitId, visibleSections)
    Notif-->>ResDB: Insert notifications for target students

    Faculty->>Route: Poll getResource(resourceId)
    Route-->>Faculty: Resource { ingestion: { status: 'ready', pageCount } }
```

---
