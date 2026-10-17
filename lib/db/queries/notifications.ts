// Notification database queries (bell). Owner: BE.
import "server-only";
import { and, count, desc, eq, gte, inArray, isNull, lte } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  assignments,
  assignmentSections,
  assignmentStatus,
  notifications,
  semesters,
  studentProfiles,
  subjects,
} from "@/lib/db/schema";
import { findUnitWithSubject } from "@/lib/db/queries/curriculum";
import type {
  Notification,
  NotificationTarget,
  NotificationType,
} from "@/contracts/notifications";

export type NotificationRecord = typeof notifications.$inferSelect;

export function toNotification(row: NotificationRecord): Notification {
  return {
    id: row.id,
    type: row.type as NotificationType,
    title: row.title,
    body: row.body,
    target: (row.target as NotificationTarget | null) ?? null,
    read: row.readAt !== null,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Lists notifications for a user with offset-based cursor pagination.
 */
export async function listNotificationsForUser(params: {
  userId: string;
  unreadOnly?: boolean;
  limit: number;
  offset: number;
}): Promise<{ items: Notification[]; nextCursor: string | null }> {
  const db = getDb();

  const rows = await db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, params.userId),
        params.unreadOnly ? isNull(notifications.readAt) : undefined,
      ),
    )
    .orderBy(desc(notifications.createdAt))
    .limit(params.limit + 1)
    .offset(params.offset);

  const hasMore = rows.length > params.limit;
  const pageRows = hasMore ? rows.slice(0, params.limit) : rows;
  const nextCursor = hasMore ? String(params.offset + params.limit) : null;

  return {
    items: pageRows.map(toNotification),
    nextCursor,
  };
}

/**
 * Returns the count of unread notifications for a user.
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const [row] = await getDb()
    .select({ count: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));

  return Number(row?.count ?? 0);
}

/**
 * Marks specified notifications as read for a user.
 */
export async function markNotificationsAsRead(
  userId: string,
  notificationIds: string[],
): Promise<void> {
  if (!notificationIds.length) return;
  await getDb()
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.userId, userId),
        inArray(notifications.id, notificationIds),
        isNull(notifications.readAt),
      ),
    );
}

/**
 * Marks all unread notifications as read for a user.
 */
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  await getDb()
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}

/**
 * Triggers resource_uploaded notifications for students in visible sections.
 * Exported for the upload flow (BE-8.7).
 */
export async function notifyNewResource(
  unitId: string,
  visibleSections: string[],
  resourceName: string,
): Promise<void> {
  if (!visibleSections.length) return;
  const unitInfo = await findUnitWithSubject(unitId);
  if (!unitInfo) return;

  const db = getDb();
  const students = await db
    .select({ userId: studentProfiles.userId })
    .from(studentProfiles)
    .where(
      and(
        eq(studentProfiles.branchId, unitInfo.subject.branchId),
        eq(studentProfiles.currentSemester, unitInfo.subject.semesterNumber),
        inArray(studentProfiles.section, visibleSections),
      ),
    );

  if (!students.length) return;

  const now = new Date();
  await db.insert(notifications).values(
    students.map((s) => ({
      userId: s.userId,
      type: "resource_uploaded" as const,
      title: `New material in ${unitInfo.unit.title}`,
      body: `${unitInfo.subject.name} · ${resourceName}`,
      target: { kind: "unit", unitId },
      readAt: null,
      createdAt: now,
    })),
  );
}

/**
 * Triggers assignment_created notifications for students of target sections.
 */
export async function notifyNewAssignment(params: {
  assignmentId: string;
  assignmentTitle: string;
  subjectName: string;
  branchId: string;
  semesterNumber: number;
  sections: string[];
}): Promise<void> {
  if (!params.sections.length) return;
  const db = getDb();

  const students = await db
    .select({ userId: studentProfiles.userId })
    .from(studentProfiles)
    .where(
      and(
        eq(studentProfiles.branchId, params.branchId),
        eq(studentProfiles.currentSemester, params.semesterNumber),
        inArray(studentProfiles.section, params.sections),
      ),
    );

  if (!students.length) return;

  const now = new Date();
  await db.insert(notifications).values(
    students.map((s) => ({
      userId: s.userId,
      type: "assignment_created" as const,
      title: `New assignment: ${params.assignmentTitle}`,
      body: params.subjectName,
      target: { kind: "assignment", assignmentId: params.assignmentId },
      readAt: null,
      createdAt: now,
    })),
  );
}

/**
 * Triggers status_marked notification when an assignment is marked.
 */
