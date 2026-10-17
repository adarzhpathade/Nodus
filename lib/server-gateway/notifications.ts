// Real NotificationsApi (C-10). Implements BE-8.6. Owner: BE.
import "server-only";
import {
  ListNotificationsQuery,
  MarkReadInput,
  NotificationPage,
  NotificationsApi,
} from "@/contracts/notifications";
import { requireViewer } from "@/lib/auth/guards";
import {
  getUnreadNotificationCount,
  listNotificationsForUser,
  markAllNotificationsAsRead,
  markNotificationsAsRead,
} from "@/lib/db/queries/notifications";

export const notificationsApi: NotificationsApi = {
  async list(query: ListNotificationsQuery): Promise<NotificationPage> {
    const viewer = await requireViewer();
    const parsed = ListNotificationsQuery.parse(query);

    const limit = parsed.limit ?? 20;
    const offset = Math.max(0, parsed.cursor ? parseInt(parsed.cursor, 10) || 0 : 0);

    return listNotificationsForUser({
      userId: viewer.user.id,
      unreadOnly: parsed.unreadOnly,
      limit,
      offset,
    });
  },

  async unreadCount(): Promise<number> {
    const viewer = await requireViewer();
    return getUnreadNotificationCount(viewer.user.id);
  },

  async markRead(input: MarkReadInput): Promise<void> {
    const viewer = await requireViewer();
    const parsed = MarkReadInput.parse(input);
    await markNotificationsAsRead(viewer.user.id, parsed.ids);
  },

  async markAllRead(): Promise<void> {
    const viewer = await requireViewer();
    await markAllNotificationsAsRead(viewer.user.id);
  },
};
