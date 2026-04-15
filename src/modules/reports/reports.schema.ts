import { FastifySchema } from "fastify";

export const profileReportReasons = [
  "SPAM",
  "IMPERSONATION",
  "HARASSMENT",
  "MISINFORMATION",
  "INAPPROPRIATE",
  "OTHER",
] as const;

export type ProfileReportReason = (typeof profileReportReasons)[number];

export interface CreateProfileReportBody {
  reportedUserId: string;
  reason: ProfileReportReason;
  details?: string;
}

export const createProfileReportSchema: FastifySchema = {
  body: {
    type: "object",
    required: ["reportedUserId", "reason"],
    additionalProperties: false,
    properties: {
      reportedUserId: { type: "string", minLength: 1 },
      reason: { type: "string", enum: [...profileReportReasons] },
      details: { type: "string", minLength: 1, maxLength: 2000 },
    },
  },
};
