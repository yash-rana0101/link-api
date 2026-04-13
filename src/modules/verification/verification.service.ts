import { ExperienceStatus, VerificationStatus } from "@prisma/client";
import { Queue } from "bullmq";
import { FastifyBaseLogger } from "fastify";

import { TrustScoreEvent, TrustScoreQueueJobData } from "../trust/trust.queue";
import { HttpError } from "../../utils/http-error";
import { RustEngineClient } from "../../utils/rust-engine-client";
import { VerificationQueueJobData } from "./verification.queue";
import { VerificationRecord, VerificationRepository } from "./verification.repository";
import { RequestVerificationBody, RespondVerificationBody } from "./verification.schema";

const MIN_APPROVALS_REQUIRED = 2;

type VerificationResolutionSource = "rust" | "fallback";

export interface RequestVerificationResult {
  experienceId: string;
  requestedCount: number;
  verifications: VerificationRecord[];
}

export interface RespondVerificationResult {
  experienceId: string;
  verificationStatus: VerificationStatus;
  approvalsRequired: number;
  approvalsReceived: number;
  consensusReached: boolean;
  experienceStatus: ExperienceStatus;
  resolutionSource: VerificationResolutionSource;
  trustScore: number | null;
}

export interface VerificationSummaryResult {
  experienceId: string;
  experienceStatus: ExperienceStatus;
  approvalsRequired: number;
  approvalsReceived: number;
  verifications: VerificationRecord[];
}

export class VerificationService {
  constructor(
    private readonly repository: VerificationRepository,
    private readonly verificationQueue: Queue<VerificationQueueJobData>,
    private readonly trustScoreQueue: Queue<TrustScoreQueueJobData>,
    private readonly rustEngine: RustEngineClient,
    private readonly logger: FastifyBaseLogger,
  ) { }

  async requestVerification(data: RequestVerificationBody, requesterId: string): Promise<RequestVerificationResult> {
    const experienceId = data.experienceId.trim();

    const experience = await this.repository.findExperienceById(experienceId);

    if (!experience) {
      throw new HttpError(404, "Experience not found.");
    }

    if (experience.userId !== requesterId) {
      throw new HttpError(403, "Only the experience owner can request verification.");
    }

    const verifierIds = this.normalizeVerifierIds(data.verifierIds);

    if (!verifierIds.length) {
      throw new HttpError(400, "At least one verifier is required.");
    }

    if (verifierIds.includes(requesterId)) {
      throw new HttpError(400, "Self verification is not allowed.");
    }

    const existingUsers = await this.repository.findUsersByIds(verifierIds);
    const existingUserIds = new Set(existingUsers.map((user) => user.id));

    const invalidVerifierIds = verifierIds.filter((verifierId) => !existingUserIds.has(verifierId));

    if (invalidVerifierIds.length) {
      throw new HttpError(400, `Invalid verifier IDs: ${invalidVerifierIds.join(", ")}.`);
    }

    const alreadyAssignedVerifierIds = await this.repository.findVerifierIdsWithExistingRequest(experienceId, verifierIds);
    const alreadyAssignedSet = new Set(alreadyAssignedVerifierIds);
    const eligibleVerifierIds = verifierIds.filter((verifierId) => !alreadyAssignedSet.has(verifierId));

    if (!eligibleVerifierIds.length) {
      throw new HttpError(409, "All selected peers already have a verification request.");
    }

    await this.repository.createVerificationRequests(experienceId, eligibleVerifierIds);

    const createdVerifications = await this.repository.findVerificationsByExperienceAndVerifierIds(
      experienceId,
      eligibleVerifierIds,
    );

    await Promise.all(createdVerifications.map((verification) => this.verificationQueue.add(
      "verification-requested",
      {
        experienceId,
        requesterId,
        verifierId: verification.verifierId,
      },
      {
        jobId: `${experienceId}:${verification.verifierId}`,
      },
    )));

    return {
      experienceId,
      requestedCount: createdVerifications.length,
      verifications: createdVerifications,
    };
  }

