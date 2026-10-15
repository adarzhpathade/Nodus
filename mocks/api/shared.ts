// Lookups and small helpers shared by the mock APIs.
import type { StudentProfile } from "@/contracts/auth";
import type { SyllabusLocation } from "@/contracts/common";
import type { Subject, Topic, Unit } from "@/contracts/curriculum";
import { fail } from "../context";
import type { MockStore } from "../store";

export const byOrder = <T extends { order: number }>(a: T, b: T) => a.order - b.order;

export function findSubject(store: MockStore, subjectId: string): Subject {
  const subject = store.subjects.find((s) => s.id === subjectId);
  if (!subject) throw fail("NOT_FOUND", "Subject not found.");
  return subject;
}

export function findUnit(store: MockStore, unitId: string): Unit {
  const unit = store.units.find((u) => u.id === unitId);
  if (!unit) throw fail("NOT_FOUND", "Unit not found.");
  return unit;
}

export function findTopic(store: MockStore, topicId: string): Topic {
  const topic = store.topics.find((t) => t.id === topicId);
  if (!topic) throw fail("NOT_FOUND", "Topic not found.");
  return topic;
}

export const subjectOfUnit = (store: MockStore, unitId: string) => findSubject(store, findUnit(store, unitId).subjectId);

export function topicLocation(store: MockStore, topicId: string): SyllabusLocation {
  const topic = findTopic(store, topicId);
  const unit = findUnit(store, topic.unitId);
  const subject = findSubject(store, unit.subjectId);
  return {
    semesterNumber: subject.semesterNumber,
    subjectId: subject.id,
    subjectName: subject.name,
    unitId: unit.id,
    unitTitle: unit.title,
    topicId: topic.id,
    topicTitle: topic.title,
  };
}

export function unitLocation(store: MockStore, unitId: string): SyllabusLocation {
  const unit = findUnit(store, unitId);
  const subject = findSubject(store, unit.subjectId);
  return {
    semesterNumber: subject.semesterNumber,
    subjectId: subject.id,
    subjectName: subject.name,
    unitId: unit.id,
    unitTitle: unit.title,
    topicId: null,
    topicTitle: null,
  };
}

/** Students cannot open future semesters. */
export function assertSemesterOpen(profile: StudentProfile, semesterNumber: number) {
  if (semesterNumber > profile.currentSemester) {
    throw fail("LOCKED", `Semester ${semesterNumber} unlocks later.`);
  }
}

/** Plain-text excerpt of Markdown. */
export function excerptOf(markdown: string, length = 160): string {
  const text = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)]\([^)]*\)/g, "$1")
    .replace(/^#+\s.*$/m, "") // drop the first heading (it repeats the title)
    .replace(/[#>*_`|~-]+/g, " ")
    .replace(/\[[ x]]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > length ? `${text.slice(0, length - 1).trimEnd()}…` : text;
}

/** Offset cursor pagination. */
export function paginate<T>(items: T[], cursor: string | null | undefined, limit = 20) {
  const start = cursor ? Number(cursor) || 0 : 0;
  const page = items.slice(start, start + limit);
  const next = start + limit < items.length ? String(start + limit) : null;
  return { items: page, nextCursor: next };
}

export const nowIso = () => new Date().toISOString();
