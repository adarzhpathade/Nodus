# Progress Calculation Logic & Engine

> Specification and documentation for the NODUS progress calculation engine.
> Implemented exclusively in `lib/progress/index.ts`. Owner: **BE**.

---

## 1. Overview & Core Philosophy

NODUS tracks academic mastery by unifying the faculty-defined syllabus structure with students' private notes and quiz performance.

The progress engine:
1. Is **pure and deterministic**: zero database dependencies, zero side-effects.
2. Lives in **one place only**: `lib/progress/index.ts`. Neither the frontend nor queries duplicate this logic.
3. Protects **student privacy**: faculty views compute aggregated metrics and class-level averages only. Note text and individual note details are never exposed to faculty.

---

## 2. Mathematical Formulas (AGENTS.md §6.6)

### 2.1 Topic Covered
A topic is considered **covered** by a student if and only if:
$$\text{Covered} = (\text{noteCount} \ge 1) \land (\text{bestQuizScore} = \text{null} \lor \text{bestQuizScore} \ge 50\%)$$

- Having 0 notes means the topic is **not covered**, regardless of quiz attempts.
- Having $\ge 1$ notes marks the topic as **covered**, *unless* the student attempted a quiz on this topic and their highest score is strictly below 50%.
- A failed topic quiz ($< 50\%$) **blocks** the covered status until the student retakes the quiz and scores $\ge 50\%$.

### 2.2 Unit Coverage & Unit %
$$\text{Unit Coverage} = \frac{\text{Covered Topics}}{\text{Total Topics}}$$

$$\text{Unit \%} = \begin{cases} 
0.7 \times (\text{Unit Coverage} \times 100) + 0.3 \times \text{Unit Quiz Average} & \text{if } \text{Unit Quiz Average} \ne \text{null} \\
\text{Unit Coverage} \times 70 & \text{if no quiz attempted yet}
\end{cases}$$

- Weights: **70% note coverage** + **30% quiz mastery**.
- If no quiz has been attempted, the maximum achievable unit score is $70\%$.
- All percentages are rounded to 1 decimal place (`round1`).

### 2.3 Subject %
$$\text{Subject \%} = \text{Average}(\text{Unit \% for all units in subject})$$
If a subject has 0 units, its percentage is $0\%$.

### 2.4 Semester %
$$\text{Semester \%} = \text{Average}(\text{Subject \% for all subjects in semester})$$
If a semester has 0 subjects, its percentage is $0\%$.

### 2.5 Class Unit % (Faculty Aggregation)
$$\text{Class Unit \%} = \frac{1}{N} \sum_{i=1}^{N} \text{Unit \% of student } i \text{ in section}$$

For each topic in a unit across the section:
$$\text{Topic Coverage \%} = \frac{\text{Count of students in section covering topic}}{N} \times 100$$

- **Weakest Topic**: The topic with the lowest `Topic Coverage %` in the unit.
- **Status Bands**:
  - `notStarted`: students with $\text{Unit \%} \le 0$
  - `low`: students with $0 < \text{Unit \%} < 40$
  - `inProgress`: students with $40 \le \text{Unit \%} \le 75$
  - `mastered`: students with $\text{Unit \%} > 75$
- **Students Needing Help**: Students in the section with $\text{Unit \%} < 40\%$, sorted ascending by unit percentage (lowest score first, limit 6).

---

## 3. Status Bands & Visual Mapping (AGENTS.md §6.7)

| Status | Range | Visual Meaning |
|---|---|---|
| `not_started` | $\le 0\%$ | White / Gray |
| `low` | $1 - 39\%$ | Red / Coral |
| `in_progress` | $40 - 75\%$ | Amber / Yellow |
| `mastered` | $> 75\%$ | Emerald / Green |

---

## 4. Edge Cases

1. **Unit with 0 topics**:
   $\text{Unit Coverage} = 0$. If no quiz attempted, $\text{Unit \%} = 0\%$. If quiz attempted, $\text{Unit \%} = 0.3 \times \text{Quiz Average}$.
2. **No quiz attempted on a unit**:
   Unit percentage is strictly bounded to $0.7 \times \text{coverage} \times 100 \le 70\%$. Status can reach `in_progress` but cannot reach `mastered` without practicing quizzes.
3. **Low quiz score blocks covered topic**:
   Student wrote notes for "Dijkstra's Algorithm" ($\ge 1$ note), but scored $30\%$ on a topic quiz. `covered` becomes `false`. Once they score $60\%$, `covered` flips back to `true`.
4. **Multiple quiz attempts**:
   `quizAverage` for a unit includes all attempts submitted by that student in that unit. `bestQuizScore` on a topic takes the maximum score across all attempts for that topic.
5. **Locked semesters**:
   Students attempting to calculate progress for future semesters receive a `LOCKED` Gateway error.

---

