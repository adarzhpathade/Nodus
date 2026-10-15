import type { NotificationsApi } from "@/contracts/notifications";
import { clone, mockRequest, requireActor } from "../context";
import { paginate } from "./shared";

export const notificationsMock: NotificationsApi = {
  async list(query) {
    const store = await mockRequest();
    const actor = await requireActor(store);
    const items = store.notifications
      .filter((n) => n.userId === actor.user.id && (!query.unreadOnly || !n.read))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((n) => ({ id: n.id, type: n.type, title: n.title, body: n.body, target: n.target, read: n.read, createdAt: n.createdAt }));
    return clone(paginate(items, query.cursor, query.limit ?? 20));
  },

  async unreadCount() {
    const store = await mockRequest();
    const actor = await requireActor(store);
    return store.notifications.filter((n) => n.userId === actor.user.id && !n.read).length;
  },

  async markRead(input) {
    const store = await mockRequest();
    const actor = await requireActor(store);
    const ids = new Set(input.ids);
    for (const n of store.notifications) if (n.userId === actor.user.id && ids.has(n.id)) n.read = true;
  },

  async markAllRead() {
    const store = await mockRequest();
    const actor = await requireActor(store);
    for (const n of store.notifications) if (n.userId === actor.user.id) n.read = true;
  },
};
