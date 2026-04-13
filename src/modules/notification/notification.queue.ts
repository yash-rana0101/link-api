import { NotificationType } from "@prisma/client";

export const NOTIFICATION_QUEUE_NAME = "notification_queue";

export interface NotificationQueueJobData {
  userId: string;
  type: NotificationType;
  message: string;
}
