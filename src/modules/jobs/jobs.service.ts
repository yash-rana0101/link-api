import { ApplicationStatus, NotificationType, Prisma } from "@prisma/client";
import { FastifyInstance } from "fastify";

import { NotificationQueueJobData } from "../notification/notification.queue";
import { QueueService } from "../../services/queue.service";
import { HttpError } from "../../utils/http-error";
import {
  CreateJobBody,
  ListJobsQuerystring,
  UpdatableApplicationStatus,
} from "./jobs.schema";

const userSummarySelect = {
  id: true,
  name: true,
  email: true,
  profileImageUrl: true,
  publicProfileUrl: true,
  trustScore: true,
} satisfies Prisma.UserSelect;

const jobSelect = {
  id: true,
  title: true,
  description: true,
  location: true,
  createdAt: true,
  postedById: true,
  postedBy: {
    select: userSummarySelect,
  },
  _count: {
    select: {
      applications: true,
    },
  },
} satisfies Prisma.JobSelect;

const applicationSelect = {
  id: true,
  jobId: true,
  userId: true,
  status: true,
  createdAt: true,
  user: {
    select: userSummarySelect,
  },
  job: {
    select: {
      id: true,
      title: true,
      postedById: true,
    },
  },
} satisfies Prisma.ApplicationSelect;

const applicationOwnerSelect = {
  id: true,
  status: true,
  userId: true,
  job: {
    select: {
      id: true,
      title: true,
      postedById: true,
    },
  },
} satisfies Prisma.ApplicationSelect;

type UserSummary = Prisma.UserGetPayload<{
  select: typeof userSummarySelect;
}>;

type JobRow = Prisma.JobGetPayload<{
  select: typeof jobSelect;
}>;

export type ApplicationRecord = Prisma.ApplicationGetPayload<{
  select: typeof applicationSelect;
}>;

type ApplicationOwnerRecord = Prisma.ApplicationGetPayload<{
  select: typeof applicationOwnerSelect;
}>;

interface JobRecord {
  id: string;
  title: string;
  description: string;
  location: string | null;
  createdAt: Date;
  postedById: string;
  postedBy: UserSummary;
  applicationCount: number;
}

export class JobsService {
  private readonly queueService: QueueService;

  constructor(private readonly app: FastifyInstance) {
    this.queueService = new QueueService(app.log);
  }

  async createJob(data: CreateJobBody, userId: string): Promise<JobRecord> {
    const normalizedUserId = this.normalizeRequiredId(userId, "userId");
    const title = this.requireTrimmedText(data.title, "title");
    const description = this.requireTrimmedText(data.description, "description");
    const location = this.normalizeOptionalText(data.location);

    await this.ensureUserExists(normalizedUserId);

    const createdJob = await this.app.prisma.job.create({
      data: {
        title,
        description,
        location,
        postedById: normalizedUserId,
      },
      select: jobSelect,
    });

    return this.mapJob(createdJob);
  }

