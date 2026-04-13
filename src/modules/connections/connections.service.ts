import { ConnectionStatus, Prisma } from "@prisma/client";
import { FastifyInstance } from "fastify";

import { HttpError } from "../../utils/http-error";
import { RespondConnectionRequestBody, SendConnectionRequestBody } from "./connections.schema";

const userSummarySelect = {
  id: true,
  name: true,
  email: true,
  trustScore: true,
} satisfies Prisma.UserSelect;

const connectionSelect = {
  id: true,
  requesterId: true,
  receiverId: true,
  relationship: true,
  status: true,
  createdAt: true,
  requester: {
    select: userSummarySelect,
  },
  receiver: {
    select: userSummarySelect,
  },
} satisfies Prisma.ConnectionSelect;

type ConnectionRecord = Prisma.ConnectionGetPayload<{
  select: typeof connectionSelect;
}>;

export class ConnectionService {
  constructor(private readonly app: FastifyInstance) { }

  async sendRequest(data: SendConnectionRequestBody, requesterId: string): Promise<ConnectionRecord> {
    const normalizedRequesterId = this.normalizeRequiredId(requesterId, "requesterId");
    const normalizedReceiverId = this.normalizeRequiredId(data.receiverId, "receiverId");

    if (normalizedRequesterId === normalizedReceiverId) {
      throw new HttpError(400, "You cannot send a connection request to yourself.");
    }

    const receiverExists = await this.app.prisma.user.findUnique({
      where: { id: normalizedReceiverId },
      select: { id: true },
    });

    if (!receiverExists) {
      throw new HttpError(404, "Receiver user not found.");
    }

    const existingConnection = await this.app.prisma.connection.findFirst({
      where: {
        OR: [
          {
            requesterId: normalizedRequesterId,
            receiverId: normalizedReceiverId,
          },
          {
            requesterId: normalizedReceiverId,
            receiverId: normalizedRequesterId,
          },
        ],
      },
      select: {
        id: true,
        requesterId: true,
        receiverId: true,
        status: true,
      },
    });

    if (existingConnection) {
      if (existingConnection.status === ConnectionStatus.ACCEPTED) {
        throw new HttpError(409, "You are already connected with this user.");
      }

      if (existingConnection.status === ConnectionStatus.PENDING) {
        if (existingConnection.requesterId === normalizedRequesterId) {
          throw new HttpError(409, "Connection request is already pending.");
        }

        throw new HttpError(409, "This user has already sent you a pending request.");
      }

      throw new HttpError(409, "A connection request between these users already exists.");
    }

    try {
      return await this.app.prisma.connection.create({
        data: {
          requesterId: normalizedRequesterId,
          receiverId: normalizedReceiverId,
          relationship: data.relationship,
          status: ConnectionStatus.PENDING,
        },
        select: connectionSelect,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new HttpError(409, "Connection request already exists.");
      }

      throw error;
    }
  }

  async respondRequest(data: RespondConnectionRequestBody, userId: string): Promise<ConnectionRecord> {
    const normalizedUserId = this.normalizeRequiredId(userId, "userId");
    const connectionId = this.normalizeRequiredId(data.connectionId, "connectionId");

    const existingConnection = await this.app.prisma.connection.findUnique({
      where: { id: connectionId },
      select: {
        id: true,
        requesterId: true,
        receiverId: true,
        status: true,
      },
    });

    if (!existingConnection) {
      throw new HttpError(404, "Connection request not found.");
    }

    if (existingConnection.receiverId !== normalizedUserId) {
      throw new HttpError(403, "Only the receiver can respond to this request.");
    }

    if (existingConnection.status !== ConnectionStatus.PENDING) {
      throw new HttpError(409, "This connection request has already been handled.");
    }

    const updatedConnection = await this.app.prisma.connection.update({
      where: { id: connectionId },
      data: {
        status: data.status,
      },
      select: connectionSelect,
    });

    if (updatedConnection.status === ConnectionStatus.ACCEPTED) {
      await this.enqueueConnectionCreatedEvents(updatedConnection.requesterId, updatedConnection.receiverId);
    }

    return updatedConnection;
  }

  getConnections(userId: string): Promise<ConnectionRecord[]> {
    const normalizedUserId = this.normalizeRequiredId(userId, "userId");

    return this.app.prisma.connection.findMany({
      where: {
        status: ConnectionStatus.ACCEPTED,
        OR: [
          { requesterId: normalizedUserId },
          { receiverId: normalizedUserId },
        ],
      },
      orderBy: {
        createdAt: "desc",
      },
      select: connectionSelect,
    });
  }

  getPendingRequests(userId: string): Promise<ConnectionRecord[]> {
    const normalizedUserId = this.normalizeRequiredId(userId, "userId");

    return this.app.prisma.connection.findMany({
      where: {
        status: ConnectionStatus.PENDING,
        receiverId: normalizedUserId,
      },
      orderBy: {
        createdAt: "asc",
      },
      select: connectionSelect,
    });
  }

  async deleteConnection(connectionId: string, userId: string): Promise<void> {
    const normalizedConnectionId = this.normalizeRequiredId(connectionId, "id");
    const normalizedUserId = this.normalizeRequiredId(userId, "userId");

    const existingConnection = await this.app.prisma.connection.findUnique({
      where: {
        id: normalizedConnectionId,
      },
      select: {
        id: true,
        requesterId: true,
        receiverId: true,
      },
    });

    if (!existingConnection) {
      throw new HttpError(404, "Connection not found.");
    }

    if (existingConnection.requesterId !== normalizedUserId && existingConnection.receiverId !== normalizedUserId) {
      throw new HttpError(403, "You are not allowed to remove this connection.");
    }

    await this.app.prisma.connection.delete({
      where: {
        id: normalizedConnectionId,
      },
    });
  }

  private normalizeRequiredId(value: string, fieldName: string): string {
    const normalized = value.trim();

    if (!normalized) {
      throw new HttpError(400, `${fieldName} is required.`);
    }

    return normalized;
  }

  private async enqueueConnectionCreatedEvents(requesterId: string, receiverId: string): Promise<void> {
    try {
      const [requesterConnectionCount, receiverConnectionCount] = await Promise.all([
        this.countAcceptedConnections(requesterId),
        this.countAcceptedConnections(receiverId),
      ]);

      await Promise.all([
        this.app.trustScoreQueue.add("trust-score-recalculate", {
          userId: requesterId,
          event: "connection_created",
          connections: requesterConnectionCount,
        }),
        this.app.trustScoreQueue.add("trust-score-recalculate", {
          userId: receiverId,
          event: "connection_created",
          connections: receiverConnectionCount,
        }),
      ]);
    } catch (error) {
      this.app.log.error(
        {
          err: error,
          requesterId,
          receiverId,
        },
        "Failed to enqueue trust score recalculation for a new connection.",
      );
    }
  }

  private countAcceptedConnections(userId: string): Promise<number> {
    return this.app.prisma.connection.count({
      where: {
        status: ConnectionStatus.ACCEPTED,
        OR: [
          { requesterId: userId },
          { receiverId: userId },
        ],
      },
    });
  }
}
