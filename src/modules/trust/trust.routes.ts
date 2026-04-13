import { FastifyPluginAsync } from "fastify";

import { createRateLimitPreHandler } from "../../middlewares/rate-limit";
import { TrustController } from "./trust.controller";
import { RecalculateTrustScoreBody, RecalculateTrustScoreParams, recalculateTrustScoreSchema } from "./trust.schema";
import { TrustRepository } from "./trust.repository";
import { TrustService } from "./trust.service";

export const trustRoutes: FastifyPluginAsync = async (app) => {
  const trustRepository = new TrustRepository(app);
  const trustService = new TrustService(trustRepository, app.rustEngine, app.log);
  const trustController = new TrustController(trustService);
  const trustRecalculateRateLimit = createRateLimitPreHandler(app, {
    endpoint: "internal:trust:recalculate",
    maxRequests: 30,
  });

  app.post<{ Params: RecalculateTrustScoreParams; Body: RecalculateTrustScoreBody }>(
    "/recalculate/:userId",
    {
      preHandler: [app.authenticate, trustRecalculateRateLimit],
      schema: recalculateTrustScoreSchema,
    },
    trustController.recalculateTrustScore,
  );
};