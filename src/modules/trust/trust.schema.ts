import { FastifySchema } from "fastify";

import { TrustScoreEvent, trustScoreEvents } from "./trust.queue";

export interface RecalculateTrustScoreParams {
  userId: string;
}

export interface RecalculateTrustScoreBody {
  event?: TrustScoreEvent;
  connections?: number;
  reports?: number;
}

export const recalculateTrustScoreSchema: FastifySchema = {
  params: {
    type: "object",
    required: ["userId"],
    additionalProperties: false,
    properties: {
      userId: { type: "string", minLength: 1 },
    },
  },
  body: {
    type: "object",
    additionalProperties: false,
    properties: {
      event: {
        type: "string",
        enum: [...trustScoreEvents],
      },
      connections: {
        type: "integer",
        minimum: 0,
      },
      reports: {
        type: "integer",
        minimum: 0,
      },
    },
  },
};