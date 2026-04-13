import { FastifyPluginAsync } from "fastify";

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

  app.post<{ Body: CreatePostBody }>(
    "/",
    {
      preHandler: [app.authenticate],
      schema: createPostSchema,
    },
    postController.createPost,
  );

  app.get<{ Querystring: FeedQuerystring }>(
    "/feed",
    {
      preHandler: [app.authenticate],
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
      preHandler: [app.authenticate],
      schema: deletePostSchema,
    },
    postController.deletePost,
  );

  app.post<{ Params: PostIdParams }>(
    "/:id/like",
    {
      preHandler: [app.authenticate],
      schema: likePostSchema,
    },
    postController.likePost,
  );

  app.post<{ Params: PostIdParams; Body: AddCommentBody }>(
    "/:id/comment",
    {
      preHandler: [app.authenticate],
      schema: addCommentSchema,
    },
    postController.addComment,
  );
};
