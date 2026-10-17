# Task: be-6-fixes (worker: Gemini / agy, role: BACKEND) - review fixes
Work ONLY in E:\Projects\College Projects\nodus-be6. No shell or git. Use file read/edit tools only. Fix exactly these, touch nothing else:

1. lib/db/queries/progress.ts (~line 227): the return object uses `quizScoresByUnit` which is not defined (the variable is `unitScoresByUnit`). Return `quizScoresByUnit: unitScoresByUnit`.
2. lib/server-gateway/graph.ts line ~37: `StudentHelpItemInput` is imported from "@/lib/db/queries/progress" but it is exported by "@/lib/progress". Move that type import to the "@/lib/progress" import.
3. lib/db/queries/progress.ts `getSectionProgressRawData`: the roster query selects every student of the branch+section across ALL semesters. Add `eq(studentProfiles.currentSemester, subject.semesterNumber)` to the roster `where` so class averages only include students currently in the subject's semester.
4. docs/progress_logic.md: the worked examples use names that are not in the seed data (Rohan Verma, Dr. Suresh). Use the real seeded people: students Ananya Sharma (Sem 3, Section B) and Rahul Verma, faculty Prof. Neha Sharma (CS201 DSA, sections A/B/C). Keep the numbers consistent with the formula; recompute any figure you change.
End with a short Report listing the 4 edits.
