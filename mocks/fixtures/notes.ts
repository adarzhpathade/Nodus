// Hand-written notes of the demo student (FE-1.9). More short notes are generated in mocks/store.ts
// so every subject gets a realistic coverage spread.
//
// In-content links use the `nodus://<type>/<id>` href scheme (proposed to BE in the FE-1.7 review);
// the same links are also stored in the links table, which is what backlinks are computed from.
import type { LinkTarget } from "@/contracts/notes";
import { topicOf, unitOf } from "./curriculum";
import { mockId } from "./ids";

export type RawNote = {
  key: string;
  subject: string;
  topic: string;
  title: string;
  tags: string[];
  /** Created this many days before "today"; updated `editedDaysAgo` (defaults to created). */
  daysAgo: number;
  editedDaysAgo?: number;
  contentMd: string;
  links: LinkTarget[];
};

export const noteId = (key: string) => mockId(`note:${key}`);
const note = (key: string): LinkTarget => ({ type: "note", id: noteId(key) });
const topic = (code: string, title: string): LinkTarget => ({ type: "topic", id: topicOf(code, title).id });
const unit = (code: string, order: number): LinkTarget => ({ type: "unit", id: unitOf(code, order).id });
const href = (target: LinkTarget) => `nodus://${target.type}/${target.id}`;

