import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

const loggerPlugin: FastifyPluginAsync = fp(async (app) => {
  app.addHook("onResponse", async (request, reply) => {
    const path = request.url.split("?")[0];

    // Suppress browser noise that does not add operational value.
    if (path === "/favicon.ico") {
      return;
    }

    const payload = {
      method: request.method,
      path,
      statusCode: reply.statusCode,
      durationMs: Number(reply.elapsedTime.toFixed(2)),
      reqId: request.id,
    };

    if (reply.statusCode >= 500) {
      app.log.error(payload, "HTTP request failed");
      return;
    }

    if (reply.statusCode >= 400) {
      app.log.warn(payload, "HTTP request completed with client error");
      return;
    }

    app.log.info(payload, "HTTP request completed");
  });

  app.setNotFoundHandler(async (request, reply) => {
    const path = request.url.split("?")[0];

    if (path === "/favicon.ico") {
      reply.status(204).send();
      return;
    }

    reply.status(404).send({
      statusCode: 404,
      error: "Not Found",
      message: `Route ${request.method} ${path} not found`,
      hint: "Try GET /health to check service status.",
    });
  });

  app.addHook("onReady", async () => {
    app.log.info("Logger plugin initialized.");
  });
});

export default loggerPlugin;
