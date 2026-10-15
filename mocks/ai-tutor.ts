// Canned tutor answer streamed by POST /api/ai/tutor while "ai" is in MOCK_FEATURES. Owner: FE.
// Placeholder from contract v1 (BE) — FE replaces with richer, fixture-based answers (FE-1.11).
import type { Citation, TutorScope } from "@/contracts/ai";

export type MockTutorReply = { text: string; citations: Citation[]; notCovered: boolean };

/** `scope` is passed too (second argument) so richer mocks can tailor answers per unit. */
export function mockTutorReply(question: string, ...[]: [scope?: TutorScope]): MockTutorReply {
  return {
    text:
      `**(Mock answer)** You asked: "${question}".\n\n` +
      "BFS explores a graph level by level using a **queue**, while DFS goes as deep as possible first using a " +
      "**stack** (or recursion) [S1]. BFS finds shortest paths in unweighted graphs [S1].",
    citations: [
      {
        ref: "S1",
        sourceType: "resource",
        sourceId: "00000000-0000-4000-8000-000000000001",
        title: "Lecture_Slides_Trees_Graph.pdf",
        page: 12,
        locationLabel: "Slide 12",
        snippet: "Breadth-first search visits all neighbours before moving to the next level…",
      },
    ],
    notCovered: false,
  };
}
