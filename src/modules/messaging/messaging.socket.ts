import { FastifyInstance } from "fastify";
import { Server, Socket } from "socket.io";

import { getErrorDetails } from "../../utils/http-error";
import { MessagingService } from "./messaging.service";

interface SocketAuthPayload {
  token?: unknown;
}

interface SendMessagePayload {
  receiverId?: unknown;
  content?: unknown;
}

interface SocketAck {
  (response: {
    success: boolean;
    statusCode?: number;
    message?: string;
    data?: unknown;
  }): void;
}

interface AccessJwtPayload {
  sub?: string;
  tokenType?: "access" | "refresh";
}

const USER_ROOM_PREFIX = "user:";
const SOCKET_MESSAGE_RATE_LIMIT_MAX = 40;
const SOCKET_MESSAGE_RATE_LIMIT_WINDOW_SECONDS = 60;

export const registerMessagingSocketHandlers = (app: FastifyInstance, io: Server): void => {
  const messagingService = new MessagingService(app);

  io.on("connection", async (socket: Socket) => {
    const token = extractSocketToken(socket);

    if (!token) {
      socket.emit("message_error", {
        message: "Unauthorized socket connection.",
      });
      socket.disconnect(true);
      return;
    }

    let senderId = "";

    try {
      const payload = await app.jwt.verify<AccessJwtPayload>(token);

      if (!payload?.sub || payload.tokenType !== "access") {
        throw new Error("Invalid access token for socket.");
      }

      senderId = payload.sub;
    } catch {
      socket.emit("message_error", {
        message: "Unauthorized socket connection.",
      });
      socket.disconnect(true);
      return;
    }

    socket.data.userId = senderId;
    socket.join(`${USER_ROOM_PREFIX}${senderId}`);

    socket.on("send_message", async (payload: SendMessagePayload, ack?: SocketAck) => {
      const receiverId = typeof payload?.receiverId === "string" ? payload.receiverId.trim() : "";
      const content = typeof payload?.content === "string" ? payload.content : "";

      try {
        const isRateLimited = await shouldRateLimitSocketMessage(app, senderId);

        if (isRateLimited) {
          const rateLimitResponse = {
            success: false,
            statusCode: 429,
            message: `Rate limit exceeded for messages:socket. Try again in ${SOCKET_MESSAGE_RATE_LIMIT_WINDOW_SECONDS} seconds.`,
          };

          if (ack) {
            ack(rateLimitResponse);
            return;
          }

          socket.emit("message_error", {
            statusCode: 429,
            message: rateLimitResponse.message,
          });

          return;
        }

        const message = await messagingService.sendMessage({ receiverId, content }, senderId);

        io.to(`${USER_ROOM_PREFIX}${senderId}`)
          .to(`${USER_ROOM_PREFIX}${receiverId}`)
          .emit("receive_message", message);

        if (ack) {
          ack({
            success: true,
            data: message,
          });
        }
      } catch (error) {
        const { statusCode, message } = getErrorDetails(error);

        if (ack) {
          ack({
            success: false,
            statusCode,
            message,
          });
          return;
        }

        socket.emit("message_error", {
          statusCode,
          message,
        });
      }
    });
  });
};

const extractSocketToken = (socket: Socket): string | null => {
  const authPayload = socket.handshake.auth as SocketAuthPayload | undefined;
  const authToken = typeof authPayload?.token === "string" ? authPayload.token.trim() : "";

  if (authToken) {
    return stripBearerPrefix(authToken);
  }

  const authorizationHeader = socket.handshake.headers.authorization;

  if (typeof authorizationHeader !== "string") {
    return null;
  }

  const normalizedHeader = authorizationHeader.trim();

  if (!normalizedHeader) {
    return null;
  }

  return stripBearerPrefix(normalizedHeader);
};

const stripBearerPrefix = (value: string): string => value.replace(/^Bearer\s+/i, "").trim();

const shouldRateLimitSocketMessage = async (
  app: FastifyInstance,
  userId: string,
): Promise<boolean> => {
  const key = `rate:${userId}:messages:socket`;

  try {
    const count = await app.redis.incr(key);

    if (count === 1) {
      await app.redis.expire(key, SOCKET_MESSAGE_RATE_LIMIT_WINDOW_SECONDS);
    }

    return count > SOCKET_MESSAGE_RATE_LIMIT_MAX;
  } catch (error) {
    app.log.warn(
      {
        err: error,
        userId,
        key,
      },
      "Socket message rate limiting is unavailable. Continuing request.",
    );

    return false;
  }
};
