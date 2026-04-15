import { FastifyReply, FastifyRequest } from "fastify";

import { getErrorDetails } from "../../utils/http-error";
import { FollowUserParams } from "./follows.schema";
import { FollowService } from "./follows.service";

export class FollowController {
  constructor(private readonly followService: FollowService) { }

  followUser = async (
    request: FastifyRequest<{ Params: FollowUserParams }>,
    reply: FastifyReply,
  ): Promise<void> => {
    try {
      const follow = await this.followService.followUser(request.params.userId, request.user.sub);

      reply.status(201).send({
        success: true,
        message: "User followed successfully.",
        data: follow,
      });
    } catch (error) {
      request.log.error(
        {
          err: error,
          targetUserId: request.params.userId,
        },
        "Failed to follow user.",
      );

      const { statusCode, message } = getErrorDetails(error);
      reply.status(statusCode).send({ success: false, message });
    }
  };

  unfollowUser = async (
    request: FastifyRequest<{ Params: FollowUserParams }>,
    reply: FastifyReply,
  ): Promise<void> => {
    try {
      await this.followService.unfollowUser(request.params.userId, request.user.sub);

      reply.status(200).send({
        success: true,
        message: "User unfollowed successfully.",
      });
    } catch (error) {
      request.log.error(
        {
          err: error,
          targetUserId: request.params.userId,
        },
        "Failed to unfollow user.",
      );

      const { statusCode, message } = getErrorDetails(error);
      reply.status(statusCode).send({ success: false, message });
    }
  };

  getFollowStatus = async (
    request: FastifyRequest<{ Params: FollowUserParams }>,
    reply: FastifyReply,
  ): Promise<void> => {
    try {
      const followStatus = await this.followService.getFollowStatus(request.params.userId, request.user.sub);

      reply.status(200).send({
        success: true,
        data: followStatus,
      });
    } catch (error) {
      request.log.error(
        {
          err: error,
          targetUserId: request.params.userId,
        },
        "Failed to get follow status.",
      );

      const { statusCode, message } = getErrorDetails(error);
      reply.status(statusCode).send({ success: false, message });
    }
  };
}
