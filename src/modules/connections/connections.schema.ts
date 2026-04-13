import { ConnectionStatus, RelationshipType } from "@prisma/client";
import { FastifySchema } from "fastify";

const relationshipValues = Object.values(RelationshipType);
const responseStatusValues = [ConnectionStatus.ACCEPTED, ConnectionStatus.REJECTED];

export interface ConnectionIdParams {
  id: string;
}

export interface SendConnectionRequestBody {
  receiverId: string;
  relationship: RelationshipType;
}

export type RespondConnectionStatus = (typeof responseStatusValues)[number];

export interface RespondConnectionRequestBody {
  connectionId: string;
  status: RespondConnectionStatus;
}

const connectionIdParamsSchema = {
  type: "object",
  required: ["id"],
  additionalProperties: false,
  properties: {
    id: { type: "string", minLength: 1 },
  },
};

export const sendConnectionRequestSchema: FastifySchema = {
  body: {
    type: "object",
    required: ["receiverId", "relationship"],
    additionalProperties: false,
    properties: {
      receiverId: { type: "string", minLength: 1 },
      relationship: { type: "string", enum: relationshipValues },
    },
  },
};

export const respondConnectionRequestSchema: FastifySchema = {
  body: {
    type: "object",
    required: ["connectionId", "status"],
    additionalProperties: false,
    properties: {
      connectionId: { type: "string", minLength: 1 },
      status: { type: "string", enum: responseStatusValues },
    },
  },
};

export const deleteConnectionSchema: FastifySchema = {
  params: connectionIdParamsSchema,
};
