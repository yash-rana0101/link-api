import { FastifyPluginAsync } from "fastify";

import { createRateLimitPreHandler } from "../../middlewares/rate-limit";
import { FollowController } from "./follows.controller";
import {
  FollowUserParams,
  followUserSchema,
  getFollowStatusSchema,
  unfollowUserSchema,
} from "./follows.schema";
import { FollowService } from "./follows.service";

export const followRoutes: FastifyPluginAsync = async (app) => {
  const followService = new FollowService(app);
  const followController = new FollowController(followService);
  const followMutationRateLimit = createRateLimitPreHandler(app, {
    endpoint: "follows:mutate",
    maxRequests: 60,
  });
  const followReadRateLimit = createRateLimitPreHandler(app, {
    endpoint: "follows:read",
    maxRequests: 120,
  });

  app.post<{ Params: FollowUserParams }>(
    "/:userId",
    {
      preHandler: [app.authenticate, followMutationRateLimit],
      schema: followUserSchema,
    },
    followController.followUser,
  );

  app.delete<{ Params: FollowUserParams }>(
    "/:userId",
    {
      preHandler: [app.authenticate, followMutationRateLimit],
      schema: unfollowUserSchema,
    },
    followController.unfollowUser,
  );

  app.get<{ Params: FollowUserParams }>(
    "/:userId/status",
    {
      preHandler: [app.authenticate, followReadRateLimit],
      schema: getFollowStatusSchema,
    },
    followController.getFollowStatus,
  );
};
