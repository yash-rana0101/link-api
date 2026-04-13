import { FastifyReply, FastifyRequest } from "fastify";

import { getErrorDetails } from "../../utils/http-error";
import {
  RequestVerificationBody,
  RespondVerificationBody,
  VerificationExperienceParams,
} from "./verification.schema";
import { VerificationService } from "./verification.service";

export class VerificationController {
  constructor(private readonly verificationService: VerificationService) { }

  requestVerification = async (
    request: FastifyRequest<{ Body: RequestVerificationBody }>,
    reply: FastifyReply,
  ): Promise<void> => {
    try {
      const result = await this.verificationService.requestVerification(request.body, request.user.sub);

      reply.status(201).send({
        success: true,
        message: "Verification request created.",
        data: result,
      });
    } catch (error) {
      const { statusCode, message } = getErrorDetails(error);
      reply.status(statusCode).send({ success: false, message });
    }
  };

  respondVerification = async (
    request: FastifyRequest<{ Body: RespondVerificationBody }>,
    reply: FastifyReply,
  ): Promise<void> => {
    try {
      const result = await this.verificationService.respondVerification(request.body, request.user.sub);

      reply.status(200).send({
        success: true,
        message: "Verification response submitted.",
        data: result,
      });
    } catch (error) {
      const { statusCode, message } = getErrorDetails(error);
      reply.status(statusCode).send({ success: false, message });
    }
  };

  getVerificationByExperience = async (
    request: FastifyRequest<{ Params: VerificationExperienceParams }>,
    reply: FastifyReply,
  ): Promise<void> => {
    try {
      const result = await this.verificationService.getVerificationSummary(request.params.experienceId);

      reply.status(200).send({
        success: true,
        data: result,
      });
    } catch (error) {
      const { statusCode, message } = getErrorDetails(error);
      reply.status(statusCode).send({ success: false, message });
    }
  };
}
