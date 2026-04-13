import { FastifyPluginAsync } from "fastify";

import { createRateLimitPreHandler } from "../../middlewares/rate-limit";
import { PostController } from "./post.controller";
import {
  AddCommentBody,
  CreatePostBody,
  FeedQuerystring,
  PostIdParams,
  addCommentSchema,
  createPostSchema,
  deletePostSchema,
  getFeedSchema,
  getPostByIdSchema,
  likePostSchema,
} from "./post.schema";
import { PostService } from "./post.service";

export const postRoutes: FastifyPluginAsync = async (app) => {
  const postService = new PostService(app);
  const postController = new PostController(postService);
  const createPostRateLimit = createRateLimitPreHandler(app, {
    endpoint: "posts:create",
    maxRequests: 20,
  });
  const feedReadRateLimit = createRateLimitPreHandler(app, {
    endpoint: "posts:feed",
    maxRequests: 120,
  });
  const postMutationRateLimit = createRateLimitPreHandler(app, {
    endpoint: "posts:mutate",
    maxRequests: 60,
  });

  app.post<{ Body: CreatePostBody }>(
    "/",
    {
      preHandler: [app.authenticate, createPostRateLimit],
      schema: createPostSchema,
    },
    postController.createPost,
  );

  app.get<{ Querystring: FeedQuerystring }>(
    "/feed",
    {
      preHandler: [app.authenticate, feedReadRateLimit],
      schema: getFeedSchema,
    },
    postController.getFeed,
  );

  app.get<{ Params: PostIdParams }>(
    "/:id",
    {
      preHandler: [app.authenticate],
      schema: getPostByIdSchema,
    },
    postController.getPostById,
  );

  app.delete<{ Params: PostIdParams }>(
    "/:id",
    {
      preHandler: [app.authenticate, postMutationRateLimit],
      schema: deletePostSchema,
    },
    postController.deletePost,
  );

  app.post<{ Params: PostIdParams }>(
    "/:id/like",
    {
      preHandler: [app.authenticate, postMutationRateLimit],
      schema: likePostSchema,
    },
    postController.likePost,
  );

  app.post<{ Params: PostIdParams; Body: AddCommentBody }>(
    "/:id/comment",
    {
      preHandler: [app.authenticate, postMutationRateLimit],
      schema: addCommentSchema,
    },
    postController.addComment,
  );
};