  async getJobs(query: ListJobsQuerystring): Promise<JobRecord[]> {
    const limit = this.parseLimit(query.limit);

    const jobs = await this.app.prisma.job.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit,
      select: jobSelect,
    });

    return jobs.map((job) => this.mapJob(job));
  }

  async getJobById(jobId: string): Promise<JobRecord> {
    const normalizedJobId = this.normalizeRequiredId(jobId, "id");

    const job = await this.app.prisma.job.findUnique({
      where: {
        id: normalizedJobId,
      },
      select: jobSelect,
    });

    if (!job) {
      throw new HttpError(404, "Job not found.");
    }

    return this.mapJob(job);
  }

  async deleteJob(jobId: string, userId: string): Promise<void> {
    const normalizedJobId = this.normalizeRequiredId(jobId, "id");
    const normalizedUserId = this.normalizeRequiredId(userId, "userId");

    const job = await this.ensureJobExists(normalizedJobId);

    if (job.postedById !== normalizedUserId) {
      throw new HttpError(403, "Only the job owner can delete this job.");
    }

    await this.app.prisma.job.delete({
      where: {
        id: normalizedJobId,
      },
    });
  }

  async applyToJob(jobId: string, userId: string): Promise<ApplicationRecord> {
    const normalizedJobId = this.normalizeRequiredId(jobId, "jobId");
    const normalizedUserId = this.normalizeRequiredId(userId, "userId");

    const job = await this.ensureJobExists(normalizedJobId);

    if (job.postedById === normalizedUserId) {
      throw new HttpError(400, "You cannot apply to your own job posting.");
    }

    await this.ensureUserExists(normalizedUserId);

    let application: ApplicationRecord;

    try {
      application = await this.app.prisma.application.create({
        data: {
          jobId: normalizedJobId,
          userId: normalizedUserId,
          status: ApplicationStatus.APPLIED,
        },
        select: applicationSelect,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new HttpError(409, "You have already applied to this job.");
      }

      throw error;
    }

    await this.enqueueNotification(
      {
        userId: job.postedById,
        type: NotificationType.JOB_APPLIED,
        message: "A new application was submitted for your job posting.",
      },
      "job-applied-notification",
    );

    return application;
  }

  async getJobApplications(jobId: string, userId: string): Promise<ApplicationRecord[]> {
    const normalizedJobId = this.normalizeRequiredId(jobId, "jobId");
    const normalizedUserId = this.normalizeRequiredId(userId, "userId");

    const job = await this.ensureJobExists(normalizedJobId);

    if (job.postedById !== normalizedUserId) {
      throw new HttpError(403, "Only the job owner can view applications.");
    }

    return this.app.prisma.application.findMany({
      where: {
        jobId: normalizedJobId,
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: applicationSelect,
    });
  }

  async updateApplicationStatus(
    applicationId: string,
    status: UpdatableApplicationStatus,
    userId: string,
  ): Promise<ApplicationRecord> {
    const normalizedApplicationId = this.normalizeRequiredId(applicationId, "id");
    const normalizedUserId = this.normalizeRequiredId(userId, "userId");

    const application = await this.ensureApplicationExists(normalizedApplicationId);

    if (application.job.postedById !== normalizedUserId) {
      throw new HttpError(403, "Only the job owner can update application status.");
    }

    this.ensureAllowedStatusTransition(application.status, status);

    const updatedApplication = await this.app.prisma.application.update({
      where: {
        id: normalizedApplicationId,
      },
      data: {
        status,
      },
      select: applicationSelect,
    });

    await this.enqueueNotification(
      {
        userId: application.userId,
        type: NotificationType.APPLICATION_STATUS_UPDATED,
        message: `Your application status was updated to ${status}.`,
      },
      "application-status-notification",
    );

    return updatedApplication;
  }

  private async ensureJobExists(jobId: string): Promise<{ id: string; postedById: string; title: string }> {
    const job = await this.app.prisma.job.findUnique({
      where: {
        id: jobId,
      },
      select: {
        id: true,
        postedById: true,
        title: true,
      },
    });

    if (!job) {
      throw new HttpError(404, "Job not found.");
    }

    return job;
  }

  private async ensureApplicationExists(applicationId: string): Promise<ApplicationOwnerRecord> {
    const application = await this.app.prisma.application.findUnique({
      where: {
        id: applicationId,
      },
      select: applicationOwnerSelect,
    });

    if (!application) {
      throw new HttpError(404, "Application not found.");
    }

    return application;
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
      throw new HttpError(404, "User not found.");
    }
  }

  private mapJob(job: JobRow): JobRecord {
    const { _count, ...base } = job;

    return {
      ...base,
      applicationCount: _count.applications,
    };
  }

  private ensureAllowedStatusTransition(
    currentStatus: ApplicationStatus,
    nextStatus: UpdatableApplicationStatus,
  ): void {
    if (currentStatus === nextStatus) {
      throw new HttpError(409, `Application is already marked as ${nextStatus}.`);
    }

    const allowedTransitions: Record<ApplicationStatus, ApplicationStatus[]> = {
      [ApplicationStatus.APPLIED]: [ApplicationStatus.SHORTLISTED, ApplicationStatus.REJECTED],
      [ApplicationStatus.SHORTLISTED]: [ApplicationStatus.HIRED, ApplicationStatus.REJECTED],
      [ApplicationStatus.REJECTED]: [],
      [ApplicationStatus.HIRED]: [],
    };

    if (!allowedTransitions[currentStatus].includes(nextStatus)) {
      throw new HttpError(409, `Invalid application status transition from ${currentStatus} to ${nextStatus}.`);
    }
  }

  private parseLimit(limit: string | undefined): number {
    if (typeof limit === "undefined") {
      return 50;
    }

    const normalized = limit.trim();

    if (!normalized) {
      throw new HttpError(400, "limit must be between 1 and 100.");
    }

    const parsed = Number.parseInt(normalized, 10);

    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
      throw new HttpError(400, "limit must be between 1 and 100.");
    }

    return parsed;
  }

  private normalizeRequiredId(value: string, fieldName: string): string {
    const normalized = value.trim();

    if (!normalized) {
      throw new HttpError(400, `${fieldName} is required.`);
    }

    return normalized;
  }

  private requireTrimmedText(value: string, fieldName: string): string {
    const normalized = value.trim();

    if (!normalized) {
      throw new HttpError(400, `${fieldName} is required.`);
    }

    return normalized;
  }

  private normalizeOptionalText(value: string | undefined): string | null {
    if (typeof value === "undefined") {
      return null;
    }

    const normalized = value.trim();

    return normalized || null;
  }

  private async enqueueNotification(data: NotificationQueueJobData, jobName: string): Promise<void> {
    try {
      await this.queueService.addJob(this.app.notificationQueue, jobName, data);
    } catch (error) {
      this.app.log.error(
        {
          err: error,
          userId: data.userId,
          type: data.type,
        },
        "Failed to enqueue job hiring notification.",
      );
    }
  }
}
