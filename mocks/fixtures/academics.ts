// Resources, assignments, quiz attempts and tutor history for the mock world (FE-1.8 / FE-1.9).
// Dates are offsets in days from "today" so the demo always looks current.
import type { Section } from "@/contracts/common";
import type { ResourceType } from "@/contracts/resources";

// ---------- Resources (faculty uploads) ----------

export type RawResource = {
  subject: string;
  unit: number;
  fileName: string;
  type: ResourceType;
  sizeKb: number;
  pages: number;
  sections: Section[];
  daysAgo: number;
  /** Text the mock tutor "retrieves" and cites (one entry per cited page). */
  passages: { page: number; text: string }[];
};

export const rawResources: RawResource[] = [
  {
    subject: "CS301",
    unit: 4,
    fileName: "Lecture_Slides_Graphs.pdf",
    type: "pdf",
    sizeKb: 2480,
    pages: 38,
    sections: ["A", "B", "C"],
    daysAgo: 12,
    passages: [
      { page: 6, text: "A graph G = (V, E) can be stored as an adjacency matrix (V² space) or adjacency lists (V + E space)." },
      { page: 12, text: "Breadth-first search (BFS) visits all neighbours of a vertex before moving to the next level, using a queue." },
      { page: 15, text: "Depth-first search (DFS) explores as far as possible along each branch before backtracking; it uses a stack or recursion." },
      { page: 24, text: "Dijkstra's algorithm repeatedly settles the vertex with the minimum tentative distance and relaxes its edges. Edge weights must be non-negative." },
      { page: 31, text: "A topological sort of a DAG orders vertices so that every edge goes from earlier to later; it can be obtained from DFS finish times." },
    ],
  },
  {
    subject: "CS301",
    unit: 4,
    fileName: "Graph_Algorithms_Worked_Examples.pptx",
    type: "pptx",
    sizeKb: 5120,
    pages: 22,
    sections: ["A", "B"],
    daysAgo: 7,
    passages: [
      { page: 9, text: "Worked example: Prim's and Kruskal's algorithms both build a minimum spanning tree; Kruskal sorts edges, Prim grows from a vertex." },
    ],
  },
  {
    subject: "CS301",
    unit: 3,
    fileName: "Trees_Unit3_Notes.pdf",
    type: "pdf",
    sizeKb: 1830,
    pages: 30,
    sections: ["A", "B", "C"],
    daysAgo: 25,
    passages: [
      { page: 4, text: "Inorder traversal of a binary search tree produces the keys in ascending order." },
      { page: 14, text: "An AVL tree keeps the balance factor of every node in {-1, 0, 1} using LL, RR, LR and RL rotations." },
      { page: 22, text: "A binary heap is a complete binary tree; build-heap runs in O(n) and heap sort in O(n log n)." },
    ],
  },
  {
    subject: "CS301",
    unit: 2,
    fileName: "Stacks_and_Queues.ppt",
    type: "ppt",
    sizeKb: 3300,
    pages: 26,
    sections: ["A", "B", "C"],
    daysAgo: 38,
    passages: [
      { page: 8, text: "Infix to postfix: operands go to output, operators are pushed after popping operators of higher or equal precedence." },
      { page: 17, text: "A circular queue reuses freed slots by wrapping rear and front with modulo arithmetic." },
    ],
  },
  {
    subject: "CS301",
    unit: 1,
    fileName: "Linked_Lists.pdf",
    type: "pdf",
    sizeKb: 1210,
    pages: 18,
    sections: ["A", "B", "C"],
    daysAgo: 50,
    passages: [{ page: 5, text: "In a singly linked list each node stores data and a pointer to the next node; insertion at the head is O(1)." }],
  },
  {
    subject: "CS302",
    unit: 2,
    fileName: "Logic_and_Proofs.pdf",
    type: "pdf",
    sizeKb: 980,
    pages: 20,
    sections: ["A", "B", "C"],
    daysAgo: 30,
    passages: [
      { page: 3, text: "The implication p → q is false only when p is true and q is false; it is equivalent to ¬p ∨ q." },
      { page: 16, text: "Mathematical induction proves P(n) for all n by proving a base case and the step P(k) ⇒ P(k+1)." },
    ],
  },
  {
    subject: "CS302",
    unit: 3,
    fileName: "Combinatorics_Slides.pptx",
    type: "pptx",
    sizeKb: 2650,
    pages: 28,
    sections: ["A", "B", "C"],
    daysAgo: 10,
    passages: [{ page: 11, text: "Pigeonhole principle: if n + 1 objects are placed into n boxes, some box contains at least two objects." }],
  },
  {
    subject: "CS303",
    unit: 3,
    fileName: "Pipelining_and_Hazards.pdf",
    type: "pdf",
    sizeKb: 2100,
    pages: 24,
    sections: ["A", "B"],
    daysAgo: 8,
    passages: [
      { page: 7, text: "Pipelining overlaps instruction stages (fetch, decode, execute, memory, write-back) to increase throughput." },
      { page: 15, text: "Hazards: structural, data (RAW, WAR, WAW) and control. Forwarding and stalls resolve data hazards." },
    ],
  },
  {
    subject: "CS303",
    unit: 4,
    fileName: "Cache_Memory.pdf",
    type: "pdf",
    sizeKb: 1650,
    pages: 19,
    sections: ["A", "B"],
    daysAgo: 3,
    passages: [{ page: 9, text: "Cache mapping techniques: direct, fully associative and set-associative mapping." }],
  },
  {
    subject: "CS304",
    unit: 2,
    fileName: "Inheritance_Polymorphism.pptx",
    type: "pptx",
    sizeKb: 4100,
    pages: 34,
    sections: ["A", "B", "C"],
    daysAgo: 16,
    passages: [
      { page: 12, text: "Method overriding: a subclass redefines a parent method with the same signature; the call is resolved at runtime." },
      { page: 21, text: "An interface declares methods a class must implement; a class may implement several interfaces." },
    ],
  },
  {
    subject: "CS305",
    unit: 1,
    fileName: "ER_Model.pdf",
    type: "pdf",
    sizeKb: 1400,
    pages: 21,
    sections: ["A", "B", "C"],
    daysAgo: 6,
    passages: [{ page: 5, text: "In an ER diagram, rectangles are entities, ellipses are attributes and diamonds are relationships." }],
  },
  {
    subject: "CS305",
    unit: 2,
    fileName: "SQL_Joins_Cheatsheet.pdf",
    type: "pdf",
    sizeKb: 640,
    pages: 6,
    sections: ["A", "B", "C"],
    daysAgo: 1,
    passages: [{ page: 2, text: "An INNER JOIN returns rows with matching keys in both tables; a LEFT JOIN keeps every row of the left table." }],
  },
];

