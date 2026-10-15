// CSE syllabus used by the seed. Replace with the college's real syllabus when available (H-05). Owner: BE.

export type SeedUnit = { title: string; topics: string[] };
export type SeedSubject = { code: string; name: string; units: SeedUnit[]; prerequisites?: string[] };
export type SeedSemester = { number: number; subjects: SeedSubject[] };

const u = (title: string, topics: string[]): SeedUnit => ({ title, topics });

export const BRANCH = { code: "CSE", name: "Computer Science & Engineering", sections: ["A", "B", "C"] };

/** Semester the seeded students are currently in. */
export const CURRENT_SEMESTER = 3;

export const SYLLABUS: SeedSemester[] = [
  {
    number: 1,
    subjects: [
      {
        code: "MA101",
        name: "Engineering Mathematics I",
        units: [
          u("Differential Calculus", ["Limits & Continuity", "Derivatives", "Taylor Series", "Partial Derivatives"]),
          u("Integral Calculus", ["Definite Integrals", "Beta & Gamma Functions", "Multiple Integrals", "Applications of Integrals"]),
          u("Matrices", ["Rank of a Matrix", "Systems of Linear Equations", "Eigenvalues & Eigenvectors", "Cayley–Hamilton Theorem"]),
          u("Vector Calculus", ["Gradient", "Divergence & Curl", "Line Integrals", "Green's Theorem"]),
        ],
      },
      {
        code: "CS101",
        name: "Programming for Problem Solving",
        units: [
          u("Basics of C", ["Algorithms & Flowcharts", "Variables & Data Types", "Operators", "Input & Output"]),
          u("Control Structures", ["If-Else", "Switch", "Loops", "Break & Continue"]),
          u("Functions & Arrays", ["Functions", "Recursion", "1D Arrays", "2D Arrays"]),
          u("Pointers & Structures", ["Pointers", "Dynamic Memory", "Structures", "File Handling"]),
        ],
      },
      {
        code: "PH101",
        name: "Engineering Physics",
        units: [
          u("Quantum Mechanics", ["Wave–Particle Duality", "Uncertainty Principle", "Schrödinger Equation", "Particle in a Box"]),
          u("Optics", ["Interference", "Diffraction", "Polarization", "Lasers"]),
          u("Electromagnetism", ["Maxwell's Equations", "EM Waves", "Poynting Vector", "Dielectrics"]),
          u("Semiconductors", ["Band Theory", "Intrinsic & Extrinsic Semiconductors", "p-n Junction", "Hall Effect"]),
        ],
      },
      {
        code: "EE101",
        name: "Basic Electrical Engineering",
        units: [
          u("DC Circuits", ["Ohm's Law", "Kirchhoff's Laws", "Network Theorems", "Mesh & Nodal Analysis"]),
          u("AC Circuits", ["Phasors", "RLC Circuits", "Power Factor", "Resonance"]),
          u("Transformers", ["Construction", "EMF Equation", "Losses & Efficiency", "Auto-transformer"]),
          u("Electrical Machines", ["DC Motors", "Induction Motors", "Synchronous Machines", "Electrical Safety"]),
        ],
      },
    ],
  },
  {
    number: 2,
    subjects: [
      {
        code: "MA102",
        name: "Engineering Mathematics II",
        prerequisites: ["MA101"],
        units: [
          u("Ordinary Differential Equations", ["First-Order ODEs", "Linear ODEs", "Higher-Order ODEs", "Applications of ODEs"]),
          u("Laplace Transform", ["Definition of Laplace Transform", "Properties", "Inverse Laplace", "Solving ODEs with Laplace"]),
          u("Fourier Series", ["Periodic Functions", "Euler's Formulae", "Half-Range Series", "Fourier Transform"]),
          u("Probability", ["Probability Basics", "Random Variables", "Distributions", "Expectation & Variance"]),
        ],
      },
      {
        code: "CS102",
        name: "Introduction to Data Structures",
        prerequisites: ["CS101"],
        units: [
          u("Foundations", ["Abstract Data Types", "Arrays Revisited", "Linear & Binary Search", "Sorting Basics"]),
          u("Linked Structures", ["Singly Linked Lists", "Stack ADT", "Queue ADT", "Applications of Stacks"]),
          u("Introduction to Trees", ["Tree Terminology", "Binary Trees", "Tree Traversals", "Expression Trees"]),
          u("Introduction to Graphs", ["Graph Terminology", "Adjacency Matrix", "Adjacency List", "Simple Traversals"]),
        ],
      },
      {
        code: "CH102",
        name: "Engineering Chemistry",
        units: [
          u("Atomic Structure", ["Molecular Orbital Theory", "Chemical Bonding", "Hybridization", "Coordination Compounds"]),
          u("Electrochemistry", ["Electrode Potential", "Batteries", "Corrosion", "Fuel Cells"]),
          u("Polymers", ["Polymerization", "Plastics", "Rubbers", "Conducting Polymers"]),
          u("Water Technology", ["Hardness of Water", "Softening Methods", "Boiler Problems", "Water Purification"]),
        ],
      },
      {
        code: "EC102",
        name: "Digital Electronics",
        units: [
          u("Number Systems & Logic", ["Binary & Hexadecimal", "Codes", "Boolean Algebra", "Logic Gates"]),
          u("Combinational Logic", ["Karnaugh Maps", "Adders & Subtractors", "Multiplexers", "Decoders & Encoders"]),
          u("Sequential Logic", ["Latches & Flip-Flops", "Registers", "Counters", "State Machines"]),
          u("Memories & Logic Families", ["ROM & RAM", "Programmable Logic Devices", "TTL", "CMOS"]),
        ],
      },
    ],
  },
  {
    number: 3,
    subjects: [
      {
        code: "CS201",
        name: "Data Structures & Algorithms",
        prerequisites: ["CS102"],
        units: [
          u("Complexity & Linear Structures", ["Asymptotic Notation", "Arrays", "Linked Lists", "Stacks", "Queues"]),
          u("Trees", ["Binary Trees & Traversals", "Binary Search Trees", "AVL Trees", "Heaps", "Tries"]),
          u("Graphs", ["BFS", "DFS", "Dijkstra's Algorithm", "Topological Sort", "Minimum Spanning Trees"]),
          u("Sorting & Searching", ["Elementary Sorts", "Merge Sort", "Quick Sort", "Heap Sort", "Binary Search"]),
          u("Hashing & Advanced Structures", ["Hash Functions", "Collision Resolution", "Disjoint Set Union", "Segment Trees"]),
        ],
      },
      {
        code: "CS202",
        name: "Database Management Systems",
        prerequisites: ["CS102"],
        units: [
          u("Introduction & ER Model", ["DBMS Architecture", "Data Models", "ER Diagrams", "Keys & Constraints"]),
          u("Relational Model & SQL", ["Relational Algebra", "SQL DDL & DML", "Joins", "Subqueries & Views", "Aggregation"]),
          u("Normalization", ["Functional Dependencies", "1NF, 2NF & 3NF", "BCNF", "Decomposition"]),
          u("Transactions & Concurrency", ["ACID Properties", "Schedules & Serializability", "Locking Protocols", "Deadlocks"]),
          u("Storage & Indexing", ["File Organization", "B+ Trees", "Hash Indexing", "Query Optimization"]),
        ],
      },
      {
        code: "CS203",
        name: "Object-Oriented Programming with Java",
        prerequisites: ["CS101"],
        units: [
          u("Java Basics", ["JVM & Bytecode", "Data Types & Operators", "Control Flow", "Arrays & Strings"]),
          u("Classes & Objects", ["Classes & Constructors", "Encapsulation", "Static Members", "Method Overloading"]),
          u("Inheritance & Polymorphism", ["Inheritance", "Method Overriding", "Abstract Classes", "Interfaces", "Dynamic Dispatch"]),
          u("Exceptions & Collections", ["Exception Handling", "Custom Exceptions", "Lists", "Maps & Sets", "Generics"]),
          u("Multithreading & I/O", ["Threads & Runnable", "Synchronization", "File I/O", "Streams API"]),
        ],
      },
      {
        code: "MA201",
        name: "Discrete Mathematics",
        prerequisites: ["MA102"],
        units: [
          u("Logic & Proofs", ["Propositional Logic", "Predicate Logic", "Proof Techniques", "Mathematical Induction"]),
          u("Sets, Relations & Functions", ["Sets & Operations", "Relations", "Equivalence Relations", "Functions"]),
          u("Combinatorics", ["Counting Principles", "Permutations & Combinations", "Pigeonhole Principle", "Recurrence Relations"]),
          u("Graph Theory", ["Graph Basics", "Euler & Hamiltonian Paths", "Trees in Graph Theory", "Graph Coloring"]),
          u("Algebraic Structures", ["Groups", "Rings & Fields", "Lattices", "Boolean Algebra"]),
        ],
      },
      {
        code: "CS204",
        name: "Computer Organization & Architecture",
        prerequisites: ["EC102"],
        units: [
          u("Basic Structure", ["Functional Units", "Bus Structures", "Instruction Formats", "Addressing Modes"]),
          u("Computer Arithmetic", ["Number Representation", "Addition & Subtraction", "Booth's Multiplication", "Floating Point"]),
          u("Processor Design", ["Datapath", "Hardwired Control", "Microprogrammed Control", "Pipelining", "Pipeline Hazards"]),
          u("Memory Organization", ["Memory Hierarchy", "Cache Mapping", "Virtual Memory", "Page Replacement"]),
          u("I/O Organization", ["Interrupts", "DMA", "I/O Interfaces", "Bus Arbitration"]),
        ],
      },
    ],
  },
  // Future semesters: subjects only (locked for students).
  {
    number: 4,
    subjects: [
      { code: "CS301", name: "Operating Systems", prerequisites: ["CS204", "CS201"], units: [] },
      { code: "CS302", name: "Design & Analysis of Algorithms", prerequisites: ["CS201"], units: [] },
      { code: "CS303", name: "Computer Networks", prerequisites: ["CS204"], units: [] },
      { code: "CS304", name: "Theory of Computation", prerequisites: ["MA201"], units: [] },
      { code: "CS305", name: "Software Engineering", units: [] },
    ],
  },
  {
    number: 5,
    subjects: [
      { code: "CS401", name: "Compiler Design", prerequisites: ["CS304"], units: [] },
      { code: "CS402", name: "Web Technology", units: [] },
      { code: "CS403", name: "Machine Learning", prerequisites: ["MA102"], units: [] },
      { code: "CS404", name: "Computer Graphics", units: [] },
    ],
  },
  {
    number: 6,
    subjects: [
      { code: "CS501", name: "System Design", prerequisites: ["CS301", "CS303"], units: [] },
      { code: "CS502", name: "Artificial Intelligence", prerequisites: ["CS403"], units: [] },
      { code: "CS503", name: "Cloud Computing", units: [] },
      { code: "CS504", name: "Information Security", prerequisites: ["CS303"], units: [] },
    ],
  },
  {
    number: 7,
    subjects: [
      { code: "CS601", name: "Deep Learning", prerequisites: ["CS403"], units: [] },
      { code: "CS602", name: "Distributed Systems", units: [] },
      { code: "CS603", name: "Big Data Analytics", units: [] },
      { code: "CS604", name: "Blockchain Technology", units: [] },
    ],
  },
  {
    number: 8,
    subjects: [
      { code: "CS701", name: "Major Project", units: [] },
      { code: "CS702", name: "Natural Language Processing", prerequisites: ["CS601"], units: [] },
      { code: "CS703", name: "Internet of Things", units: [] },
    ],
  },
];

