import { FastifySchema } from "fastify";

export interface PostIdParams {
  id: string;
}

export interface CreatePostBody {
  content: string;
}

export interface AddCommentBody {
  content: string;
}

export interface FeedQuerystring {
  cursor?: string;
  limit?: string;
}

const postIdParamsSchema = {
  type: "object",
  required: ["id"],
  additionalProperties: false,
  properties: {
    id: { type: "string", minLength: 1 },
  },
};

const contentBodySchema = {
  type: "object",
  required: ["content"],
  additionalProperties: false,
  properties: {
    content: { type: "string", minLength: 1, maxLength: 5000 },
  },
};

export const createPostSchema: FastifySchema = {
  body: contentBodySchema,
};

export const getFeedSchema: FastifySchema = {
  querystring: {
    type: "object",
    additionalProperties: false,
    properties: {
      cursor: { type: "string", format: "date-time" },
      limit: { type: "string", pattern: "^[0-9]+$" },
    },
  },
};

export const getPostByIdSchema: FastifySchema = {
  params: postIdParamsSchema,
};

export const deletePostSchema: FastifySchema = {
  params: postIdParamsSchema,
};

export const likePostSchema: FastifySchema = {
  params: postIdParamsSchema,
};

export const addCommentSchema: FastifySchema = {
  params: postIdParamsSchema,
  body: {
    ...contentBodySchema,
    properties: {
      content: { type: "string", minLength: 1, maxLength: 2000 },
    },
  },
};