## 5. Worked Examples (Demo Story Alignment)

### Example 1: Ananya Sharma — CS201 (Data Structures), Unit 3 (Graphs)
- **Student Profile**: Ananya Sharma (CSE, Semester 3, Section B).
- **Unit Curriculum**: Unit 3 – Graphs (5 topics):
  1. Breadth First Search (BFS) (`order: 0`)
  2. Depth First Search (DFS) (`order: 1`)
  3. Dijkstra's Algorithm (`order: 2`)
  4. Topological Sort (`order: 3`)
  5. Minimum Spanning Trees (MST) (`order: 4`)

**Ananya's Inputs**:
- Notes written:
  - BFS: 2 notes
  - DFS: 2 notes
  - Dijkstra: 3 notes
  - Topological Sort: 0 notes (missing)
  - MST: 0 notes (missing)
- Practice Quizzes:
  - Attempt 1 on Unit 3 Practice Quiz: Score = $60\%$
  - Attempt 2 on Unit 3 Practice Quiz: Score = $60\%$
  - Unit quiz average: $(60 + 60) / 2 = 60.0\%$
  - No standalone topic quizzes taken (`bestQuizScore = null` for all topics).

**Calculations**:
1. Topic coverage:
   - BFS: 2 notes, quiz null $\implies$ **Covered** (✅)
   - DFS: 2 notes, quiz null $\implies$ **Covered** (✅)
   - Dijkstra: 3 notes, quiz null $\implies$ **Covered** (✅)
   - Topo Sort: 0 notes $\implies$ **Not covered** (⬜)
   - MST: 0 notes $\implies$ **Not covered** (⬜)
2. Covered count: 3 of 5 topics $\implies \text{Coverage} = 3/5 = 0.60$ ($60.0\%$).
3. Unit percentage:
   $$\text{Unit \%} = 0.7 \times (0.60 \times 100) + 0.3 \times 60.0 = 42.0 + 18.0 = 60.0\%$$
4. Status:
   $40\% \le 60.0\% \le 75\% \implies$ **`in_progress`**.

---

### Example 2: Mastery Scenario — Rahul Verma, CS201 Unit 1 (Complexity & Linear Structures)
- **Student Profile**: Rahul Verma (CSE, Semester 3, Section B).
- **Curriculum**: Unit 1 – Complexity & Linear Structures (5 topics: Asymptotic Notation, Arrays, Linked Lists, Stacks, Queues).
- **Rahul's Inputs**:
  - Notes: $\ge 1$ note on each of the 5 topics.
  - Quizzes: Attempt 1 score = $80\%$, Attempt 2 score = $100\%$.
  - Unit quiz average: $(80 + 100) / 2 = 90.0\%$.
  - Topic quiz scores: All $\ge 50\%$.

**Calculations**:
1. Topic coverage: $5 / 5$ topics covered $\implies \text{Coverage} = 1.0$ ($100.0\%$).
2. Unit percentage:
   $$\text{Unit \%} = 0.7 \times 100 + 0.3 \times 90.0 = 70.0 + 27.0 = 97.0\%$$
3. Status:
   $97.0\% > 75\% \implies$ **`mastered`**.

---

### Example 3: Faculty View — Prof. Neha Sharma, CS201 Unit 3 (Graphs), Section B
- **Faculty Profile**: Prof. Neha Sharma (teaches CS201 Data Structures & Algorithms, sections A/B/C).
- **Class Profile**: 16 students in Section B enrolled in CS201.
- **Section Aggregations**:
  - Topic coverage across the 16 students:
    - BFS: 14 covered $\implies 87.5\%$
    - DFS: 13 covered $\implies 81.3\%$
    - Dijkstra: 11 covered $\implies 68.8\%$
    - Topo Sort: 6 covered $\implies 37.5\%$
    - MST: 3 covered $\implies 18.8\%$
  - Weakest topic: **Minimum Spanning Trees (MST)** with $18.8\%$ coverage.
  - Student unit percentages distribution:
    - 0% (`notStarted`): 1 student
    - 1–39% (`low`): 4 students
    - 40–75% (`inProgress`): 9 students (including Ananya Sharma at 60.0%)
    - >75% (`mastered`): 2 students
  - Status bands: `{ notStarted: 1, low: 4, inProgress: 9, mastered: 2 }`.
  - Class Average Unit %:
    $$\frac{\sum \text{Unit \%}}{16} = 51.6\% \quad (\text{`in_progress`})$$
  - Students Needing Help: The 5 students with $\text{Unit \%} < 40\%$, sorted ascending:
    1. Kabir Joshi ($0\%$, `not_started`)
    2. Tanvi Mukherjee ($22.4\%$, `low`)
    3. Aarav Mehta ($28.0\%$, `low`)
    4. Diya Patel ($34.2\%$, `low`)
    5. Vihaan Gupta ($38.5\%$, `low`)
