import { FastifyPluginAsync } from "fastify";

import { createRateLimitPreHandler } from "../../middlewares/rate-limit";
import { UserController } from "./user.controller";
import {
  GenerateUploadSignatureBody,
  PublicProfileParams,
  UpdateProfileBody,
  generateUploadSignatureSchema,
  getPublicProfileSchema,
  updateProfileSchema,
} from "./user.schema";
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

  app.get(
    "/me/complete",
    { preHandler: [app.authenticate, readRateLimit] },
    userController.getCompleteProfile,
  );

  app.get(
    "/me/completion-guide",
    { preHandler: [app.authenticate, readRateLimit] },
    userController.getProfileCompletionGuide,
  );

  app.get<{ Params: PublicProfileParams }>(
    "/public/:publicProfileUrl",
    {
      preHandler: [readRateLimit],
      schema: getPublicProfileSchema,
    },
    userController.getPublicProfile,
  );

  app.post<{ Body: GenerateUploadSignatureBody }>(
    "/upload/signature",
    {
      preHandler: [app.authenticate, updateRateLimit],
      schema: generateUploadSignatureSchema,
    },
    userController.generateUploadSignature,
  );

  app.patch<{ Body: UpdateProfileBody }>(
    "/update",
    {
      preHandler: [app.authenticate, updateRateLimit],
      schema: updateProfileSchema,
    },
    userController.updateProfile,
  );
};
