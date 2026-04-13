import { FastifyReply, FastifyRequest } from "fastify";

import { getErrorDetails } from "../../utils/http-error";
import {
  ApplicationIdParams,
  CreateJobBody,
  JobIdParams,
  ListJobsQuerystring,
  UpdateApplicationStatusBody,
} from "./jobs.schema";
import { JobsService } from "./jobs.service";

export class JobsController {
  constructor(private readonly jobsService: JobsService) { }

  createJob = async (
    request: FastifyRequest<{ Body: CreateJobBody }>,
    reply: FastifyReply,
  ): Promise<void> => {
    try {
      const job = await this.jobsService.createJob(request.body, request.user.sub);

      reply.status(201).send({
        success: true,
        message: "Job created successfully.",
        data: job,
      });
    } catch (error) {
      const { statusCode, message } = getErrorDetails(error);
      reply.status(statusCode).send({ success: false, message });
    }
  };

  getJobs = async (
    request: FastifyRequest<{ Querystring: ListJobsQuerystring }>,
    reply: FastifyReply,
  ): Promise<void> => {
    try {
      const jobs = await this.jobsService.getJobs(request.query);

      reply.status(200).send({
        success: true,
        data: jobs,
      });
    } catch (error) {
      const { statusCode, message } = getErrorDetails(error);
      reply.status(statusCode).send({ success: false, message });
    }
  };

  getJobById = async (
    request: FastifyRequest<{ Params: JobIdParams }>,
    reply: FastifyReply,
  ): Promise<void> => {
    try {
      const job = await this.jobsService.getJobById(request.params.id);

      reply.status(200).send({
        success: true,
        data: job,
      });
    } catch (error) {
      const { statusCode, message } = getErrorDetails(error);
      reply.status(statusCode).send({ success: false, message });
    }
  };

  deleteJob = async (
    request: FastifyRequest<{ Params: JobIdParams }>,
    reply: FastifyReply,
  ): Promise<void> => {
    try {
      await this.jobsService.deleteJob(request.params.id, request.user.sub);

      reply.status(200).send({
        success: true,
        message: "Job deleted successfully.",
      });
    } catch (error) {
      const { statusCode, message } = getErrorDetails(error);
      reply.status(statusCode).send({ success: false, message });
    }
  };

  applyToJob = async (
    request: FastifyRequest<{ Params: JobIdParams }>,
    reply: FastifyReply,
  ): Promise<void> => {
    try {
      const application = await this.jobsService.applyToJob(request.params.id, request.user.sub);

      reply.status(201).send({
        success: true,
        message: "Applied to job successfully.",
        data: application,
      });
    } catch (error) {
      const { statusCode, message } = getErrorDetails(error);
      reply.status(statusCode).send({ success: false, message });
    }
  };

  getJobApplications = async (
    request: FastifyRequest<{ Params: JobIdParams }>,
    reply: FastifyReply,
  ): Promise<void> => {
    try {
      const applications = await this.jobsService.getJobApplications(request.params.id, request.user.sub);

      reply.status(200).send({
        success: true,
        data: applications,
      });
    } catch (error) {
      const { statusCode, message } = getErrorDetails(error);
      reply.status(statusCode).send({ success: false, message });
    }
  };

  updateApplicationStatus = async (
    request: FastifyRequest<{ Params: ApplicationIdParams; Body: UpdateApplicationStatusBody }>,
    reply: FastifyReply,
  ): Promise<void> => {
    try {
      const application = await this.jobsService.updateApplicationStatus(
        request.params.id,
        request.body.status,
        request.user.sub,
      );

      reply.status(200).send({
        success: true,
        message: "Application status updated successfully.",
        data: application,
      });
    } catch (error) {
      const { statusCode, message } = getErrorDetails(error);
      reply.status(statusCode).send({ success: false, message });
    }
  };
}
