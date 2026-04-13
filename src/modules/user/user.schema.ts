import { FastifySchema } from "fastify";

export interface UpdateProfileBody {
  name?: string;
  currentRole?: string | null;
  profileImageUrl?: string | null;
  headline?: string | null;
  about?: string | null;
  skills?: string[];
}

export const updateProfileSchema: FastifySchema = {
  body: {
    type: "object",
    additionalProperties: false,
    properties: {
      name: { type: "string", minLength: 1, maxLength: 120 },
      currentRole: { type: ["string", "null"], minLength: 1, maxLength: 160 },
      profileImageUrl: { type: ["string", "null"], format: "uri", maxLength: 2000 },
      headline: { type: ["string", "null"], minLength: 1, maxLength: 180 },
      about: { type: ["string", "null"], minLength: 1, maxLength: 2000 },
      skills: {
        type: "array",
        minItems: 0,
        maxItems: 10,
        uniqueItems: true,
        items: { type: "string", minLength: 1, maxLength: 40 },
      },
    },
  },
};
