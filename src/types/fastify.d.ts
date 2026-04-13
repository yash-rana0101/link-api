import "@fastify/jwt";
import { PrismaClient } from "@prisma/client";
import { FastifyReply, FastifyRequest } from "fastify";
import Redis from "ioredis";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
    redis: Redis;
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
