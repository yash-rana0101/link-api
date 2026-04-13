import "@fastify/jwt";
import { PrismaClient } from "@prisma/client";
import { Queue } from "bullmq";
import { FastifyReply, FastifyRequest } from "fastify";
import Redis from "ioredis";
import { Server } from "socket.io";

import { NotificationQueueJobData } from "../modules/notification/notification.queue";
import { FeedQueueJobData } from "../modules/post/feed.queue";
import { TrustScoreQueueJobData } from "../modules/trust/trust.queue";
import { VerificationQueueJobData } from "../modules/verification/verification.queue";
import { RustEngineClient } from "../utils/rust-engine-client";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
    redis: Redis;
    notificationQueue: Queue<NotificationQueueJobData>;
    feedQueue: Queue<FeedQueueJobData>;
    verificationQueue: Queue<VerificationQueueJobData>;
    trustScoreQueue: Queue<TrustScoreQueueJobData>;
    rustEngine: RustEngineClient;
    io: Server;
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      sub: string;
      email: string;
      tokenType: "access" | "refresh";
      tokenId?: string;
    };
    user: {
      sub: string;
      email: string;
      tokenType: "access" | "refresh";
      tokenId?: string;
    };
  }
}
