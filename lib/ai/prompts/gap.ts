// Gap finder prompts (AGENTS.md §10.6). Owner: BE.

export interface TopicNoteSummary {
  topicId: string;
  topicTitle: string;
  notesCount: number;
  noteTitles: string[];
  noteExcerpts: string[];
}

export interface GapPromptParams {
  unitTitle: string;
  topics: TopicNoteSummary[];
}

export function buildGapSystemPrompt(): string {
  return `You are an academic coach analyzing a university student's syllabus coverage in a specific unit.
Your goal is to identify knowledge gaps:
- "missing": Topics where the student has no notes or zero demonstrable understanding.
- "weak": Topics where the student has only brief, superficial, or partial notes that fail to cover core concepts of that topic.

Provide an actionable, encouraging reason for each missing or weak topic so the student understands what to study next.`;
}

export function buildGapUserPrompt(params: GapPromptParams): string {
  const topicBreakdown = params.topics
    .map((t) => {
      const notesDesc = t.notesCount === 0
        ? "No notes written."
        : `${t.notesCount} note(s): ${t.noteTitles.join(", ")}\nExcerpts:\n${t.noteExcerpts.join("\n")}`;
      return `Topic [ID: ${t.topicId}]: "${t.topicTitle}"\nCoverage: ${notesDesc}`;
    })
    .join("\n\n");

  return `Unit: "${params.unitTitle}"

Review the student's coverage across the unit's topics:
${topicBreakdown}

Classify topics into "missing" (topics with no notes/coverage) and "weak" (topics with shallow notes missing key details). For each, provide a specific educational reason explaining what is missing.`;
}