export async function notifyStatusMarked(params: {
  studentId: string;
  assignmentId: string;
  assignmentTitle: string;
  subjectName: string;
  status: string;
  marks?: number | null;
  maxMarks?: number | null;
  remark?: string | null;
}): Promise<void> {
  if (params.status === "pending") return;

  const statusLabel =
    params.status === "submitted"
      ? "Submitted"
      : params.status === "late"
        ? "Late"
        : "Not submitted";

  let body = params.subjectName;
  if (params.marks != null) {
    const marksText = `${params.marks}${params.maxMarks != null ? ` / ${params.maxMarks}` : ""}`;
    body = params.remark ? `${marksText} · ${params.remark}` : marksText;
  } else if (params.remark) {
    body = `${params.subjectName} · ${params.remark}`;
  }

  await getDb().insert(notifications).values({
    userId: params.studentId,
    type: "status_marked",
    title: `${params.assignmentTitle} marked: ${statusLabel}`,
    body,
    target: { kind: "assignment", assignmentId: params.assignmentId },
    readAt: null,
    createdAt: new Date(),
  });
}

/**
 * Triggers bulk status_marked notifications.
 */
export async function notifyBulkStatusMarked(params: {
  studentIds: string[];
  assignmentId: string;
  assignmentTitle: string;
  subjectName: string;
  status: string;
}): Promise<void> {
  if (params.status === "pending" || !params.studentIds.length) return;

  const statusLabel =
    params.status === "submitted"
      ? "Submitted"
      : params.status === "late"
        ? "Late"
        : "Not submitted";

  const now = new Date();
  await getDb()
    .insert(notifications)
    .values(
      params.studentIds.map((studentId) => ({
        userId: studentId,
        type: "status_marked" as const,
        title: `${params.assignmentTitle} marked: ${statusLabel}`,
        body: params.subjectName,
        target: { kind: "assignment", assignmentId: params.assignmentId },
        readAt: null,
        createdAt: now,
      })),
    );
}

/**
 * Creates deadline reminder notifications for assignments due within 2 days and due today.
 * Skips students who already submitted or already have a reminder of that kind for that assignment.
 * Returns the count of notifications created.
 */
export async function createDeadlineReminders(): Promise<{ created: number }> {
  const db = getDb();
  const now = new Date();
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  // Find assignments due between now and now + 48 hours
  const upcomingAssignments = await db
    .select({
      assignment: assignments,
      subjectName: subjects.name,
      branchId: semesters.branchId,
      semesterNumber: semesters.number,
    })
    .from(assignments)
    .innerJoin(subjects, eq(subjects.id, assignments.subjectId))
    .innerJoin(semesters, eq(semesters.id, subjects.semesterId))
    .where(
      and(
        gte(assignments.dueAt, now),
        lte(assignments.dueAt, in48Hours),
      ),
    );

  if (!upcomingAssignments.length) return { created: 0 };

  let createdCount = 0;

  for (const item of upcomingAssignments) {
    const isDueToday = item.assignment.dueAt <= in24Hours;
    const kindPrefix = isDueToday ? "Due today:" : "Due in 2 days:";
    const title = `${kindPrefix} ${item.assignment.title}`;

    // Target sections for this assignment
    const targetSections = await db
      .select({ section: assignmentSections.section })
      .from(assignmentSections)
      .where(eq(assignmentSections.assignmentId, item.assignment.id));

    const sections = targetSections.map((s) => s.section);
    if (!sections.length) continue;

    // Students in these sections
    const students = await db
      .select({ userId: studentProfiles.userId })
      .from(studentProfiles)
      .where(
        and(
          eq(studentProfiles.branchId, item.branchId),
          eq(studentProfiles.currentSemester, item.semesterNumber),
          inArray(studentProfiles.section, sections),
        ),
      );

    if (!students.length) continue;
    const studentIds = students.map((s) => s.userId);

    // Students who already submitted
    const submittedRows = await db
      .select({ studentId: assignmentStatus.studentId })
      .from(assignmentStatus)
      .where(
        and(
          eq(assignmentStatus.assignmentId, item.assignment.id),
          inArray(assignmentStatus.studentId, studentIds),
          inArray(assignmentStatus.status, ["submitted", "late"]),
        ),
      );

    const submittedSet = new Set(submittedRows.map((s) => s.studentId));

    // Students who already received a reminder of this kind for this assignment
    const existingReminders = await db
      .select({
        userId: notifications.userId,
        title: notifications.title,
        target: notifications.target,
      })
      .from(notifications)
      .where(
        and(
          inArray(notifications.userId, studentIds),
          eq(notifications.type, "deadline_reminder"),
        ),
      );

    const alreadyNotified = new Set<string>();
    for (const r of existingReminders) {
      const target = r.target as { kind?: string; assignmentId?: string } | null;
      if (
        target?.kind === "assignment" &&
        target?.assignmentId === item.assignment.id &&
        r.title.startsWith(kindPrefix)
      ) {
        alreadyNotified.add(r.userId);
      }
    }

    const studentsToNotify = studentIds.filter(
      (id) => !submittedSet.has(id) && !alreadyNotified.has(id),
    );

    if (!studentsToNotify.length) continue;

    await db.insert(notifications).values(
      studentsToNotify.map((userId) => ({
        userId,
        type: "deadline_reminder" as const,
        title,
        body: `${item.subjectName} · submit on paper in class`,
        target: { kind: "assignment", assignmentId: item.assignment.id },
        readAt: null,
        createdAt: new Date(),
      })),
    );

    createdCount += studentsToNotify.length;
  }

  return { created: createdCount };
}
