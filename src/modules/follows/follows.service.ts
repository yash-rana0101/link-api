import { Prisma } from "@prisma/client";
import { FastifyInstance } from "fastify";

import { FeedQueueJobData } from "../post/feed.queue";
import { QueueService } from "../../services/queue.service";
import { HttpError } from "../../utils/http-error";

const followSelect = {
  id: true,
  followerId: true,
  followingId: true,
  createdAt: true,
} satisfies Prisma.FollowSelect;

type FollowRecord = Prisma.FollowGetPayload<{
  select: typeof followSelect;
}>;

export interface FollowStatusRecord {
  targetUserId: string;
  isFollowing: boolean;
  followerCount: number;
  followingCount: number;
}

export class FollowService {
  private readonly queueService: QueueService;

  constructor(private readonly app: FastifyInstance) {
    this.queueService = new QueueService(app.log);
  }

  async followUser(targetUserId: string, followerId: string): Promise<FollowRecord> {
    const normalizedTargetUserId = this.normalizeRequiredId(targetUserId, "userId");
    const normalizedFollowerId = this.normalizeRequiredId(followerId, "followerId");

    if (normalizedTargetUserId === normalizedFollowerId) {
      throw new HttpError(400, "You cannot follow yourself.");
    }

    await this.ensureUserExists(normalizedTargetUserId);

    try {
      const createdFollow = await this.app.prisma.follow.create({
        data: {
          followerId: normalizedFollowerId,
          followingId: normalizedTargetUserId,
        },
        select: followSelect,
      });

      await this.enqueueFeedInvalidation(normalizedFollowerId, "follow_created");

      return createdFollow;
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
        throw error;
      }

      const existingFollow = await this.app.prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: normalizedFollowerId,
            followingId: normalizedTargetUserId,
          },
        },
        select: followSelect,
      });

      if (!existingFollow) {
        throw new HttpError(409, "Follow relationship already exists.");
      }

      return existingFollow;
    }
  }

  async unfollowUser(targetUserId: string, followerId: string): Promise<void> {
    const normalizedTargetUserId = this.normalizeRequiredId(targetUserId, "userId");
    const normalizedFollowerId = this.normalizeRequiredId(followerId, "followerId");

    if (normalizedTargetUserId === normalizedFollowerId) {
      throw new HttpError(400, "You cannot unfollow yourself.");
    }

    await this.ensureUserExists(normalizedTargetUserId);

    await this.app.prisma.follow.deleteMany({
      where: {
        followerId: normalizedFollowerId,
        followingId: normalizedTargetUserId,
      },
    });

    await this.enqueueFeedInvalidation(normalizedFollowerId, "follow_removed");
  }

  async getFollowStatus(targetUserId: string, followerId: string): Promise<FollowStatusRecord> {
    const normalizedTargetUserId = this.normalizeRequiredId(targetUserId, "userId");
    const normalizedFollowerId = this.normalizeRequiredId(followerId, "followerId");

    if (normalizedTargetUserId === normalizedFollowerId) {
      const [followerCount, followingCount] = await Promise.all([
        this.app.prisma.follow.count({
          where: {
            followingId: normalizedTargetUserId,
          },
        }),
        this.app.prisma.follow.count({
          where: {
            followerId: normalizedTargetUserId,
          },
        }),
      ]);

      return {
        targetUserId: normalizedTargetUserId,
        isFollowing: false,
        followerCount,
        followingCount,
      };
    }

    await this.ensureUserExists(normalizedTargetUserId);

    const [follow, followerCount, followingCount] = await Promise.all([
      this.app.prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: normalizedFollowerId,
            followingId: normalizedTargetUserId,
          },
        },
        select: {
          id: true,
        },
      }),
      this.app.prisma.follow.count({
        where: {
          followingId: normalizedTargetUserId,
        },
      }),
      this.app.prisma.follow.count({
        where: {
          followerId: normalizedTargetUserId,
        },
      }),
    ]);

    return {
      targetUserId: normalizedTargetUserId,
      isFollowing: Boolean(follow),
      followerCount,
      followingCount,
    };
  }

  private normalizeRequiredId(value: string, fieldName: string): string {
    const normalized = value.trim();

    if (!normalized) {
      throw new HttpError(400, `${fieldName} is required.`);
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
      throw new HttpError(404, "User not found.");
    }
  }

  private async enqueueFeedInvalidation(userId: string, source: string): Promise<void> {
    const jobData: FeedQueueJobData = {
      action: "invalidate_user_feed",
      userId,
      source,
    };

    try {
      await this.queueService.addJob(this.app.feedQueue, "feed-invalidate-user", jobData);
    } catch (error) {
      this.app.log.warn(
        {
          err: error,
          userId,
          source,
        },
        "Failed to enqueue feed invalidation after follow change.",
      );
    }
  }
}