// ---------- Assignments ----------

export type RawAssignment = {
  key: string;
  subject: string;
  unit: number | null;
  title: string;
  description: string;
  /** Positive = due in the future. */
  dueInDays: number;
  dueHour: number;
  sections: Section[];
  maxMarks: number | null;
  /** Status of the demo student, if already marked. */
  demoStatus?: "submitted" | "late" | "not_submitted";
  demoMarks?: number;
  demoRemark?: string;
};

export const rawAssignments: RawAssignment[] = [
  {
    key: "ds-graphs",
    subject: "CS301",
    unit: 4,
    title: "Graph traversal problem set",
    description: "Solve problems 1–8 from the handout: BFS/DFS traces, Dijkstra on the given network, and one topological sort. Submit on paper in class.",
    dueInDays: 2,
    dueHour: 10,
    sections: ["A", "B", "C"],
    maxMarks: 20,
  },
  {
    key: "dbms-er",
    subject: "CS305",
    unit: 1,
    title: "Library management ER diagram",
    description: "Draw a complete ER diagram for a library system with at least 6 entities. Mention cardinalities and keys.",
    dueInDays: 5,
    dueHour: 17,
    sections: ["A", "B", "C"],
    maxMarks: 10,
  },
  {
    key: "coa-pipeline",
    subject: "CS303",
    unit: 3,
    title: "Pipeline hazard analysis",
    description: "For the given instruction sequence, identify all hazards and show the pipeline diagram with forwarding.",
    dueInDays: 0,
    dueHour: 23,
    sections: ["A", "B"],
    maxMarks: 15,
  },
  {
    key: "oop-lab",
    subject: "CS304",
    unit: 2,
    title: "Shapes hierarchy (lab record)",
    description: "Write the Shape / Circle / Rectangle programs with an interface and abstract class. Attach printed output.",
    dueInDays: 9,
    dueHour: 12,
    sections: ["A", "B", "C"],
    maxMarks: 25,
  },
  {
    key: "ds-trees",
    subject: "CS301",
    unit: 3,
    title: "AVL insertion worksheet",
    description: "Insert the given 12 keys into an empty AVL tree and draw the tree after every rotation.",
    dueInDays: -6,
    dueHour: 10,
    sections: ["A", "B", "C"],
    maxMarks: 10,
    demoStatus: "submitted",
    demoMarks: 9,
    demoRemark: "Neat work. Watch the LR case in step 7.",
  },
  {
    key: "dm-logic",
    subject: "CS302",
    unit: 2,
    title: "Truth tables & proofs",
    description: "Prove the five statements by induction and build truth tables for the given formulas.",
    dueInDays: -12,
    dueHour: 10,
    sections: ["A", "B", "C"],
    maxMarks: 20,
    demoStatus: "late",
    demoMarks: 14,
    demoRemark: "Submitted a day late.",
  },
  {
    key: "ds-stacks",
    subject: "CS301",
    unit: 2,
    title: "Expression conversion",
    description: "Convert 10 infix expressions to postfix and prefix using a stack; show the stack at every step.",
    dueInDays: -20,
    dueHour: 10,
    sections: ["A", "B", "C"],
    maxMarks: 10,
    demoStatus: "not_submitted",
  },
  {
    key: "oop-basics",
    subject: "CS304",
    unit: 1,
    title: "Classes & constructors exercise",
    description: "Exercise 2.1–2.6 from the textbook.",
    dueInDays: -26,
    dueHour: 12,
    sections: ["A", "B", "C"],
    maxMarks: null,
    demoStatus: "submitted",
  },
];

