export const TRUST_SCORE_QUEUE_NAME = "trust_score_queue";

export const trustScoreEvents = [
  "experience_verified",
  "verification_added",
  "connection_created",
  "user_reported",
] as const;

export type TrustScoreEvent = (typeof trustScoreEvents)[number];

export interface TrustScoreQueueJobData {
  userId: string;
  event: TrustScoreEvent;
  connections?: number;
  reports?: number;
}