import { NotificationType, Prisma } from "@prisma/client";
import { FastifyInstance } from "fastify";

import { HttpError } from "../../utils/http-error";

const notificationSelect = {
  id: true,
  userId: true,
  type: true,
  message: true,
  isRead: true,
  createdAt: true,
} satisfies Prisma.NotificationSelect;

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  message: string;
}

export type NotificationRecord = Prisma.NotificationGetPayload<{
  select: typeof notificationSelect;
}>;

export class NotificationService {
  constructor(private readonly app: FastifyInstance) { }

  async createNotification(input: CreateNotificationInput): Promise<NotificationRecord> {
    const userId = this.normalizeRequiredId(input.userId, "userId");
    const message = this.requireMessage(input.message);

    return this.app.prisma.notification.create({
      data: {
        userId,
        type: input.type,
        message,
      },
      select: notificationSelect,
    });
  }

  async getUserNotifications(userId: string): Promise<NotificationRecord[]> {
    const normalizedUserId = this.normalizeRequiredId(userId, "userId");

    return this.app.prisma.notification.findMany({
      where: {
        userId: normalizedUserId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
      select: notificationSelect,
    });
  }

  async markAsRead(notificationId: string, userId: string): Promise<NotificationRecord> {
    const normalizedNotificationId = this.normalizeRequiredId(notificationId, "id");
    const normalizedUserId = this.normalizeRequiredId(userId, "userId");

    const existingNotification = await this.app.prisma.notification.findUnique({
      where: {
        id: normalizedNotificationId,
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!existingNotification) {
      throw new HttpError(404, "Notification not found.");
    }

    if (existingNotification.userId !== normalizedUserId) {
      throw new HttpError(403, "You are not allowed to update this notification.");
    }

    return this.app.prisma.notification.update({
      where: {
        id: normalizedNotificationId,
      },
      data: {
        isRead: true,
      },
      select: notificationSelect,
    });
  }

  private normalizeRequiredId(value: string, fieldName: string): string {
    const normalized = value.trim();

    if (!normalized) {
      throw new HttpError(400, `${fieldName} is required.`);
    }

    return normalized;
  }

  private requireMessage(message: string): string {
    const normalized = message.trim();

    if (!normalized) {
      throw new HttpError(400, "message is required.");
    }

    return normalized;
  }
}
