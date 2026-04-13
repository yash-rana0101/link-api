import { FastifyReply, FastifyRequest } from "fastify";

import { getErrorDetails } from "../../utils/http-error";
import {
  AddArtifactBody,
  CreateExperienceBody,
  ExperienceIdParams,
  ExperienceUserParams,
  UpdateExperienceBody,
} from "./experience.schema";
import { ExperienceService } from "./experience.service";

export class ExperienceController {
  constructor(private readonly experienceService: ExperienceService) { }

  createExperience = async (
    request: FastifyRequest<{ Body: CreateExperienceBody }>,
    reply: FastifyReply,
  ): Promise<void> => {
    try {
      const experience = await this.experienceService.createExperience(request.body, request.user.sub);

      reply.status(201).send({
        success: true,
        message: "Experience created successfully.",
        data: experience,
      });
    } catch (error) {
      const { statusCode, message } = getErrorDetails(error);
      reply.status(statusCode).send({ success: false, message });
    }
  };

  getExperienceById = async (
    request: FastifyRequest<{ Params: ExperienceIdParams }>,
    reply: FastifyReply,
  ): Promise<void> => {
    try {
      const experience = await this.experienceService.getExperienceById(request.params.id);

      reply.status(200).send({
        success: true,
        data: experience,
      });
    } catch (error) {
      const { statusCode, message } = getErrorDetails(error);
      reply.status(statusCode).send({ success: false, message });
    }
  };

  getUserExperiences = async (
    request: FastifyRequest<{ Params: ExperienceUserParams }>,
    reply: FastifyReply,
  ): Promise<void> => {
    try {
      const experiences = await this.experienceService.getUserExperiences(request.params.userId);

      reply.status(200).send({
        success: true,
        data: experiences,
      });
    } catch (error) {
      const { statusCode, message } = getErrorDetails(error);
      reply.status(statusCode).send({ success: false, message });
    }
  };

  updateExperience = async (
    request: FastifyRequest<{ Params: ExperienceIdParams; Body: UpdateExperienceBody }>,
    reply: FastifyReply,
  ): Promise<void> => {
    try {
      const experience = await this.experienceService.updateExperience(
        request.params.id,
        request.body,
        request.user.sub,
      );

      reply.status(200).send({
        success: true,
        message: "Experience updated successfully.",
        data: experience,
      });
    } catch (error) {
      const { statusCode, message } = getErrorDetails(error);
      reply.status(statusCode).send({ success: false, message });
    }
  };

  deleteExperience = async (
    request: FastifyRequest<{ Params: ExperienceIdParams }>,
    reply: FastifyReply,
  ): Promise<void> => {
    try {
      await this.experienceService.deleteExperience(request.params.id, request.user.sub);

      reply.status(200).send({
        success: true,
        message: "Experience deleted successfully.",
      });
    } catch (error) {
      const { statusCode, message } = getErrorDetails(error);
      reply.status(statusCode).send({ success: false, message });
    }
  };

  addArtifact = async (
    request: FastifyRequest<{ Params: ExperienceIdParams; Body: AddArtifactBody }>,
    reply: FastifyReply,
  ): Promise<void> => {
    try {
      const artifact = await this.experienceService.addArtifact(request.params.id, request.body, request.user.sub);

      reply.status(201).send({
        success: true,
        message: "Artifact added successfully.",
        data: artifact,
      });
    } catch (error) {
      const { statusCode, message } = getErrorDetails(error);
      reply.status(statusCode).send({ success: false, message });
    }
  };
}