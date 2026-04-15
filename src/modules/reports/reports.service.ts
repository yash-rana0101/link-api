import { Prisma, ProfileReportReason, ProfileReportStatus } from "@prisma/client";
import { FastifyInstance } from "fastify";

import { HttpError } from "../../utils/http-error";
import { CreateProfileReportBody } from "./reports.schema";

const profileReportSelect = {
  id: true,
  reporterId: true,
  reportedUserId: true,
  reason: true,
  details: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ProfileReportSelect;

type ProfileReportRecord = Prisma.ProfileReportGetPayload<{
  select: typeof profileReportSelect;
}>;

export class ReportService {
  constructor(private readonly app: FastifyInstance) { }

  async createProfileReport(data: CreateProfileReportBody, reporterId: string): Promise<ProfileReportRecord> {
    const normalizedReporterId = this.normalizeRequiredId(reporterId, "reporterId");
    const normalizedReportedUserId = this.normalizeRequiredId(data.reportedUserId, "reportedUserId");

    if (normalizedReporterId === normalizedReportedUserId) {
      throw new HttpError(400, "You cannot report your own profile.");
    }

    await this.ensureUserExists(normalizedReportedUserId);

    const normalizedDetails = this.normalizeOptionalDetails(data.details);

    try {
      const report = await this.app.prisma.profileReport.create({
        data: {
          reporterId: normalizedReporterId,
          reportedUserId: normalizedReportedUserId,
          reason: data.reason as ProfileReportReason,
          details: normalizedDetails,
          status: ProfileReportStatus.OPEN,
        },
        select: profileReportSelect,
      });

      return report;
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
        throw error;
      }

      throw new HttpError(409, "You have already reported this profile.");
    }
  }

  private normalizeRequiredId(value: string, fieldName: string): string {
    const normalized = value.trim();

    if (!normalized) {
      throw new HttpError(400, `${fieldName} is required.`);
    }

    return normalized;
  }

  private normalizeOptionalDetails(value: string | undefined): string | null {
    if (typeof value === "undefined") {
      return null;
    }

    const normalized = value.trim();

    if (!normalized) {
      return null;
    }

    return normalized;
  }

  private async ensureUserExists(userId: string): Promise<void> {
    const user = await this.app.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      throw new HttpError(404, "Reported user not found.");
    }
  }
}
