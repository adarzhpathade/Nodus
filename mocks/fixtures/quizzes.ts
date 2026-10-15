// Practice-quiz question bank (FE-1.11). Hand-written questions for the demo-heavy topics;
// every other topic gets a generated "which topic belongs here" question so any unit can be quizzed.
import type { QuizQuestion } from "@/contracts/ai";
import type { Topic, Unit } from "@/contracts/curriculum";
import { topicOf } from "./curriculum";
import { type Random } from "./ids";

type BankQuestion = Omit<QuizQuestion, "id" | "topicId">;

const BANK: Record<string, BankQuestion[]> = {
  [topicOf("CS301", "BFS").id]: [
    {
      question: "Which data structure does BFS use to decide the next vertex to visit?",
      options: ["Stack", "Queue", "Priority queue", "Hash table"],
      correctIndex: 1,
      explanation: "BFS visits vertices level by level, so it uses a FIFO queue.",
    },
    {
      question: "BFS on an unweighted graph finds…",
      options: ["The minimum spanning tree", "A topological order", "Shortest paths by number of edges", "All cycles"],
      correctIndex: 2,
      explanation: "Because BFS expands level by level, the first time it reaches a vertex is via the fewest edges.",
    },
  ],
  [topicOf("CS301", "DFS").id]: [
    {
      question: "What is the time complexity of DFS using an adjacency list?",
      options: ["O(V)", "O(E log V)", "O(V + E)", "O(V²)"],
      correctIndex: 2,
      explanation: "Each vertex and each edge is processed once: O(V + E).",
    },
    {
      question: "Which problem is naturally solved with DFS finish times?",
      options: ["Topological sorting", "Shortest path in weighted graphs", "Huffman coding", "Binary search"],
      correctIndex: 0,
      explanation: "Ordering vertices by decreasing DFS finish time gives a topological order of a DAG.",
    },
  ],
  [topicOf("CS301", "Dijkstra's algorithm").id]: [
    {
      question: "Dijkstra's algorithm can fail when the graph has…",
      options: ["Cycles", "Negative edge weights", "More than 100 vertices", "Undirected edges"],
      correctIndex: 1,
      explanation: "Dijkstra assumes a settled vertex's distance never decreases, which negative edges break.",
    },
    {
      question: "Using a binary heap, Dijkstra runs in…",
      options: ["O(V²)", "O(V + E)", "O((V + E) log V)", "O(E²)"],
      correctIndex: 2,
      explanation: "Each edge relaxation may cause a heap update costing O(log V).",
    },
  ],
  [topicOf("CS301", "Graph representation").id]: [
    {
      question: "An adjacency matrix for a graph with V vertices needs how much space?",
      options: ["O(V)", "O(E)", "O(V + E)", "O(V²)"],
      correctIndex: 3,
      explanation: "The matrix has one cell per vertex pair: V × V.",
    },
  ],
  [topicOf("CS301", "Binary search tree").id]: [
    {
      question: "Which traversal of a BST returns keys in sorted order?",
      options: ["Preorder", "Inorder", "Postorder", "Level order"],
      correctIndex: 1,
      explanation: "Inorder visits left subtree, node, right subtree — ascending order for a BST.",
    },
    {
      question: "Worst-case search time in an unbalanced BST with n nodes is…",
      options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
      correctIndex: 2,
      explanation: "A skewed BST degenerates into a linked list.",
    },
  ],
  [topicOf("CS301", "AVL trees").id]: [
    {
      question: "Inserting into the right subtree of a left child causes which case?",
      options: ["LL", "RR", "LR", "RL"],
      correctIndex: 2,
      explanation: "Left child, then right subtree = LR, fixed by a left rotation then a right rotation.",
    },
  ],
  [topicOf("CS301", "Heaps & heap sort").id]: [
    {
      question: "Building a heap from n elements bottom-up takes…",
      options: ["O(n)", "O(log n)", "O(n log n)", "O(n²)"],
      correctIndex: 0,
      explanation: "Most nodes are near the leaves and sift down only a little; the sum is O(n).",
    },
  ],
  [topicOf("CS301", "Stack ADT").id]: [
    {
      question: "Which operation is NOT O(1) on an array-based stack?",
      options: ["push", "pop", "peek", "search for an element"],
      correctIndex: 3,
      explanation: "Searching needs scanning the stack: O(n).",
    },
  ],
  [topicOf("CS301", "Infix to postfix conversion").id]: [
    {
      question: "What is the postfix form of A + B * C?",
      options: ["A B + C *", "A B C * +", "+ A * B C", "A B C + *"],
      correctIndex: 1,
      explanation: "* has higher precedence, so B C * is formed first, then + is applied.",
    },
    {
      question: "When converting infix to postfix, an opening parenthesis is…",
      options: ["Written to output", "Ignored", "Pushed on the stack", "Popped immediately"],
      correctIndex: 2,
      explanation: "'(' is pushed and stays until the matching ')' pops everything above it.",
    },
  ],
  [topicOf("CS302", "Propositional logic").id]: [
    {
      question: "p → q is logically equivalent to…",
      options: ["q → p", "¬p ∨ q", "p ∧ ¬q", "¬q → p"],
      correctIndex: 1,
      explanation: "An implication is false only when p is true and q is false, which is exactly ¬p ∨ q.",
    },
  ],
};

/** Questions for a unit (or one topic): bank questions first, then generated syllabus questions. */
export function buildQuestions(input: {
  unit: Unit;
  subjectName: string;
  unitTopics: Topic[];
  allTopics: Topic[];
  allUnits: Unit[];
  allSubjectNames: string[];
  topicId: string | null;
  count: number;
  random: Random;
  idPrefix: string;
}): QuizQuestion[] {
  const { unit, subjectName, unitTopics, allTopics, allUnits, allSubjectNames, topicId, count, random, idPrefix } = input;
  const scope = topicId ? unitTopics.filter((t) => t.id === topicId) : unitTopics;

  const banked = random.shuffle(scope.flatMap((topic) => (BANK[topic.id] ?? []).map((q) => ({ ...q, topicId: topic.id }))));

  /** Puts the right answer among 3 shuffled distractors. */
  const choice = (answer: string, distractors: string[]) => {
    const options = random.shuffle([answer, ...random.shuffle(distractors.filter((d) => d !== answer)).slice(0, 3)]);
    return { options, correctIndex: options.indexOf(answer) };
  };

  const generated = random.shuffle(
    scope.flatMap((topic) => [
      {
        topicId: topic.id,
        question: `Which of these topics is part of "${unit.title}"?`,
        ...choice(topic.title, allTopics.filter((t) => t.unitId !== unit.id).map((t) => t.title)),
        explanation: `"${topic.title}" is topic ${topic.order} of ${unit.title}. The others belong to different units.`,
      },
      {
        topicId: topic.id,
        question: `Which unit of ${subjectName} covers "${topic.title}"?`,
        ...choice(unit.title, allUnits.filter((u) => u.id !== unit.id).map((u) => u.title)),
        explanation: `"${topic.title}" is taught in unit ${unit.order}, ${unit.title}.`,
      },
      {
        topicId: topic.id,
        question: `"${topic.title}" is studied in which subject?`,
        ...choice(subjectName, allSubjectNames),
        explanation: `It is part of ${subjectName}.`,
      },
    ]),
  );

  return [...banked, ...generated].slice(0, count).map((q, index) => ({ id: `${idPrefix}-q${index + 1}`, ...q }));
}