  async respondVerification(data: RespondVerificationBody, verifierId: string): Promise<RespondVerificationResult> {
    const experienceId = data.experienceId.trim();

    const existingVerification = await this.repository.findVerificationByExperienceAndVerifier(experienceId, verifierId);

    if (!existingVerification) {
      throw new HttpError(403, "You are not assigned to verify this experience.");
    }

    if (existingVerification.status !== VerificationStatus.PENDING) {
      throw new HttpError(409, "You have already responded to this verification request.");
    }

    const updatedVerification = await this.repository.updateVerificationStatus(existingVerification.id, data.status);

    const experience = await this.repository.findExperienceById(experienceId);

    if (!experience) {
      throw new HttpError(404, "Experience not found.");
    }

    const [approvalsReceived, rejectionsReceived, hasArtifact] = await Promise.all([
      this.repository.countApprovedVerifications(experienceId),
      this.repository.countRejectedVerifications(experienceId),
      this.repository.hasArtifacts(experienceId),
    ]);

    const resolution = await this.resolveExperienceStatus({
      approvalsReceived,
      rejectionsReceived,
      hasArtifact,
    });

    if (resolution.experienceStatus === ExperienceStatus.PEER_VERIFIED) {
      await this.repository.promoteExperienceToPeerVerified(experienceId);
    }

    if (resolution.experienceStatus === ExperienceStatus.FLAGGED) {
      await this.repository.flagExperience(experienceId);
    }

    const latestExperience = await this.repository.findExperienceById(experienceId);

    if (!latestExperience) {
      throw new HttpError(404, "Experience not found.");
    }

    const trustTriggers: Array<Promise<void>> = [];

    if (
      experience.status !== ExperienceStatus.PEER_VERIFIED
      && latestExperience.status === ExperienceStatus.PEER_VERIFIED
    ) {
      trustTriggers.push(this.enqueueTrustRecalculation(latestExperience.userId, "experience_verified"));
    } else if (updatedVerification.status === VerificationStatus.APPROVED) {
      trustTriggers.push(this.enqueueTrustRecalculation(latestExperience.userId, "verification_added"));
    }

    await Promise.all(trustTriggers);

    return {
      experienceId,
      verificationStatus: updatedVerification.status,
      approvalsRequired: MIN_APPROVALS_REQUIRED,
      approvalsReceived,
      consensusReached: resolution.consensusReached,
      experienceStatus: latestExperience.status,
      resolutionSource: resolution.source,
      trustScore: null,
    };
  }

  async getVerificationSummary(experienceId: string): Promise<VerificationSummaryResult> {
    const normalizedExperienceId = experienceId.trim();

    const experience = await this.repository.findExperienceById(normalizedExperienceId);

    if (!experience) {
      throw new HttpError(404, "Experience not found.");
    }

    const verifications = await this.repository.findVerificationsByExperienceId(normalizedExperienceId);
    const approvalsReceived = verifications.filter(
      (verification) => verification.status === VerificationStatus.APPROVED,
    ).length;

    return {
      experienceId: normalizedExperienceId,
      experienceStatus: experience.status,
      approvalsRequired: MIN_APPROVALS_REQUIRED,
      approvalsReceived,
      verifications,
    };
  }

  private normalizeVerifierIds(verifierIds: string[]): string[] {
    const uniqueVerifierIds = new Set<string>();

    for (const verifierId of verifierIds) {
      const normalized = verifierId.trim();

      if (!normalized) {
        continue;
      }

      uniqueVerifierIds.add(normalized);
    }

    return Array.from(uniqueVerifierIds);
  }

  private async resolveExperienceStatus(input: {
    approvalsReceived: number;
    rejectionsReceived: number;
    hasArtifact: boolean;
  }): Promise<{
    experienceStatus: ExperienceStatus;
    consensusReached: boolean;
    source: VerificationResolutionSource;
  }> {
    try {
      const rustResult = await this.rustEngine.resolveVerification({
        confirmations: input.approvalsReceived,
        min_confirmations: MIN_APPROVALS_REQUIRED,
        artifact: input.hasArtifact,
        rejections: input.rejectionsReceived,
      });

      const mappedStatus = this.mapRustStatusToExperienceStatus(rustResult.status);

      return {
        experienceStatus: mappedStatus,
        consensusReached: rustResult.consensus_reached || mappedStatus === ExperienceStatus.PEER_VERIFIED,
        source: "rust",
      };
    } catch (error) {
      this.logger.error(
        {
          err: error,
          approvalsReceived: input.approvalsReceived,
          rejectionsReceived: input.rejectionsReceived,
        },
        "Rust verification resolution failed. Falling back to local consensus.",
      );

      const consensusReached = input.approvalsReceived >= MIN_APPROVALS_REQUIRED;

      return {
        experienceStatus: consensusReached ? ExperienceStatus.PEER_VERIFIED : ExperienceStatus.SELF_CLAIMED,
        consensusReached,
        source: "fallback",
      };
    }
  }

  private mapRustStatusToExperienceStatus(status: string): ExperienceStatus {
    switch (status) {
      case ExperienceStatus.PEER_VERIFIED:
        return ExperienceStatus.PEER_VERIFIED;
      case ExperienceStatus.SELF_CLAIMED:
        return ExperienceStatus.SELF_CLAIMED;
      case ExperienceStatus.FLAGGED:
        return ExperienceStatus.FLAGGED;
      case ExperienceStatus.FULLY_VERIFIED:
        return ExperienceStatus.FULLY_VERIFIED;
      default:
        throw new Error(`Unsupported verification status from Rust: ${status}.`);
    }
  }

  private async enqueueTrustRecalculation(userId: string, event: TrustScoreEvent): Promise<void> {
    try {
      await this.trustScoreQueue.add("trust-score-recalculate", {
        userId,
        event,
      });
    } catch (error) {
      this.logger.error(
        {
          err: error,
          userId,
          event,
        },
        "Failed to enqueue trust score recalculation.",
      );
    }
  }
}
