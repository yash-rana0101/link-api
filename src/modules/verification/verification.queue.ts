export const VERIFICATION_QUEUE_NAME = "verification_queue";

export interface VerificationQueueJobData {
  experienceId: string;
  requesterId: string;
  verifierId: string;
}
