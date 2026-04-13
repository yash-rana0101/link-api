import { FastifyPluginAsync } from "fastify";

import { createRateLimitPreHandler } from "../../middlewares/rate-limit";
import { JobsController } from "./jobs.controller";
import {
  ApplicationIdParams,
  CreateJobBody,
  JobIdParams,
  ListJobsQuerystring,
  UpdateApplicationStatusBody,
  applyToJobSchema,
  createJobSchema,
  deleteJobSchema,
  getJobApplicationsSchema,
  getJobByIdSchema,
  listJobsSchema,
  updateApplicationStatusSchema,
} from "./jobs.schema";
import { JobsService } from "./jobs.service";

export const jobRoutes: FastifyPluginAsync = async (app) => {
  const jobsService = new JobsService(app);
  const jobsController = new JobsController(jobsService);
  const createJobRateLimit = createRateLimitPreHandler(app, {
    endpoint: "jobs:create",
    maxRequests: 20,
  });
  const readJobsRateLimit = createRateLimitPreHandler(app, {
    endpoint: "jobs:read",
    maxRequests: 120,
  });
  const deleteJobRateLimit = createRateLimitPreHandler(app, {
    endpoint: "jobs:delete",
    maxRequests: 30,
  });
  const applyRateLimit = createRateLimitPreHandler(app, {
    endpoint: "jobs:apply",
    maxRequests: 30,
  });
  const readApplicationsRateLimit = createRateLimitPreHandler(app, {
    endpoint: "jobs:applications:read",
    maxRequests: 120,
  });

  app.post<{ Body: CreateJobBody }>(
    "/",
    {
      preHandler: [app.authenticate, createJobRateLimit],
      schema: createJobSchema,
    },
    jobsController.createJob,
  );

  app.get<{ Querystring: ListJobsQuerystring }>(
    "/",
    {
      preHandler: [app.authenticate, readJobsRateLimit],
      schema: listJobsSchema,
    },
    jobsController.getJobs,
  );

  app.get<{ Params: JobIdParams }>(
    "/:id",
    {
      preHandler: [app.authenticate, readJobsRateLimit],
      schema: getJobByIdSchema,
    },
    jobsController.getJobById,
  );

  app.delete<{ Params: JobIdParams }>(
    "/:id",
    {
      preHandler: [app.authenticate, deleteJobRateLimit],
      schema: deleteJobSchema,
    },
    jobsController.deleteJob,
  );

  app.post<{ Params: JobIdParams }>(
    "/:id/apply",
    {
      preHandler: [app.authenticate, applyRateLimit],
      schema: applyToJobSchema,
    },
    jobsController.applyToJob,
  );

  app.get<{ Params: JobIdParams }>(
    "/:id/applications",
    {
      preHandler: [app.authenticate, readApplicationsRateLimit],
      schema: getJobApplicationsSchema,
    },
    jobsController.getJobApplications,
  );
};

export const applicationRoutes: FastifyPluginAsync = async (app) => {
  const jobsService = new JobsService(app);
  const jobsController = new JobsController(jobsService);
  const updateStatusRateLimit = createRateLimitPreHandler(app, {
    endpoint: "applications:status:update",
    maxRequests: 60,
  });

  app.patch<{ Params: ApplicationIdParams; Body: UpdateApplicationStatusBody }>(
    "/:id/status",
    {
      preHandler: [app.authenticate, updateStatusRateLimit],
      schema: updateApplicationStatusSchema,
    },
    jobsController.updateApplicationStatus,
  );
};
