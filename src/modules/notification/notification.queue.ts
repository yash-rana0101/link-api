export const NOTIFICATION_QUEUE_NAME = "notification_queue";

export const notificationEvents = [
  "verification_requested",
  "post_created",
  "connection_created",
  "verification_responded",
] as const;

export type NotificationEvent = (typeof notificationEvents)[number];

export interface NotificationQueueJobData {
  userId: string;
  type: NotificationEvent;
  payload: Record<string, string | number | boolean | null>;
}