export const rawNotes: RawNote[] = [
  {
    key: "bfs",
    subject: "CS301",
    topic: "BFS",
    title: "Breadth-first search",
    tags: ["graphs", "algorithms", "exam"],
    daysAgo: 9,
    editedDaysAgo: 2,
    contentMd: `# Breadth-first search

BFS explores a graph **level by level** from a source vertex using a **queue**.

## Steps
1. Mark the source visited and enqueue it.
2. Dequeue a vertex \`u\`; for every unvisited neighbour \`v\`, mark it and enqueue it.
3. Repeat until the queue is empty.

## Complexity
- Time: **O(V + E)** with an adjacency list
- Space: O(V) for the queue and visited array

## Why it matters
- Finds the **shortest path in an unweighted graph** (fewest edges).
- Used for level-order traversal, bipartite check, and connected components.

Compare with [DFS](${href(note("dfs"))}) — same complexity, different order. For weighted graphs use [Dijkstra](${href(note("dijkstra"))}).

- [x] Trace BFS on the slide 12 example
- [ ] Write BFS for an adjacency matrix`,
    links: [note("dfs"), note("dijkstra")],
  },
  {
    key: "dfs",
    subject: "CS301",
    topic: "DFS",
    title: "Depth-first search",
    tags: ["graphs", "algorithms"],
    daysAgo: 8,
    contentMd: `# Depth-first search

DFS goes **as deep as possible** before backtracking. Implemented with recursion (call stack) or an explicit **stack**.

\`\`\`c
void dfs(int u) {
  visited[u] = 1;
  for (int v = 0; v < n; v++)
    if (adj[u][v] && !visited[v]) dfs(v);
}
\`\`\`

## Uses
- Detecting cycles
- [Topological sort](${href(topic("CS301", "Topological sort"))}) (finish-time order)
- Finding connected / strongly connected components

Time **O(V + E)**, same as [BFS](${href(note("bfs"))}).

- [ ] Practise cycle detection in a directed graph`,
    links: [note("bfs"), topic("CS301", "Topological sort")],
  },
  {
    key: "dijkstra",
    subject: "CS301",
    topic: "Dijkstra's algorithm",
    title: "Dijkstra's shortest path",
    tags: ["graphs", "algorithms", "exam"],
    daysAgo: 6,
    editedDaysAgo: 1,
    contentMd: `# Dijkstra's algorithm

Single-source shortest paths for graphs with **non-negative** edge weights.

## Idea
Greedy: always settle the unvisited vertex with the smallest tentative distance, then **relax** its edges.

| Implementation | Time |
|---|---|
| Array | O(V²) |
| Binary heap ([priority queue](${href(topic("CS301", "Priority queue"))})) | O((V + E) log V) |

## Relaxation
\`if dist[u] + w(u, v) < dist[v] then dist[v] = dist[u] + w(u, v)\`

> Fails with negative edges → use Bellman–Ford.

Builds on the same frontier idea as [BFS](${href(note("bfs"))}).

- [ ] Solve the 6-vertex example from the PPT
- [ ] Compare with Prim's MST`,
    links: [note("bfs"), topic("CS301", "Priority queue")],
  },
  {
    key: "graph-representation",
    subject: "CS301",
    topic: "Graph representation",
    title: "Adjacency matrix vs list",
    tags: ["graphs"],
    daysAgo: 11,
    contentMd: `# Graph representation

| | Adjacency matrix | Adjacency list |
|---|---|---|
| Space | O(V²) | O(V + E) |
| Edge check | O(1) | O(degree) |
| Best for | Dense graphs | Sparse graphs |

Terminology (degree, path, cycle) is covered in [Discrete Maths – Graph Theory](${href(unit("CS302", 4))}).`,
    links: [unit("CS302", 4)],
  },
  {
    key: "bst",
    subject: "CS301",
    topic: "Binary search tree",
    title: "Binary search trees",
    tags: ["trees"],
    daysAgo: 20,
    contentMd: `# Binary search tree

For every node: **left subtree < node < right subtree**.

## Operations (average / worst)
- Search, insert, delete: O(log n) / **O(n)** when the tree is skewed

## Delete cases
1. Leaf → remove it
2. One child → replace with the child
3. Two children → replace with the **inorder successor**

Inorder traversal of a BST gives sorted order. Balanced version: [AVL trees](${href(note("avl"))}).`,
    links: [note("avl")],
  },
  {
    key: "avl",
    subject: "CS301",
    topic: "AVL trees",
    title: "AVL trees and rotations",
    tags: ["trees", "exam"],
    daysAgo: 18,
    contentMd: `# AVL trees

Self-balancing [BST](${href(note("bst"))}): balance factor = height(left) − height(right) ∈ {−1, 0, 1}.

## Rotations
- **LL** → single right rotation
- **RR** → single left rotation
- **LR** → left then right
- **RL** → right then left

All operations are **O(log n)** guaranteed.

- [ ] Insert 10, 20, 30, 25, 28 and draw every rotation`,
    links: [note("bst")],
  },
  {
    key: "heaps",
    subject: "CS301",
    topic: "Heaps & heap sort",
    title: "Heaps and heap sort",
    tags: ["trees", "sorting"],
    daysAgo: 16,
    contentMd: `# Heaps

Complete binary tree stored in an array. **Max-heap**: parent ≥ children.

- Parent of i = (i − 1) / 2, children = 2i + 1 and 2i + 2
- Insert / delete-max: O(log n), build-heap: **O(n)**

## Heap sort
Build a max-heap, then repeatedly swap the root with the last element and heapify. O(n log n), in place, not stable.

Heaps implement the [priority queue](${href(topic("CS301", "Priority queue"))}).`,
    links: [topic("CS301", "Priority queue")],
  },
  {
    key: "traversals",
    subject: "CS301",
    topic: "Binary tree traversals",
    title: "Tree traversals",
    tags: ["trees"],
    daysAgo: 22,
    contentMd: `# Binary tree traversals

- **Preorder**: root, left, right
- **Inorder**: left, root, right
- **Postorder**: left, right, root
- **Level order**: uses a queue (same idea as [BFS](${href(note("bfs"))}))

Preorder + inorder uniquely identify a binary tree.`,
    links: [note("bfs")],
  },
  {
    key: "stack-adt",
    subject: "CS301",
    topic: "Stack ADT",
    title: "Stack ADT",
    tags: ["stacks"],
    daysAgo: 34,
    contentMd: `# Stack

**LIFO** structure. Operations: push, pop, peek, isEmpty — all O(1).

Array implementation: \`top\` index; overflow when top = MAX − 1.
Linked implementation: push/pop at the head.

Applications: function calls, undo, [infix → postfix](${href(note("infix-postfix"))}), balanced parentheses.`,
    links: [note("infix-postfix")],
  },
  {
    key: "infix-postfix",
    subject: "CS301",
    topic: "Infix to postfix conversion",
    title: "Infix to postfix",
    tags: ["stacks"],
    daysAgo: 32,
    contentMd: `# Infix to postfix

Scan left to right:
- Operand → output
- \`(\` → push
- \`)\` → pop to output until \`(\`
- Operator → pop operators with higher/equal precedence, then push

Example: \`A + B * C\` → \`A B C * +\`

- [ ] Still confused about right-associative ^ — revise`,
    links: [],
  },
  {
    key: "linked-list",
    subject: "CS301",
    topic: "Singly linked list",
    title: "Singly linked list",
    tags: ["linked-lists"],
    daysAgo: 45,
    contentMd: `# Singly linked list

Each node holds \`data\` and \`next\`. Head pointer marks the start.

| Operation | Time |
|---|---|
| Insert at head | O(1) |
| Insert at tail (no tail ptr) | O(n) |
| Search | O(n) |

Reverse a list iteratively with three pointers: prev, curr, next.`,
    links: [],
  },
  {
    key: "prop-logic",
    subject: "CS302",
    topic: "Propositional logic",
    title: "Propositional logic basics",
    tags: ["logic"],
    daysAgo: 27,
    contentMd: `# Propositional logic

Connectives: ¬, ∧, ∨, →, ↔.

- p → q ≡ ¬p ∨ q
- Contrapositive ¬q → ¬p is equivalent; converse q → p is **not**
- Tautology: always true; contradiction: always false

De Morgan: ¬(p ∧ q) ≡ ¬p ∨ ¬q`,
    links: [],
  },
  {
    key: "induction",
    subject: "CS302",
    topic: "Proof by induction",
    title: "Mathematical induction",
    tags: ["logic", "proofs"],
    daysAgo: 24,
    contentMd: `# Proof by induction

1. **Base case**: prove P(1)
2. **Inductive step**: assume P(k), prove P(k + 1)

Example: 1 + 2 + … + n = n(n + 1) / 2.

Strong induction assumes P(1) … P(k). Useful for [recurrences](${href(topic("CS302", "Recurrence relations"))}).`,
    links: [topic("CS302", "Recurrence relations")],
  },
  {
    key: "interfaces",
    subject: "CS304",
    topic: "Interfaces",
    title: "Interfaces in Java",
    tags: ["java", "oop"],
    daysAgo: 14,
    contentMd: `# Interfaces

A contract of methods a class promises to implement. A class can implement **many** interfaces (Java's answer to multiple inheritance).

\`\`\`java
interface Shape { double area(); }
class Circle implements Shape {
  double r;
  public double area() { return Math.PI * r * r; }
}
\`\`\`

Since Java 8: \`default\` and \`static\` methods allowed. Compare with [abstract classes](${href(topic("CS304", "Abstract classes"))}).`,
    links: [topic("CS304", "Abstract classes")],
  },
  {
    key: "overriding",
    subject: "CS304",
    topic: "Method overriding",
    title: "Overriding vs overloading",
    tags: ["java", "oop", "exam"],
    daysAgo: 15,
    contentMd: `# Method overriding

Subclass provides its own version of a parent method — **same signature**. Resolved at **runtime** (dynamic dispatch).

| | Overloading | Overriding |
|---|---|---|
| Where | Same class | Subclass |
| Signature | Different params | Same |
| Binding | Compile time | Runtime |

Use \`@Override\` so the compiler checks it.`,
    links: [],
  },
  {
    key: "er",
    subject: "CS305",
    topic: "ER diagrams",
    title: "ER diagram notation",
    tags: ["dbms"],
    daysAgo: 5,
    contentMd: `# ER diagrams

- Rectangle = entity, ellipse = attribute, diamond = relationship
- Double ellipse = multivalued, dashed = derived
- Cardinality: 1:1, 1:N, M:N

- [ ] Draw the library-management ER diagram from the assignment`,
    links: [],
  },
];
