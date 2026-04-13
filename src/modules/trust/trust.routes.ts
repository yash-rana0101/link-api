import { FastifyPluginAsync } from "fastify";

import { TrustController } from "./trust.controller";
import { RecalculateTrustScoreBody, RecalculateTrustScoreParams, recalculateTrustScoreSchema } from "./trust.schema";
import { TrustRepository } from "./trust.repository";
import { TrustService } from "./trust.service";

export const trustRoutes: FastifyPluginAsync = async (app) => {
  const trustRepository = new TrustRepository(app);
  const trustService = new TrustService(trustRepository, app.rustEngine, app.log);
  const trustController = new TrustController(trustService);

  app.post<{ Params: RecalculateTrustScoreParams; Body: RecalculateTrustScoreBody }>(
    "/recalculate/:userId",
    {
      schema: recalculateTrustScoreSchema,
    },
    trustController.recalculateTrustScore,
  );
};