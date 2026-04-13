import { FastifySchema } from "fastify";

export interface ConversationIdParams {
  conversationId: string;
}

export interface ConversationMessagesQuerystring {
  cursor?: string;
  limit?: string;
}

export interface SendMessageBody {
  receiverId: string;
  content: string;
}

const conversationIdParamsSchema = {
  type: "object",
  required: ["conversationId"],
  additionalProperties: false,
  properties: {
    conversationId: { type: "string", minLength: 1 },
  },
};

export const getConversationsSchema: FastifySchema = {
  querystring: {
    type: "object",
    additionalProperties: false,
    properties: {},
  },
};

export const getConversationMessagesSchema: FastifySchema = {
  params: conversationIdParamsSchema,
  querystring: {
    type: "object",
    additionalProperties: false,
    properties: {
      cursor: { type: "string", format: "date-time" },
      limit: { type: "string", pattern: "^[0-9]+$" },
    },
  },
};
