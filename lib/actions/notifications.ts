"use server";
// Notification bell. Owner: BE.
import { ListNotificationsQuery, MarkReadInput } from "@/contracts/notifications";
import { getGateway } from "@/lib/gateway";
import { runAction, runQuery } from "./result";

export async function listNotifications(query: ListNotificationsQuery) {
  return runAction(ListNotificationsQuery, query, (data) => getGateway().notifications.list(data));
}

export async function getUnreadCount() {
  return runQuery(() => getGateway().notifications.unreadCount());
}

export async function markNotificationsRead(input: MarkReadInput) {
  return runAction(MarkReadInput, input, (data) => getGateway().notifications.markRead(data));
}

export async function markAllNotificationsRead() {
  return runQuery(() => getGateway().notifications.markAllRead());
}
