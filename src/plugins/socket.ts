import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { Server } from "socket.io";

import { registerMessagingSocketHandlers } from "../modules/messaging/messaging.socket";

const socketPlugin: FastifyPluginAsync = fp(async (app) => {
  const io = new Server(app.server, {
    cors: {
      origin: true,
      credentials: true,
    },
  });

  registerMessagingSocketHandlers(app, io);
  app.decorate("io", io);

  app.addHook("onClose", async () => {
    await io.close();
  });
});

export default socketPlugin;
