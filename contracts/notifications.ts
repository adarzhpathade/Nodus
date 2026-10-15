// C-10 — In-app notifications (bell). No email/push. Owner: BE (FE reviews).
import { z } from "zod";
import { Id, PageQuery, Timestamp, paginated } from "./common";

export const NotificationType = z.enum([
  "resource_uploaded",
  "assignment_created",
  "deadline_reminder",
  "status_marked",
]);
export type NotificationType = z.infer<typeof NotificationType>;

/** What the notification opens. FE turns this into a route. */
export const NotificationTarget = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("unit"), unitId: Id }),
  z.object({ kind: z.literal("resource"), resourceId: Id, unitId: Id }),
  z.object({ kind: z.literal("assignment"), assignmentId: Id }),
]);
export type NotificationTarget = z.infer<typeof NotificationTarget>;

export const Notification = z.object({
  id: Id,
  type: NotificationType,
  title: z.string(),
  body: z.string(),
  target: NotificationTarget.nullable(),
  read: z.boolean(),
  createdAt: Timestamp,
});
export type Notification = z.infer<typeof Notification>;

export const ListNotificationsQuery = PageQuery.extend({ unreadOnly: z.boolean().default(false) });
export type ListNotificationsQuery = z.input<typeof ListNotificationsQuery>;

export const NotificationPage = paginated(Notification);
export type NotificationPage = z.infer<typeof NotificationPage>;

export const MarkReadInput = z.object({ ids: z.array(Id).min(1) });
export type MarkReadInput = z.infer<typeof MarkReadInput>;

export interface NotificationsApi {
  list(query: ListNotificationsQuery): Promise<NotificationPage>;
  unreadCount(): Promise<number>;
  markRead(input: MarkReadInput): Promise<void>;
  markAllRead(): Promise<void>;
}
