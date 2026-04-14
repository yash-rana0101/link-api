import { ExperienceStatus, Prisma, VerificationStatus } from "@prisma/client";
import { FastifyInstance } from "fastify";

const experienceSummarySelect = {
  id: true,
  userId: true,
  status: true,
} satisfies Prisma.ExperienceSelect;

const verifierSummarySelect = {
  id: true,
  name: true,
  profileImageUrl: true,
  publicProfileUrl: true,
} satisfies Prisma.UserSelect;

const verificationSelect = {
  id: true,
  experienceId: true,
  verifierId: true,
  status: true,
  createdAt: true,
  verifier: {
    select: verifierSummarySelect,
  },
} satisfies Prisma.VerificationSelect;

export type ExperienceVerificationSummary = Prisma.ExperienceGetPayload<{
  select: typeof experienceSummarySelect;
}>;

export type VerificationRecord = Prisma.VerificationGetPayload<{
  select: typeof verificationSelect;
}>;

export class VerificationRepository {
  constructor(private readonly app: FastifyInstance) { }

  findExperienceById(id: string): Promise<ExperienceVerificationSummary | null> {
    return this.app.prisma.experience.findUnique({
      where: { id },
      select: experienceSummarySelect,
    });
  }

  findUsersByIds(ids: string[]): Promise<Array<{ id: string }>> {
    return this.app.prisma.user.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      select: {
        id: true,
      },
    });
  }

  async findVerifierIdsWithExistingRequest(experienceId: string, verifierIds: string[]): Promise<string[]> {
    const rows = await this.app.prisma.verification.findMany({
      where: {
        experienceId,
        verifierId: {
          in: verifierIds,
        },
      },
      select: {
        verifierId: true,
      },
    });

    return rows.map((row) => row.verifierId);
  }

  async createVerificationRequests(experienceId: string, verifierIds: string[]): Promise<void> {
    await this.app.prisma.verification.createMany({
      data: verifierIds.map((verifierId) => ({
        experienceId,
        verifierId,
        status: VerificationStatus.PENDING,
      })),
      skipDuplicates: true,
    });
  }

  findVerificationsByExperienceAndVerifierIds(
    experienceId: string,
    verifierIds: string[],
  ): Promise<VerificationRecord[]> {
    return this.app.prisma.verification.findMany({
      where: {
        experienceId,
        verifierId: {
          in: verifierIds,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      select: verificationSelect,
    });
  }

  findVerificationByExperienceAndVerifier(
    experienceId: string,
    verifierId: string,
  ): Promise<VerificationRecord | null> {
    return this.app.prisma.verification.findUnique({
      where: {
        experienceId_verifierId: {
          experienceId,
          verifierId,
        },
      },
      select: verificationSelect,
    });
  }

  updateVerificationStatus(id: string, status: VerificationStatus): Promise<VerificationRecord> {
    return this.app.prisma.verification.update({
      where: { id },
      data: { status },
      select: verificationSelect,
    });
  }

  countApprovedVerifications(experienceId: string): Promise<number> {
    return this.app.prisma.verification.count({
      where: {
        experienceId,
        status: VerificationStatus.APPROVED,
      },
    });
  }

  countRejectedVerifications(experienceId: string): Promise<number> {
    return this.app.prisma.verification.count({
      where: {
        experienceId,
        status: VerificationStatus.REJECTED,
      },
    });
  }

  async hasArtifacts(experienceId: string): Promise<boolean> {
    const count = await this.app.prisma.artifact.count({
      where: {
        experienceId,
      },
    });

    return count > 0;
  }

  async promoteExperienceToPeerVerified(experienceId: string): Promise<void> {
    await this.app.prisma.experience.updateMany({
      where: {
        id: experienceId,
        status: ExperienceStatus.SELF_CLAIMED,
      },
      data: {
        status: ExperienceStatus.PEER_VERIFIED,
      },
    });
  }

  async flagExperience(experienceId: string): Promise<void> {
    await this.app.prisma.experience.updateMany({
      where: {
        id: experienceId,
      },
      data: {
        status: ExperienceStatus.FLAGGED,
      },
    });
  }

  countVerifiedExperiencesForUser(userId: string): Promise<number> {
    return this.app.prisma.experience.count({
      where: {
        userId,
        status: {
          in: [ExperienceStatus.PEER_VERIFIED, ExperienceStatus.FULLY_VERIFIED],
        },
      },
    });
  }

  countPeerConfirmationsForUser(userId: string): Promise<number> {
    return this.app.prisma.verification.count({
      where: {
        status: VerificationStatus.APPROVED,
        experience: {
          userId,
        },
      },
    });
  }

  async updateUserTrustScore(userId: string, trustScore: number): Promise<void> {
    await this.app.prisma.user.updateMany({
      where: {
        id: userId,
      },
      data: {
        trustScore,
      },
    });
  }

  findVerificationsByExperienceId(experienceId: string): Promise<VerificationRecord[]> {
    return this.app.prisma.verification.findMany({
      where: { experienceId },
      orderBy: [{ createdAt: "asc" }],
      select: verificationSelect,
    });
  }
}
