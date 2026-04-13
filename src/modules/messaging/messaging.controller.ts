import { FastifyReply, FastifyRequest } from "fastify";

import { getErrorDetails } from "../../utils/http-error";
import {
  ConversationIdParams,
  ConversationMessagesQuerystring,
} from "./messaging.schema";
import { MessagingService } from "./messaging.service";

export class MessagingController {
  constructor(private readonly messagingService: MessagingService) { }

  getConversations = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    try {
      const conversations = await this.messagingService.getConversations(request.user.sub);

      reply.status(200).send({
        success: true,
        data: conversations,
      });
    } catch (error) {
      const { statusCode, message } = getErrorDetails(error);
      reply.status(statusCode).send({ success: false, message });
    }
  };

  getConversationMessages = async (
    request: FastifyRequest<{ Params: ConversationIdParams; Querystring: ConversationMessagesQuerystring }>,
    reply: FastifyReply,
  ): Promise<void> => {
    try {
      const messages = await this.messagingService.getConversationMessages(
        request.params.conversationId,
        request.query,
        request.user.sub,
      );

      reply.status(200).send({
        success: true,
        data: messages,
      });
    } catch (error) {
      const { statusCode, message } = getErrorDetails(error);
      reply.status(statusCode).send({ success: false, message });
    }
  };
}
