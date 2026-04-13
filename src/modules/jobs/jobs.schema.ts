import { ApplicationStatus } from "@prisma/client";
import { FastifySchema } from "fastify";

const updatableApplicationStatuses = [
  ApplicationStatus.SHORTLISTED,
  ApplicationStatus.REJECTED,
  ApplicationStatus.HIRED,
] as const;

export interface JobIdParams {
  id: string;
}

export interface ApplicationIdParams {
  id: string;
}

export interface CreateJobBody {
  title: string;
  description: string;
  location?: string;
}

export interface ListJobsQuerystring {
  limit?: string;
}

export type UpdatableApplicationStatus = (typeof updatableApplicationStatuses)[number];

export interface UpdateApplicationStatusBody {
  status: UpdatableApplicationStatus;
}

const idParamsSchema = {
  type: "object",
  required: ["id"],
  additionalProperties: false,
  properties: {
    id: { type: "string", minLength: 1 },
  },
};

export const createJobSchema: FastifySchema = {
  body: {
    type: "object",
    required: ["title", "description"],
    additionalProperties: false,
    properties: {
      title: { type: "string", minLength: 1, maxLength: 200 },
      description: { type: "string", minLength: 1, maxLength: 8000 },
      location: { type: "string", minLength: 1, maxLength: 200 },
    },
  },
};

export const listJobsSchema: FastifySchema = {
  querystring: {
    type: "object",
    additionalProperties: false,
    properties: {
      limit: { type: "string", pattern: "^[0-9]+$" },
    },
  },
};

export const getJobByIdSchema: FastifySchema = {
  params: idParamsSchema,
};

export const deleteJobSchema: FastifySchema = {
  params: idParamsSchema,
};

export const applyToJobSchema: FastifySchema = {
  params: idParamsSchema,
};

export const getJobApplicationsSchema: FastifySchema = {
  params: idParamsSchema,
};

export const updateApplicationStatusSchema: FastifySchema = {
  params: idParamsSchema,
  body: {
    type: "object",
    required: ["status"],
    additionalProperties: false,
    properties: {
      status: { type: "string", enum: [...updatableApplicationStatuses] },
    },
  },
};
