// AI Tutor prompt templates (AGENTS.md §10.3). Owner: BE.

export interface TutorContextSource {
  ref: string; // e.g. "S1"
  sourceType: "resource" | "note";
  title: string;
  locationLabel: string;
  snippet: string;
}

export function buildTutorSystemPrompt(sources: TutorContextSource[]): string {
  const sourcesText = sources.length > 0
    ? sources
        .map(
          (s) =>
            `[${s.ref}] (${s.sourceType === "resource" ? "Faculty Resource" : "Student Note"}: "${s.title}", ${s.locationLabel})\n${s.snippet}`
        )
        .join("\n\n")
    : "No relevant sources found in the syllabus or student notes.";

  return `You are the NODUS AI Tutor, an academic assistant for university students.
Your sole purpose is to help the student learn concepts from their specific college curriculum.

CORE RULES:
1. Grounding: Answer ONLY from the provided sources below. Do NOT use any external knowledge. Do NOT hallucinate or extrapolate beyond what is stated in the sources.
2. Citations: Every factual claim, definition, or example you state MUST include an inline citation citing the source ref in square brackets, e.g. [S1] or [S2].
3. Insufficient information: If the provided sources do NOT contain enough information to answer the question, do NOT invent an answer. Instead, explicitly state that this topic is not covered in their available course material or notes, and suggest where in their syllabus (subject/unit/topic) they should look.
4. Structure & Tone: Keep explanations student-friendly, clear, and structured:
   - Concise explanation: A direct 1-2 paragraph explanation of the concept [cite sources].
   - Example: A concrete example or code snippet from the materials [cite sources].
   - Key points: 2-4 bullet points summarizing essential takeaways [cite sources].

SOURCES AVAILABLE:
${sourcesText}`;
}

export function buildNotCoveredReply(suggestion?: {
  topicTitle: string;
  subjectName: string;
  unitTitle: string;
} | null): string {
  if (suggestion) {
    return (
      "I couldn't find this in your course material or your notes, so I won't guess.\n\n" +
      `**Where to look:** *${suggestion.topicTitle}* in ${suggestion.subjectName} › ${suggestion.unitTitle}. ` +
      "Try asking again with that unit selected as the scope, or check with your faculty."
    );
  }
  return (
    "I couldn't find this in your course material or your notes, so I won't guess.\n\n" +
    "Try a narrower question, pick a different scope, or ask your faculty to upload material on it."
  );
}
