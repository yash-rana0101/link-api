import { FastifyBaseLogger } from "fastify";

import { HttpError } from "../../utils/http-error";
import { RustEngineClient } from "../../utils/rust-engine-client";
import { TrustScoreEvent } from "./trust.queue";
import { TrustRepository } from "./trust.repository";

const DEFAULT_REPORT_COUNT = 0;

export type TrustLevel = "Low" | "Medium" | "High" | "Very High";

export interface RecalculateTrustScoreInput {
  userId: string;
  event?: TrustScoreEvent;
  connections?: number;
  reports?: number;
}

export interface RecalculateTrustScoreResult {
  userId: string;
  event: TrustScoreEvent | "manual_recalculation";
  trustScore: number;
  trustLevel: TrustLevel;
  factors: {
    verifiedExperiences: number;
    peerConfirmations: number;
    connections: number;
    reports: number;
  };
}

export class TrustService {
  constructor(
    private readonly repository: TrustRepository,
    private readonly rustEngine: RustEngineClient,
    private readonly logger: FastifyBaseLogger,
  ) { }

  async recalculateTrustScore(input: RecalculateTrustScoreInput): Promise<RecalculateTrustScoreResult> {
    const userId = input.userId.trim();

    if (!userId) {
      throw new HttpError(400, "userId is required.");
    }

    const user = await this.repository.findUserById(userId);

    if (!user) {
      throw new HttpError(404, "User not found.");
    }

    const connectionsPromise = typeof input.connections === "undefined"
      ? this.repository.countAcceptedConnectionsForUser(userId)
      : Promise.resolve(this.normalizeNonNegativeInt(input.connections, "connections"));

    const [verifiedExperiences, peerConfirmations, connections] = await Promise.all([
      this.repository.countVerifiedExperiencesForUser(userId),
      this.repository.countPeerConfirmationsForUser(userId),
      connectionsPromise,
    ]);

    const reports = this.normalizeNonNegativeInt(input.reports ?? DEFAULT_REPORT_COUNT, "reports");

    try {
      const rustResult = await this.rustEngine.calculateTrustScore({
        verified_experiences: verifiedExperiences,
        peer_confirmations: peerConfirmations,
        connections,
        reports,
      });

      const normalizedTrustScore = this.normalizeTrustScore(rustResult.trust_score);

      await this.repository.updateUserTrustScore(userId, normalizedTrustScore);

      return {
        userId,
        event: input.event ?? "manual_recalculation",
        trustScore: normalizedTrustScore,
        trustLevel: this.resolveTrustLevel(normalizedTrustScore),
        factors: {
          verifiedExperiences,
          peerConfirmations,
          connections,
          reports,
        },
      };
    } catch (error) {
      this.logger.error(
        {
          err: error,
          userId,
          verifiedExperiences,
          peerConfirmations,
          connections,
          reports,
        },
        "Rust trust calculation failed.",
      );

      throw error;
    }
  }

  private resolveTrustLevel(score: number): TrustLevel {
    if (score <= 20) {
      return "Low";
    }

    if (score <= 50) {
      return "Medium";
    }

    if (score <= 80) {
      return "High";
    }

    return "Very High";
  }

  private normalizeTrustScore(trustScore: number): number {
    if (!Number.isFinite(trustScore)) {
      throw new Error("Rust returned a non-numeric trust score.");
    }

    return Math.max(0, Math.min(100, Math.round(trustScore)));
  }

  private normalizeNonNegativeInt(value: number, fieldName: string): number {
    if (!Number.isFinite(value)) {
      throw new HttpError(400, `${fieldName} must be a number.`);
    }

    const normalized = Math.floor(value);

    if (normalized < 0) {
      throw new HttpError(400, `${fieldName} cannot be negative.`);
    }

    return normalized;
  }
}