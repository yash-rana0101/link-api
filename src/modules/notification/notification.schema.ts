import { FastifySchema } from "fastify";

export interface NotificationIdParams {
  id: string;
}

const notificationIdParamsSchema = {
  type: "object",
  required: ["id"],
  additionalProperties: false,
  properties: {
    id: { type: "string", minLength: 1 },
  },
};

export const getNotificationsSchema: FastifySchema = {};

export const markNotificationAsReadSchema: FastifySchema = {
  params: notificationIdParamsSchema,
};