// ---------- Demo student quiz history ----------

/** Unit-level (topic: null) or topic-level attempts. Score in %. */
export const rawQuizAttempts: { subject: string; unit: number; topic: string | null; score: number; daysAgo: number }[] = [
  { subject: "CS301", unit: 1, topic: null, score: 80, daysAgo: 40 },
  { subject: "CS301", unit: 2, topic: null, score: 60, daysAgo: 30 },
  { subject: "CS301", unit: 2, topic: "Infix to postfix conversion", score: 40, daysAgo: 29 },
  { subject: "CS301", unit: 3, topic: null, score: 70, daysAgo: 17 },
  { subject: "CS301", unit: 3, topic: null, score: 90, daysAgo: 13 },
  { subject: "CS301", unit: 4, topic: null, score: 72, daysAgo: 3 },
  { subject: "CS302", unit: 2, topic: null, score: 60, daysAgo: 21 },
  { subject: "CS304", unit: 1, topic: null, score: 85, daysAgo: 26 },
  { subject: "CS304", unit: 2, topic: null, score: 78, daysAgo: 11 },
  { subject: "CS305", unit: 1, topic: null, score: 50, daysAgo: 4 },
];

// ---------- Tutor history ----------

export const rawConversations: {
  key: string;
  scope: { subject: string; unit: number | null };
  title: string;
  daysAgo: number;
  messages: { role: "user" | "assistant"; content: string; cite?: { file: string; page: number }[] }[];
}[] = [
  {
    key: "bfs-vs-dfs",
    scope: { subject: "CS301", unit: 4 },
    title: "BFS vs DFS",
    daysAgo: 2,
    messages: [
      { role: "user", content: "What is the difference between BFS and DFS?" },
      {
        role: "assistant",
        content:
          "**BFS** explores level by level with a queue [S1], while **DFS** goes as deep as possible first using a stack or recursion [S2].\n\n**Example:** from vertex A, BFS visits all of A's neighbours before any of their neighbours.\n\n**Key points**\n- Both run in O(V + E)\n- BFS gives shortest paths in unweighted graphs [S1]",
        cite: [
          { file: "Lecture_Slides_Graphs.pdf", page: 12 },
          { file: "Lecture_Slides_Graphs.pdf", page: 15 },
        ],
      },
    ],
  },
  {
    key: "avl",
    scope: { subject: "CS301", unit: 3 },
    title: "When do AVL rotations happen?",
    daysAgo: 15,
    messages: [
      { role: "user", content: "When do we need a double rotation in AVL trees?" },
      {
        role: "assistant",
        content:
          "A double rotation is needed for the **LR** and **RL** cases — when the inserted node is in the inner subtree of the unbalanced node's child [S1].\n\n**Key points**\n- LL / RR → single rotation\n- LR / RL → two rotations",
        cite: [{ file: "Trees_Unit3_Notes.pdf", page: 14 }],
      },
    ],
  },
  {
    key: "sql",
    scope: { subject: "CS305", unit: null },
    title: "Left join vs inner join",
    daysAgo: 1,
    messages: [
      { role: "user", content: "left join vs inner join?" },
      {
        role: "assistant",
        content:
          "An **INNER JOIN** keeps only matching rows from both tables, while a **LEFT JOIN** keeps every row of the left table and fills missing matches with NULL [S1].",
        cite: [{ file: "SQL_Joins_Cheatsheet.pdf", page: 2 }],
      },
    ],
  },
];
