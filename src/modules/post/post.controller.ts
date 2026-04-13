import { FastifyReply, FastifyRequest } from "fastify";

import { getErrorDetails } from "../../utils/http-error";
import { AddCommentBody, CreatePostBody, FeedQuerystring, PostIdParams } from "./post.schema";
import { PostService } from "./post.service";

export class PostController {
  constructor(private readonly postService: PostService) { }

  createPost = async (
    request: FastifyRequest<{ Body: CreatePostBody }>,
    reply: FastifyReply,
  ): Promise<void> => {
    try {
      const post = await this.postService.createPost(request.body, request.user.sub);

      reply.status(201).send({
        success: true,
        message: "Post created successfully.",
        data: post,
      });
    } catch (error) {
      const { statusCode, message } = getErrorDetails(error);
      reply.status(statusCode).send({ success: false, message });
    }
  };

  getFeed = async (
    request: FastifyRequest<{ Querystring: FeedQuerystring }>,
    reply: FastifyReply,
  ): Promise<void> => {
    try {
      const feed = await this.postService.getFeed(request.query);

      reply.status(200).send({
        success: true,
        data: feed,
      });
    } catch (error) {
      const { statusCode, message } = getErrorDetails(error);
      reply.status(statusCode).send({ success: false, message });
    }
  };

  getPostById = async (
    request: FastifyRequest<{ Params: PostIdParams }>,
    reply: FastifyReply,
  ): Promise<void> => {
    try {
      const post = await this.postService.getPostById(request.params.id);

      reply.status(200).send({
        success: true,
        data: post,
      });
    } catch (error) {
      const { statusCode, message } = getErrorDetails(error);
      reply.status(statusCode).send({ success: false, message });
    }
  };

  deletePost = async (
    request: FastifyRequest<{ Params: PostIdParams }>,
    reply: FastifyReply,
  ): Promise<void> => {
    try {
      await this.postService.deletePost(request.params.id, request.user.sub);

      reply.status(200).send({
        success: true,
        message: "Post deleted successfully.",
      });
    } catch (error) {
      const { statusCode, message } = getErrorDetails(error);
      reply.status(statusCode).send({ success: false, message });
    }
  };

  likePost = async (
    request: FastifyRequest<{ Params: PostIdParams }>,
    reply: FastifyReply,
  ): Promise<void> => {
    try {
      const likeResult = await this.postService.likePost(request.params.id, request.user.sub);

      reply.status(200).send({
        success: true,
        message: "Post like status updated.",
        data: likeResult,
      });
    } catch (error) {
      const { statusCode, message } = getErrorDetails(error);
      reply.status(statusCode).send({ success: false, message });
    }
  };

  addComment = async (
    request: FastifyRequest<{ Params: PostIdParams; Body: AddCommentBody }>,
    reply: FastifyReply,
  ): Promise<void> => {
    try {
      const comment = await this.postService.addComment(request.params.id, request.body, request.user.sub);

      reply.status(201).send({
        success: true,
        message: "Comment added successfully.",
        data: comment,
      });
    } catch (error) {
      const { statusCode, message } = getErrorDetails(error);
      reply.status(statusCode).send({ success: false, message });
    }
  };
}
