import { VerificationStatus } from "@prisma/client";
import { FastifySchema } from "fastify";

const responseStatusValues = [VerificationStatus.APPROVED, VerificationStatus.REJECTED];

export interface VerificationExperienceParams {
  experienceId: string;
}

export interface RequestVerificationBody {
  experienceId: string;
  verifierIds: string[];
}

export type RespondVerificationStatus = (typeof responseStatusValues)[number];

export interface RespondVerificationBody {
  experienceId: string;
  status: RespondVerificationStatus;
}

const experienceIdParamsSchema = {
  type: "object",
  required: ["experienceId"],
  additionalProperties: false,
  properties: {
    experienceId: { type: "string", minLength: 1 },
  },
};

export const requestVerificationSchema: FastifySchema = {
  body: {
    type: "object",
    required: ["experienceId", "verifierIds"],
    additionalProperties: false,
    properties: {
      experienceId: { type: "string", minLength: 1 },
      verifierIds: {
        type: "array",
        minItems: 1,
        items: {
          type: "string",
          minLength: 1,
        },
      },
    },
  },
};

export const respondVerificationSchema: FastifySchema = {
  body: {
    type: "object",
    required: ["experienceId", "status"],
    additionalProperties: false,
    properties: {
      experienceId: { type: "string", minLength: 1 },
      status: {
        type: "string",
        enum: responseStatusValues,
      },
    },
  },
};

export const getVerificationByExperienceSchema: FastifySchema = {
  params: experienceIdParamsSchema,
};
