import { FastifyReply, FastifyRequest } from "fastify";

import { getErrorDetails } from "../../utils/http-error";
import {
  GlobalSearchQuerystring,
  GenerateUploadSignatureBody,
  ProfileViewsQuerystring,
  PublicProfileParams,
  UpdateProfileBody,
} from "./user.schema";
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

  getPublicProfile = async (
    request: FastifyRequest<{ Params: PublicProfileParams }>,
    reply: FastifyReply,
  ): Promise<void> => {
    try {
      const viewerId = await this.resolveOptionalViewerId(request);
      const profile = await this.userService.getPublicProfileByUrl(
        request.params.publicProfileUrl,
        viewerId,
      );

      reply.status(200).send({
        success: true,
        data: profile,
      });
    } catch (error) {
      const { statusCode, message } = getErrorDetails(error);
      reply.status(statusCode).send({ success: false, message });
    }
  };

  getProfileViews = async (
    request: FastifyRequest<{ Querystring: ProfileViewsQuerystring }>,
    reply: FastifyReply,
  ): Promise<void> => {
    try {
      const profileViews = await this.userService.getProfileViews(
        request.user.sub,
        request.query.limit,
      );

      reply.status(200).send({
        success: true,
        data: profileViews,
      });
    } catch (error) {
      const { statusCode, message } = getErrorDetails(error);
      reply.status(statusCode).send({ success: false, message });
    }
  };

  searchGlobal = async (
    request: FastifyRequest<{ Querystring: GlobalSearchQuerystring }>,
    reply: FastifyReply,
  ): Promise<void> => {
    try {
      const searchResult = await this.userService.searchGlobal(request.user.sub, request.query);

      reply.status(200).send({
        success: true,
        data: searchResult,
      });
    } catch (error) {
      const { statusCode, message } = getErrorDetails(error);
      reply.status(statusCode).send({ success: false, message });
    }
  };

  generateUploadSignature = async (
    request: FastifyRequest<{ Body: GenerateUploadSignatureBody }>,
    reply: FastifyReply,
  ): Promise<void> => {
    try {
      const uploadSignature = await this.userService.generateUploadSignature(
        request.user.sub,
        request.body.kind,
      );

      reply.status(200).send({
        success: true,
        data: uploadSignature,
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

  private async resolveOptionalViewerId(request: FastifyRequest): Promise<string | null> {
    const authorizationHeader = request.headers.authorization;

    if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
      return null;
    }

    const token = authorizationHeader.slice("Bearer ".length).trim();

    if (!token) {
      return null;
    }

    try {
      const payload = await request.server.jwt.verify<{ sub?: string; tokenType?: string }>(token);

      if (payload.tokenType !== "access") {
        return null;
      }

      const subject = payload.sub?.trim();

      return subject ? subject : null;
    } catch {
      return null;
    }
  }
}
