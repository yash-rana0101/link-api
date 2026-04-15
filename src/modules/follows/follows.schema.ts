import { FastifySchema } from "fastify";

export interface FollowUserParams {
  userId: string;
}

const followUserParamsSchema = {
  type: "object",
  required: ["userId"],
  additionalProperties: false,
  properties: {
    userId: { type: "string", minLength: 1 },
  },
};

export const followUserSchema: FastifySchema = {
  params: followUserParamsSchema,
};

export const unfollowUserSchema: FastifySchema = {
  params: followUserParamsSchema,
};

export const getFollowStatusSchema: FastifySchema = {
  params: followUserParamsSchema,
};
