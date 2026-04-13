import { ExperienceStatus, Prisma, VerificationStatus } from "@prisma/client";
import { FastifyInstance } from "fastify";

const userTrustSelect = {
  id: true,
  trustScore: true,
} satisfies Prisma.UserSelect;

export type UserTrustRecord = Prisma.UserGetPayload<{
  select: typeof userTrustSelect;
}>;

export class TrustRepository {
  constructor(private readonly app: FastifyInstance) { }

  findUserById(userId: string): Promise<UserTrustRecord | null> {
    return this.app.prisma.user.findUnique({
      where: { id: userId },
      select: userTrustSelect,
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
}