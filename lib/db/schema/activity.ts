// Activity log (heatmap, streaks) and in-app notifications. Owner: BE.
import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { activityTypeEnum, id, notificationTypeEnum } from "./_shared";
import { users } from "./users";

/** One row per study action. */
export const activityLog = pgTable(
  "activity_log",
  {
    id: id(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: activityTypeEnum("type").notNull(),
    /** Id of the note / quiz attempt / message / resource involved. */
    refId: uuid("ref_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("activity_log_student_time_idx").on(t.studentId, t.createdAt)],
);

export const notifications = pgTable(
  "notifications",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    /** NotificationTarget (contracts/notifications.ts) or null. */
    target: jsonb("target"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notifications_user_time_idx").on(t.userId, t.createdAt)],
);