/** Faculty and what they teach (subject code → sections). Demo login: the first one. */
export const FACULTY = [
  { name: "Prof. Neha Sharma", email: "neha.sharma@nodus-demo.example.com", teaches: { CS201: ["A", "B", "C"], MA201: ["A", "B", "C"] } },
  { name: "Prof. Arjun Iyer", email: "arjun.iyer@nodus-demo.example.com", teaches: { CS202: ["A", "B", "C"], CS203: ["A", "B", "C"] } },
  { name: "Prof. Kavita Rao", email: "kavita.rao@nodus-demo.example.com", teaches: { CS204: ["A", "B", "C"] } },
] as const;

/** Students who get real Neon Auth logins. Everyone else is data-only. */
export const DEMO_STUDENTS = [
  { name: "Ananya Sharma", email: "ananya.sharma@nodus-demo.example.com", section: "B" },
  { name: "Rahul Verma", email: "rahul.verma@nodus-demo.example.com", section: "B" },
] as const;

export const DEMO_PASSWORD = "Nodus-Demo-2026!";

/** 46 more students → 48 total, 16 per section. */
export const OTHER_STUDENT_NAMES = [
  "Aarav Mehta", "Diya Patel", "Vihaan Gupta", "Ishita Singh", "Arjun Nair", "Saanvi Reddy", "Kabir Joshi", "Myra Kapoor",
  "Reyansh Das", "Aadhya Iyer", "Vivaan Malhotra", "Anika Bose", "Ayaan Khan", "Kiara Menon", "Dhruv Agarwal", "Navya Pillai",
  "Arnav Chatterjee", "Sara Thomas", "Krish Bansal", "Riya Saxena", "Shaurya Mishra", "Tara Kulkarni", "Atharv Rao", "Pari Desai",
  "Rudra Pandey", "Avni Shetty", "Yash Chauhan", "Meera Krishnan", "Aditya Bhatt", "Zara Siddiqui", "Om Tiwari", "Kavya Hegde",
  "Ishaan Sinha", "Nisha Rawat", "Parth Jain", "Sneha Ghosh", "Laksh Arora", "Pooja Yadav", "Rohan Dutta", "Tanvi Mukherjee",
  "Siddharth Rana", "Aditi Varma", "Karan Sethi", "Mahi Chopra", "Nikhil Goyal", "Simran Kaur",
];
