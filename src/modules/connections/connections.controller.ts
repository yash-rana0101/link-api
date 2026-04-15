import { FastifyReply, FastifyRequest } from "fastify";

import { getErrorDetails } from "../../utils/http-error";
import {
  ConnectionIdParams,
  ConnectionStatusParams,
  RespondConnectionRequestBody,
  SendConnectionRequestBody,
} from "./connections.schema";
import { ConnectionService } from "./connections.service";

export class ConnectionController {
  constructor(private readonly connectionService: ConnectionService) { }

  sendRequest = async (
    request: FastifyRequest<{ Body: SendConnectionRequestBody }>,
    reply: FastifyReply,
  ): Promise<void> => {
    try {
      const connection = await this.connectionService.sendRequest(request.body, request.user.sub);

      reply.status(201).send({
        success: true,
        message: "Connection request sent.",
        data: connection,
      });
    } catch (error) {
      const { statusCode, message } = getErrorDetails(error);
      reply.status(statusCode).send({ success: false, message });
    }
  };

  respondRequest = async (
    request: FastifyRequest<{ Body: RespondConnectionRequestBody }>,
    reply: FastifyReply,
  ): Promise<void> => {
    try {
      const connection = await this.connectionService.respondRequest(request.body, request.user.sub);

      reply.status(200).send({
        success: true,
        message: "Connection request response submitted.",
        data: connection,
      });
    } catch (error) {
      const { statusCode, message } = getErrorDetails(error);
      reply.status(statusCode).send({ success: false, message });
    }
  };

  getConnections = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    try {
      const connections = await this.connectionService.getConnections(request.user.sub);

      reply.status(200).send({
        success: true,
        data: connections,
      });
    } catch (error) {
      const { statusCode, message } = getErrorDetails(error);
      reply.status(statusCode).send({ success: false, message });
    }
  };

  getPendingRequests = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    try {
      const pendingRequests = await this.connectionService.getPendingRequests(request.user.sub);

      reply.status(200).send({
        success: true,
        data: pendingRequests,
      });
    } catch (error) {
      const { statusCode, message } = getErrorDetails(error);
      reply.status(statusCode).send({ success: false, message });
    }
  };

  getConnectionStatus = async (
    request: FastifyRequest<{ Params: ConnectionStatusParams }>,
    reply: FastifyReply,
  ): Promise<void> => {
    try {
      const connectionStatus = await this.connectionService.getConnectionStatus(
        request.params.userId,
        request.user.sub,
      );

      reply.status(200).send({
        success: true,
        data: connectionStatus,
      });
    } catch (error) {
      const { statusCode, message } = getErrorDetails(error);
      reply.status(statusCode).send({ success: false, message });
    }
  };

  deleteConnection = async (
    request: FastifyRequest<{ Params: ConnectionIdParams }>,
    reply: FastifyReply,
  ): Promise<void> => {
    try {
      await this.connectionService.deleteConnection(request.params.id, request.user.sub);

      reply.status(200).send({
        success: true,
        message: "Connection removed successfully.",
      });
    } catch (error) {
      const { statusCode, message } = getErrorDetails(error);
      reply.status(statusCode).send({ success: false, message });
    }
  };
}
