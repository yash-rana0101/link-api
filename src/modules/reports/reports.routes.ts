import { FastifyPluginAsync } from "fastify";

import { createRateLimitPreHandler } from "../../middlewares/rate-limit";
import { ReportController } from "./reports.controller";
import { CreateProfileReportBody, createProfileReportSchema } from "./reports.schema";
import { ReportService } from "./reports.service";

export const reportRoutes: FastifyPluginAsync = async (app) => {
  const reportService = new ReportService(app);
  const reportController = new ReportController(reportService);
  const reportMutationRateLimit = createRateLimitPreHandler(app, {
    endpoint: "reports:create",
    maxRequests: 30,
  });

  app.post<{ Body: CreateProfileReportBody }>(
    "/profile",
    {
      preHandler: [app.authenticate, reportMutationRateLimit],
      schema: createProfileReportSchema,
    },
    reportController.createProfileReport,
  );
};
