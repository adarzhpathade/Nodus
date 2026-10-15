// Text generators for seeded notes, faculty slides and quiz questions. Owner: BE.
// A few Algorithms → Graphs topics are hand-written so the demo story reads well.

type Random = { pick: <T>(items: readonly T[]) => T; chance: (p: number) => boolean };

const HANDWRITTEN_NOTES: Record<string, string> = {
  BFS: `# BFS (Breadth-First Search)

## Key idea
Visit the graph **level by level** from a source vertex using a **queue** (FIFO).

## Steps
1. Push the source, mark it visited.
2. Pop a vertex, visit all **unvisited neighbours**, mark and push them.
3. Repeat until the queue is empty.

## Complexity
- Time: **O(V + E)** with an adjacency list
- Space: **O(V)** for the queue and visited array

## Why it matters
- Gives the **shortest path in an unweighted graph**.
- Used for level-order traversal, bipartite check, connected components.

> Exam tip: draw the queue state after every step.`,
  DFS: `# DFS (Depth-First Search)

## Key idea
Go **as deep as possible** before backtracking — uses a **stack** (or recursion).

## Steps
1. Visit a vertex and mark it.
2. Recursively visit each unvisited neighbour.
3. Backtrack when no unvisited neighbour is left.

## Complexity
- Time: **O(V + E)**, space **O(V)** (recursion depth)

## Uses
- Cycle detection, **topological sort**, strongly connected components, maze solving.

BFS vs DFS → see my BFS note: BFS = queue + levels, DFS = stack + depth.`,
  "Dijkstra's Algorithm": `# Dijkstra's Algorithm

## Problem
Single-source shortest paths in a graph with **non-negative** edge weights.

## Steps
1. dist[source] = 0, every other dist = ∞.
2. Use a **min-priority queue**; pop the vertex with the smallest dist.
3. **Relax** each edge (u, v): if dist[u] + w < dist[v], update dist[v].

## Complexity
- **O((V + E) log V)** with a binary heap

## Watch out
- ❌ Fails with negative edges → use Bellman-Ford.`,
};

const ANGLES = [
  "Key idea",
  "Definition",
  "How it works",
  "Important points",
  "Example",
  "Exam notes",
];

export function noteMarkdown(topic: string, subject: string, unit: string, random: Random): string {
  const handwritten = HANDWRITTEN_NOTES[topic];
  if (handwritten) return handwritten;

  const sections = [
    `# ${topic}`,
    `*${subject} › ${unit}*`,
    `## ${random.pick(ANGLES)}`,
    `${topic} is a core idea in **${unit.toLowerCase()}**. Summarised from the lecture slides in my own words.`,
    "## Points to remember",
    `- Definition and notation of ${topic.toLowerCase()}`,
    `- Where ${topic.toLowerCase()} is used and why it matters`,
    `- One solved example from class`,
  ];
  if (random.chance(0.5)) sections.push("## Doubts", `- [ ] Revise ${topic.toLowerCase()} before the unit test`);
  if (random.chance(0.4)) sections.push("> Exam tip: write the definition first, then a small example.");
  return sections.join("\n\n");
}

export function noteTitle(topic: string, random: Random): string {
  return random.pick([topic, `${topic} — notes`, `${topic} summary`, `Revision: ${topic}`]);
}

export function excerptOf(markdown: string): string {
  return markdown
    .replace(/[#>*`_\-\[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

/** Text of the faculty slide for a topic — goes into the PDF page and the RAG chunk. */
export function slideText(topic: string, unit: string, subject: string): string[] {
  const special: Record<string, string[]> = {
    BFS: [
      "Breadth-first search visits all neighbours of a vertex before moving to the next level.",
      "It uses a FIFO queue and a visited array. Running time is O(V + E) with adjacency lists.",
      "In an unweighted graph, BFS from the source gives the shortest path (fewest edges) to every vertex.",
    ],
    DFS: [
      "Depth-first search explores as far as possible along each branch before backtracking.",
      "It is implemented with recursion or an explicit stack. Running time is O(V + E).",
      "DFS is the basis of cycle detection, topological sorting and finding strongly connected components.",
    ],
    "Minimum Spanning Trees": [
      "A minimum spanning tree connects all vertices of a weighted undirected graph with minimum total weight.",
      "Kruskal's algorithm sorts edges and adds the lightest edge that does not form a cycle (uses Disjoint Set Union).",
      "Prim's algorithm grows the tree from a start vertex using a priority queue of crossing edges.",
    ],
  };
  return (
    special[topic] ?? [
      `${topic} — ${unit} (${subject}).`,
      `This slide introduces ${topic.toLowerCase()}: the definition, the standard notation and why it is studied in this unit.`,
      `Worked example and key properties of ${topic.toLowerCase()} are discussed in the lecture; refer to the textbook chapter for proofs.`,
    ]
  );
}

export type SeedQuestion = {
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
};

const HANDWRITTEN_QUESTIONS: Record<string, SeedQuestion> = {
  BFS: {
    question: "Which data structure does BFS use to decide the next vertex to visit?",
    options: ["Stack", "Queue", "Priority queue", "Hash table"],
    correctIndex: 1,
    explanation: "BFS processes vertices level by level, which is exactly FIFO order — a queue.",
  },
  DFS: {
    question: "Which problem is most directly solved using DFS?",
    options: ["Shortest path in a weighted graph", "Topological sorting of a DAG", "Minimum spanning tree", "Level-order traversal"],
    correctIndex: 1,
    explanation: "Reverse DFS finishing order gives a topological order of a DAG.",
  },
  "Dijkstra's Algorithm": {
    question: "Dijkstra's algorithm can give wrong answers when the graph has…",
    options: ["Cycles", "Negative edge weights", "More than 1000 vertices", "Undirected edges"],
    correctIndex: 1,
    explanation: "Dijkstra assumes a settled vertex's distance never decreases, which negative edges break.",
  },
  "Topological Sort": {
    question: "A topological order exists only for…",
    options: ["Trees", "Directed acyclic graphs", "Complete graphs", "Bipartite graphs"],
    correctIndex: 1,
    explanation: "A cycle makes it impossible to place every vertex before all of its successors.",
  },
  "Minimum Spanning Trees": {
    question: "Kruskal's algorithm uses which structure to avoid cycles?",
    options: ["Queue", "Disjoint Set Union", "Stack", "Segment tree"],
    correctIndex: 1,
    explanation: "DSU checks in near-constant time whether an edge joins two different components.",
  },
};

export function quizQuestion(topic: string, unit: string, random: Random): SeedQuestion {
  const handwritten = HANDWRITTEN_QUESTIONS[topic];
  if (handwritten) return handwritten;
  const correct = `${topic} is a core concept of ${unit.toLowerCase()} covered in this unit`;
  const wrong = [
    `${topic} is only used in hardware design`,
    `${topic} has no practical applications`,
    `${topic} was removed from the syllabus`,
  ];
  const correctIndex = random.pick([0, 1, 2, 3]);
  const options = [...wrong];
  options.splice(correctIndex, 0, correct);
  return {
    question: `Which statement about ${topic} is correct?`,
    options: options as [string, string, string, string],
    correctIndex,
    explanation: `${topic} is part of "${unit}"; review the unit slides for its definition and uses.`,
  };
}

export const TAG_POOL = ["exam", "important", "revise", "lab", "formula", "doubt"] as const;
