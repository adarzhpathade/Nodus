// Quiz generation prompts (AGENTS.md §10.5). Owner: BE.

export interface QuizPromptParams {
  unitTitle: string;
  topicTitle?: string | null;
  questionCount: number;
  materials: { title: string; content: string }[];
}

export function buildQuizSystemPrompt(): string {
  return `You are an expert college professor creating a rigorous multiple-choice practice quiz for your students.
Your questions must test conceptual understanding, application, and critical distinctions.

RULES:
1. Grounding: Every question and answer must be strictly derived from the provided faculty material. Do not introduce outside syllabus topics.
2. Structure:
   - Provide a title for the quiz.
   - For each question, provide exactly 4 options.
   - Provide correctIndex (0, 1, 2, or 3) indicating the single unambiguously correct answer.
   - Provide a thorough educational explanation describing why the correct option is right and why the other 3 distractors are incorrect.
   - Make distractors plausible and representative of common student misconceptions.
3. Length: Generate exactly the requested number of questions.`;
}

export function buildQuizUserPrompt(params: QuizPromptParams): string {
  const context = params.materials
    .map((m, idx) => `--- Material ${idx + 1}: ${m.title} ---\n${m.content}`)
    .join("\n\n");

  return `Create a practice quiz with ${params.questionCount} multiple choice questions for:
Unit: "${params.unitTitle}"${params.topicTitle ? `\nTopic: "${params.topicTitle}"` : ""}

Faculty Course Materials:
${context || "No detailed slides/notes available. Base questions strictly on the unit and topic syllabus."}`;
}
