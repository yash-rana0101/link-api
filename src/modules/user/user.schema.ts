import { FastifySchema } from "fastify";

export interface UpdateProfileBody {
  name?: string;
}

export const updateProfileSchema: FastifySchema = {
  body: {
    type: "object",
    additionalProperties: false,
    properties: {
      name: { type: "string", minLength: 1, maxLength: 120 },
    },
  },
};
