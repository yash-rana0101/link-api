import { FastifyPluginAsync } from "fastify";

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
  const verificationService = new VerificationService(verificationRepository, app.verificationQueue);
  const verificationController = new VerificationController(verificationService);

  app.post<{ Body: RequestVerificationBody }>(
    "/request",
    {
      preHandler: [app.authenticate],
      schema: requestVerificationSchema,
    },
    verificationController.requestVerification,
  );

  app.post<{ Body: RespondVerificationBody }>(
    "/respond",
    {
      preHandler: [app.authenticate],
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
