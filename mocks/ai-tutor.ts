// Tutor answer streamed by POST /api/ai/tutor while "ai" is in MOCK_FEATURES (FE-1.11). Owner: FE.
// Retrieves from the mock world (faculty passages for the demo student's section + their notes),
// so answers cite real fixture files and react to the chosen scope. Nothing relevant → "not covered".
import type { Citation, TutorScope } from "@/contracts/ai";
import { retrieve, suggestTopic } from "./api/ai";
import { CURRENT_SEMESTER } from "./fixtures/curriculum";
import { DEMO_STUDENT } from "./fixtures/people";
import { getStore, logActivity } from "./store";

export type MockTutorReply = { text: string; citations: Citation[]; notCovered: boolean };

const firstSentence = (text: string) => text.split(/(?<=[.!?])\s+/)[0] ?? text;

export function mockTutorReply(
  question: string,
  scope: TutorScope = { type: "semester", semesterNumber: CURRENT_SEMESTER },
): MockTutorReply {
  const store = getStore();
  const { user, profile } = DEMO_STUDENT;
  logActivity(store, user.id, "ai_question");

  const citations = retrieve(store, { studentId: user.id, section: profile.section, scope, question });

  if (citations.length === 0) {
    const suggestion = suggestTopic(store, { type: "semester", semesterNumber: CURRENT_SEMESTER }, question);
    return {
      text:
        "I couldn't find this in your course material or your notes, so I won't guess.\n\n" +
        (suggestion
          ? `**Where to look:** *${suggestion.topic.title}* in ${suggestion.subject.name} › ${suggestion.unit.title}. ` +
            "Try asking again with that unit selected as the scope, or check with your faculty."
          : "Try a narrower question, pick a different scope, or ask your faculty to upload material on it."),
      citations: [],
      notCovered: true,
    };
  }

  const [lead, ...rest] = citations;
  const fromNote = citations.find((c) => c.sourceType === "note");
  const keyPoints = (rest.length ? rest : [lead]).map((c) => `- ${firstSentence(c.snippet)} [${c.ref}]`);

  // Student-friendly shape (AGENTS.md §10.3): explanation → example → key points.
  const text = [
    `${lead.snippet} [${lead.ref}]`,
    fromNote
      ? `**Example:** your note *${fromNote.title}* puts it like this — "${firstSentence(fromNote.snippet)}" [${fromNote.ref}]`
      : `**Example:** see ${lead.locationLabel.toLowerCase()} of *${lead.title}* for a worked example [${lead.ref}].`,
    `**Key points**\n${keyPoints.join("\n")}`,
  ].join("\n\n");

  return { text, citations, notCovered: false };
}
