import { FastifyReply, FastifyRequest } from "fastify";

import { getErrorDetails } from "../../utils/http-error";
import { UpdateProfileBody } from "./user.schema";
import { UserService } from "./user.service";

export class UserController {
  constructor(private readonly userService: UserService) { }

  getMe = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    try {
      const profile = await this.userService.getProfile(request.user.sub);

      reply.status(200).send({
        success: true,
        data: profile,
      });
    } catch (error) {
      const { statusCode, message } = getErrorDetails(error);
      reply.status(statusCode).send({ success: false, message });
    }
  };

  getCompleteProfile = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    try {
      const completeProfile = await this.userService.getCompleteProfile(request.user.sub);

      reply.status(200).send({
        success: true,
        data: completeProfile,
      });
    } catch (error) {
      const { statusCode, message } = getErrorDetails(error);
      reply.status(statusCode).send({ success: false, message });
    }
  };

  getProfileCompletionGuide = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    try {
      const completionGuide = await this.userService.getProfileCompletionGuide(request.user.sub);

      reply.status(200).send({
        success: true,
        data: completionGuide,
      });
    } catch (error) {
      const { statusCode, message } = getErrorDetails(error);
      reply.status(statusCode).send({ success: false, message });
    }
  };

  updateProfile = async (
    request: FastifyRequest<{ Body: UpdateProfileBody }>,
    reply: FastifyReply,
  ): Promise<void> => {
    try {
      const profile = await this.userService.updateProfile(request.user.sub, request.body);

      reply.status(200).send({
        success: true,
        message: "Profile updated successfully.",
        data: profile,
      });
    } catch (error) {
      const { statusCode, message } = getErrorDetails(error);
      reply.status(statusCode).send({ success: false, message });
    }
  };
}
