// Curriculum fixtures (FE-1.8): CSE, semesters 1–8, Semester 3 fully filled, 1–2 lighter, 4–8 locked.
import type { BranchOption } from "@/contracts/auth";
import type { Section } from "@/contracts/common";
import type { Prerequisite, Semester, Subject, Topic, Unit } from "@/contracts/curriculum";
import { mockId } from "./ids";

export const CURRENT_SEMESTER = 3;
export const SECTIONS: Section[] = ["A", "B", "C"];

export const BRANCH: BranchOption = {
  id: mockId("branch:CSE"),
  code: "CSE",
  name: "Computer Science & Engineering",
  sections: SECTIONS,
  semesters: [1, 2, 3, 4, 5, 6, 7, 8],
};

type RawUnit = { title: string; topics: string[] };
type RawSubject = { code: string; name: string; units: RawUnit[] };

const RAW: Record<number, RawSubject[]> = {
  1: [
    {
      code: "CS101",
      name: "Programming in C",
      units: [
        { title: "C Basics", topics: ["Data types & variables", "Operators & expressions", "Input & output", "Type conversion"] },
        { title: "Control Flow", topics: ["if-else & switch", "Loops", "break & continue", "Nested loops"] },
        { title: "Functions & Arrays", topics: ["Functions & scope", "Recursion", "1D arrays", "2D arrays", "Strings"] },
        { title: "Pointers & Structures", topics: ["Pointer basics", "Pointer arithmetic", "Structures & unions", "File handling"] },
      ],
    },
    {
      code: "MA101",
      name: "Engineering Mathematics I",
      units: [
        { title: "Differential Calculus", topics: ["Limits & continuity", "Mean value theorems", "Taylor series", "Partial derivatives"] },
        { title: "Matrices", topics: ["Rank of a matrix", "Systems of linear equations", "Eigenvalues & eigenvectors", "Cayley–Hamilton theorem"] },
        { title: "Integral Calculus", topics: ["Definite integrals", "Beta & gamma functions", "Double integrals", "Area & volume"] },
      ],
    },
    {
      code: "PH101",
      name: "Engineering Physics",
      units: [
        { title: "Optics", topics: ["Interference", "Diffraction", "Polarisation", "Lasers"] },
        { title: "Quantum Mechanics", topics: ["Wave–particle duality", "Uncertainty principle", "Schrödinger equation", "Particle in a box"] },
        { title: "Semiconductors", topics: ["Band theory", "Intrinsic & extrinsic semiconductors", "p-n junction", "Hall effect"] },
      ],
    },
    {
      code: "EE101",
      name: "Basic Electrical Engineering",
      units: [
        { title: "DC Circuits", topics: ["Ohm's & Kirchhoff's laws", "Mesh & nodal analysis", "Thevenin's theorem", "Superposition"] },
        { title: "AC Circuits", topics: ["Phasors", "RLC circuits", "Power factor", "Three-phase systems"] },
        { title: "Electrical Machines", topics: ["Transformers", "DC motors", "Induction motors", "Electrical safety"] },
      ],
    },
  ],
  2: [
    {
      code: "CS201",
      name: "Digital Logic Design",
      units: [
        { title: "Number Systems & Codes", topics: ["Binary, octal & hex", "Complements", "BCD & Gray code", "Error-detecting codes"] },
        { title: "Boolean Algebra", topics: ["Boolean laws", "Logic gates", "K-maps", "Quine–McCluskey"] },
        { title: "Combinational Circuits", topics: ["Adders & subtractors", "Multiplexers", "Decoders & encoders", "Comparators"] },
        { title: "Sequential Circuits", topics: ["Latches & flip-flops", "Registers", "Counters", "State machines"] },
      ],
    },
    {
      code: "MA201",
      name: "Engineering Mathematics II",
      units: [
        { title: "Differential Equations", topics: ["First-order ODEs", "Linear ODEs", "Cauchy–Euler equations", "Applications of ODEs"] },
        { title: "Vector Calculus", topics: ["Gradient, divergence & curl", "Line integrals", "Green's theorem", "Stokes' theorem"] },
        { title: "Probability", topics: ["Probability axioms", "Random variables", "Binomial & Poisson", "Normal distribution"] },
      ],
    },
    {
      code: "CS202",
      name: "Python Programming",
      units: [
        { title: "Python Basics", topics: ["Variables & types", "Control flow", "Functions", "Modules"] },
        { title: "Data Structures in Python", topics: ["Lists & tuples", "Dictionaries & sets", "Comprehensions", "String methods"] },
        { title: "OOP & Files", topics: ["Classes in Python", "Inheritance in Python", "File I/O", "Exceptions in Python"] },
      ],
    },
    {
      code: "HS201",
      name: "Communication Skills",
      units: [
        { title: "Written Communication", topics: ["Formal letters", "Report writing", "Emails", "Résumés"] },
        { title: "Oral Communication", topics: ["Presentations", "Group discussions", "Interviews", "Active listening"] },
      ],
    },
  ],
  3: [
    {
      code: "CS301",
      name: "Data Structures",
      units: [
        {
          title: "Arrays & Linked Lists",
          topics: ["Array operations", "Singly linked list", "Doubly linked list", "Circular linked list", "Sparse matrices"],
        },
        {
          title: "Stacks & Queues",
          topics: ["Stack ADT", "Infix to postfix conversion", "Queue & circular queue", "Deque", "Priority queue"],
        },
        { title: "Trees", topics: ["Binary tree traversals", "Binary search tree", "AVL trees", "Heaps & heap sort", "B-trees"] },
        {
          title: "Graphs",
          topics: ["Graph representation", "BFS", "DFS", "Dijkstra's algorithm", "Topological sort", "Minimum spanning tree"],
        },
        { title: "Sorting & Hashing", topics: ["Quick sort", "Merge sort", "Hash functions", "Collision resolution"] },
      ],
    },
    {
      code: "CS302",
      name: "Discrete Mathematics",
      units: [
        {
          title: "Sets, Relations & Functions",
          topics: ["Sets & operations", "Relations & properties", "Equivalence relations", "Functions & composition", "Partial orders"],
        },
        { title: "Logic & Proofs", topics: ["Propositional logic", "Predicates & quantifiers", "Rules of inference", "Proof by induction"] },
        {
          title: "Combinatorics",
          topics: ["Permutations & combinations", "Pigeonhole principle", "Inclusion–exclusion", "Recurrence relations", "Generating functions"],
        },
        {
          title: "Graph Theory",
          topics: ["Graph terminology", "Euler & Hamiltonian paths", "Planar graphs", "Graph colouring", "Trees & spanning trees"],
        },
      ],
    },
    {
      code: "CS303",
      name: "Computer Organization & Architecture",
      units: [
        { title: "Basic Structure of Computers", topics: ["Functional units", "Bus structures", "Instruction cycle", "Performance measures"] },
        { title: "Instruction Set Architecture", topics: ["Addressing modes", "Instruction formats", "RISC vs CISC", "Stack organisation"] },
        {
          title: "Processor & Control Unit",
          topics: ["ALU design", "Hardwired control", "Microprogrammed control", "Pipelining", "Pipeline hazards"],
        },
        { title: "Memory Organisation", topics: ["Memory hierarchy", "Cache mapping", "Virtual memory", "Page replacement"] },
        { title: "I/O Organisation", topics: ["Interrupts", "DMA", "I/O interfaces", "Serial vs parallel transfer"] },
      ],
    },
    {
      code: "CS304",
      name: "Object Oriented Programming",
      units: [
        { title: "OOP Fundamentals", topics: ["Classes & objects", "Constructors", "Encapsulation", "Static members"] },
        {
          title: "Inheritance & Polymorphism",
          topics: ["Inheritance types", "Method overriding", "Abstract classes", "Interfaces", "Dynamic dispatch"],
        },
        {
          title: "Exceptions & Packages",
          topics: ["Exception hierarchy", "try-catch-finally", "Custom exceptions", "Packages & access modifiers"],
        },
        { title: "Collections & Generics", topics: ["List & ArrayList", "Set & Map", "Generics", "Iterators & comparators"] },
        {
          title: "Multithreading",
          topics: ["Thread lifecycle", "Runnable vs Thread", "Synchronization", "Inter-thread communication"],
        },
      ],
    },
    {
      code: "CS305",
      name: "Database Management Systems",
      units: [
        { title: "Introduction & ER Model", topics: ["DBMS architecture", "Data models", "ER diagrams", "Keys & constraints"] },
        { title: "Relational Model & SQL", topics: ["Relational algebra", "SQL DDL & DML", "Joins", "Subqueries", "Views"] },
        { title: "Normalization", topics: ["Functional dependencies", "1NF, 2NF & 3NF", "BCNF", "Decomposition"] },
        {
          title: "Transactions & Concurrency",
          topics: ["ACID properties", "Schedules & serializability", "Locking protocols", "Deadlocks"],
        },
        { title: "Indexing & Storage", topics: ["File organisation", "B+ tree index", "Hash index", "Query processing basics"] },
      ],
    },
  ],
};

