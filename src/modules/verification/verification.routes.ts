import { FastifyPluginAsync } from "fastify";

import { createRateLimitPreHandler } from "../../middlewares/rate-limit";
import { VerificationController } from "./verification.controller";
import { VerificationRepository } from "./verification.repository";
import {
  RequestVerificationBody,
  RespondVerificationBody,
  VerificationExperienceParams,
  getVerificationByExperienceSchema,
  requestVerificationSchema,
  respondVerificationSchema,
} from "./verification.schema";
import { VerificationService } from "./verification.service";

export const verificationRoutes: FastifyPluginAsync = async (app) => {
  const verificationRepository = new VerificationRepository(app);
  const verificationService = new VerificationService(
    verificationRepository,
    app.verificationQueue,
    app.trustScoreQueue,
    app.rustEngine,
    app.log,
  );
  const verificationController = new VerificationController(verificationService);
  const requestRateLimit = createRateLimitPreHandler(app, {
    endpoint: "verification:request",
    maxRequests: 30,
  });
  const respondRateLimit = createRateLimitPreHandler(app, {
    endpoint: "verification:respond",
    maxRequests: 40,
  });

  app.post<{ Body: RequestVerificationBody }>(
    "/request",
    {
      preHandler: [app.authenticate, requestRateLimit],
      schema: requestVerificationSchema,
    },
    verificationController.requestVerification,
  );

  app.post<{ Body: RespondVerificationBody }>(
    "/respond",
    {
      preHandler: [app.authenticate, respondRateLimit],
      schema: respondVerificationSchema,
    },
    verificationController.respondVerification,
  );

  app.get<{ Params: VerificationExperienceParams }>(
    "/:experienceId",
    {
      preHandler: [app.authenticate],
      schema: getVerificationByExperienceSchema,
    },
    verificationController.getVerificationByExperience,
  );
};
