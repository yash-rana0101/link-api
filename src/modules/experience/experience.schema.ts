import { ArtifactType } from "@prisma/client";
import { FastifySchema } from "fastify";

const artifactTypeValues = Object.values(ArtifactType);

export interface ExperienceIdParams {
  id: string;
}

export interface ExperienceUserParams {
  userId: string;
}

export interface CreateExperienceBody {
  companyName: string;
  role: string;
  description?: string;
  startDate: string;
  endDate?: string | null;
}

export interface UpdateExperienceBody {
  companyName?: string;
  role?: string;
  description?: string | null;
  startDate?: string;
  endDate?: string | null;
}

export interface AddArtifactBody {
  type: ArtifactType;
  url: string;
}

const idParamsSchema = {
  type: "object",
  required: ["id"],
  additionalProperties: false,
  properties: {
    id: { type: "string", minLength: 1 },
  },
};

const userIdParamsSchema = {
  type: "object",
  required: ["userId"],
  additionalProperties: false,
  properties: {
    userId: { type: "string", minLength: 1 },
  },
};

export const createExperienceSchema: FastifySchema = {
  body: {
    type: "object",
    required: ["companyName", "role", "startDate"],
    additionalProperties: false,
    properties: {
      companyName: { type: "string", minLength: 1, maxLength: 160 },
      role: { type: "string", minLength: 1, maxLength: 160 },
      description: { type: "string", maxLength: 4000 },
      startDate: { type: "string", format: "date-time" },
      endDate: { type: ["string", "null"], format: "date-time" },
    },
  },
};

export const getExperienceByIdSchema: FastifySchema = {
  params: idParamsSchema,
};

export const getUserExperiencesSchema: FastifySchema = {
  params: userIdParamsSchema,
};

export const updateExperienceSchema: FastifySchema = {
  params: idParamsSchema,
  body: {
    type: "object",
    additionalProperties: false,
    properties: {
      companyName: { type: "string", minLength: 1, maxLength: 160 },
      role: { type: "string", minLength: 1, maxLength: 160 },
      description: { type: ["string", "null"], maxLength: 4000 },
      startDate: { type: "string", format: "date-time" },
      endDate: { type: ["string", "null"], format: "date-time" },
    },
  },
};

export const deleteExperienceSchema: FastifySchema = {
  params: idParamsSchema,
};

export const addArtifactSchema: FastifySchema = {
  params: idParamsSchema,
  body: {
    type: "object",
    required: ["type", "url"],
    additionalProperties: false,
    properties: {
      type: { type: "string", enum: artifactTypeValues },
      url: { type: "string", format: "uri", maxLength: 2000 },
    },
  },
};