// Analyze note prompts (AGENTS.md §10.4). Owner: BE.
import type { LinkTarget } from "@/contracts/notes";

export interface CandidateLink {
  target: LinkTarget;
  title: string;
  context: string; // e.g. "Topic in Unit 2: Trees" or "Your Note: Graph Traversals"
}

export interface AnalyzeNoteParams {
  title: string;
  contentMd: string;
  topicTitle: string;
  unitTitle: string;
  candidateLinks: CandidateLink[];
}

export function buildAnalyzeNoteSystemPrompt(): string {
  return `You are an academic study assistant helping a university student organize and deepen their study notes.
Analyze the provided note and output:
1. summary: A clear 2-3 sentence summary of the key ideas.
2. suggestedTitle: A concise, descriptive title if the current title is vague, or an improved title that clearly signals what the note covers.
3. tags: 3 to 6 lowercase keyword tags for indexing and search.
4. todos: 2 to 5 actionable study items, unresolved questions, practice tasks, or missing derivations based on gaps in this note.
5. suggestedLinks: Pick from the candidate links provided ONLY those that are genuinely relevant to the note's concepts, with a 1-sentence reason.`;
}

export function buildAnalyzeNoteUserPrompt(params: AnalyzeNoteParams): string {
  const candidateList = params.candidateLinks
    .map((c) => `- [${c.target.type}:${c.target.id}] "${c.title}" (${c.context})`)
    .join("\n");

  return `Current Note:
Title: "${params.title}"
Location: Topic "${params.topicTitle}" in Unit "${params.unitTitle}"

Content:
${params.contentMd || "(Empty note)"}

Available Candidate Links in Syllabus and Student Notes:
${candidateList || "None available."}`;
}
