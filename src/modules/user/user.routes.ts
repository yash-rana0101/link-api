import { FastifyPluginAsync } from "fastify";

import { createRateLimitPreHandler } from "../../middlewares/rate-limit";
import { UserController } from "./user.controller";
import { UpdateProfileBody, updateProfileSchema } from "./user.schema";
import { UserService } from "./user.service";

export const userRoutes: FastifyPluginAsync = async (app) => {
  const userService = new UserService(app);
  const userController = new UserController(userService);
  const readRateLimit = createRateLimitPreHandler(app, {
    endpoint: "user:read",
    maxRequests: 120,
  });
  const updateRateLimit = createRateLimitPreHandler(app, {
    endpoint: "user:update",
    maxRequests: 30,
  });

  app.get("/me", { preHandler: [app.authenticate, readRateLimit] }, userController.getMe);

  app.patch<{ Body: UpdateProfileBody }>(
    "/update",
    {
      preHandler: [app.authenticate, updateRateLimit],
      schema: updateProfileSchema,
    },
    userController.updateProfile,
  );
};
