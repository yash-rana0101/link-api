import { FastifyPluginAsync } from "fastify";

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", async () => {
    return {
      service: "backend",
      status: "running",
      health: "/health",
    };
  });

  app.get("/health", async () => {
    return {
      status: "ok",
      service: "backend",
      uptime: process.uptime(),
    };
  });
};
