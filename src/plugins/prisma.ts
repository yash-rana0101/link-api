import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

import { env } from "../config/env";

const prismaPlugin: FastifyPluginAsync = fp(async (app) => {
  const adapter = new PrismaPg({ connectionString: env.databaseUrl });

  const prisma = new PrismaClient({
    adapter,
  });

  await prisma.$connect();

  app.decorate("prisma", prisma);

  app.addHook("onClose", async () => {
    await prisma.$disconnect();
  });
});

export default prismaPlugin;