/** [subject code, prerequisite subject code] — Semester 3 only (edges are drawn inside one semester tree). */
const RAW_PREREQUISITES: [string, string][] = [
  ["CS301", "CS302"],
  ["CS305", "CS301"],
  ["CS305", "CS302"],
];

// ---------- Built, contract-typed entities ----------

export const semesters: Semester[] = BRANCH.semesters.map((number) => ({
  id: mockId(`semester:${number}`),
  number,
  locked: number > CURRENT_SEMESTER,
  isCurrent: number === CURRENT_SEMESTER,
}));

export const subjects: Subject[] = [];
export const units: Unit[] = [];
export const topics: Topic[] = [];

for (const [semesterNumber, rawSubjects] of Object.entries(RAW)) {
  rawSubjects.forEach((rawSubject, subjectIndex) => {
    const subjectId = mockId(`subject:${rawSubject.code}`);
    subjects.push({
      id: subjectId,
      semesterNumber: Number(semesterNumber),
      code: rawSubject.code,
      name: rawSubject.name,
      order: subjectIndex + 1,
    });
    rawSubject.units.forEach((rawUnit, unitIndex) => {
      const unitId = mockId(`unit:${rawSubject.code}:${unitIndex + 1}`);
      units.push({ id: unitId, subjectId, title: rawUnit.title, order: unitIndex + 1 });
      rawUnit.topics.forEach((title, topicIndex) => {
        topics.push({ id: mockId(`topic:${rawSubject.code}:${unitIndex + 1}:${title}`), unitId, title, order: topicIndex + 1 });
      });
    });
  });
}

export const prerequisites: Prerequisite[] = RAW_PREREQUISITES.map(([code, prerequisiteCode]) => ({
  subjectId: mockId(`subject:${code}`),
  prerequisiteSubjectId: mockId(`subject:${prerequisiteCode}`),
}));

// ---------- Lookups used by other fixtures ----------

export function subjectByCode(code: string): Subject {
  const subject = subjects.find((s) => s.code === code);
  if (!subject) throw new Error(`Unknown subject fixture ${code}`);
  return subject;
}

export function unitOf(code: string, unitOrder: number): Unit {
  const subject = subjectByCode(code);
  const unit = units.find((u) => u.subjectId === subject.id && u.order === unitOrder);
  if (!unit) throw new Error(`Unknown unit fixture ${code}/${unitOrder}`);
  return unit;
}

/** Find a topic by subject code + exact title (titles are unique within a subject). */
export function topicOf(code: string, title: string): Topic {
  const subject = subjectByCode(code);
  const unitIds = new Set(units.filter((u) => u.subjectId === subject.id).map((u) => u.id));
  const topic = topics.find((t) => unitIds.has(t.unitId) && t.title === title);
  if (!topic) throw new Error(`Unknown topic fixture ${code}/${title}`);
  return topic;
}
