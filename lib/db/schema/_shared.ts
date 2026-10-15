// Column helpers and enums shared by every table. Owner: BE.
import { customType, pgEnum, timestamp, uuid } from "drizzle-orm/pg-core";

export const id = () => uuid("id").primaryKey().defaultRandom();

export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const tsvector = customType<{ data: string }>({
  dataType: () => "tsvector",
});

// ---------- Enums (values mirror contracts/*) ----------

export const roleEnum = pgEnum("role", ["student", "faculty"]);
export const resourceTypeEnum = pgEnum("resource_type", ["pdf", "ppt", "pptx"]);
export const ingestionStatusEnum = pgEnum("ingestion_status", ["processing", "ready", "failed"]);
export const linkTargetTypeEnum = pgEnum("link_target_type", ["note", "topic", "unit"]);
export const assignmentStatusEnum = pgEnum("assignment_mark", ["pending", "submitted", "late", "not_submitted"]);
export const chatRoleEnum = pgEnum("chat_role", ["user", "assistant"]);
export const activityTypeEnum = pgEnum("activity_type", [
  "note_created",
  "note_updated",
  "quiz_attempted",
  "ai_question",
  "resource_opened",
]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "resource_uploaded",
  "assignment_created",
  "deadline_reminder",
  "status_marked",
]);
