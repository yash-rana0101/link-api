import { FastifyPluginAsync } from "fastify";

import { ExperienceController } from "./experience.controller";
import { ExperienceRepository } from "./experience.repository";
import {
  AddArtifactBody,
  CreateExperienceBody,
  ExperienceIdParams,
  ExperienceUserParams,
  UpdateExperienceBody,
  addArtifactSchema,
  createExperienceSchema,
  deleteExperienceSchema,
  getExperienceByIdSchema,
  getUserExperiencesSchema,
  updateExperienceSchema,
} from "./experience.schema";
import { ExperienceService } from "./experience.service";

export const experienceRoutes: FastifyPluginAsync = async (app) => {
  const experienceRepository = new ExperienceRepository(app);
  const experienceService = new ExperienceService(experienceRepository);
  const experienceController = new ExperienceController(experienceService);

  app.post<{ Body: CreateExperienceBody }>(
    "/",
    {
      preHandler: [app.authenticate],
      schema: createExperienceSchema,
    },
    experienceController.createExperience,
  );

  app.get<{ Params: ExperienceIdParams }>(
    "/:id",
    {
      schema: getExperienceByIdSchema,
    },
    experienceController.getExperienceById,
  );

  app.get<{ Params: ExperienceUserParams }>(
    "/user/:userId",
    {
      schema: getUserExperiencesSchema,
    },
    experienceController.getUserExperiences,
  );

  app.patch<{ Params: ExperienceIdParams; Body: UpdateExperienceBody }>(
    "/:id",
    {
      preHandler: [app.authenticate],
      schema: updateExperienceSchema,
    },
    experienceController.updateExperience,
  );

  app.delete<{ Params: ExperienceIdParams }>(
    "/:id",
    {
      preHandler: [app.authenticate],
      schema: deleteExperienceSchema,
    },
    experienceController.deleteExperience,
  );

  app.post<{ Params: ExperienceIdParams; Body: AddArtifactBody }>(
    "/:id/artifact",
    {
      preHandler: [app.authenticate],
      schema: addArtifactSchema,
    },
    experienceController.addArtifact,
  );
};