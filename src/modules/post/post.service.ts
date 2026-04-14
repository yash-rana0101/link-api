import { ConnectionStatus, NotificationType, Prisma } from "@prisma/client";
import { FastifyInstance } from "fastify";

import { NotificationQueueJobData } from "../notification/notification.queue";
import { CacheService } from "../../services/cache.service";
import { QueueService } from "../../services/queue.service";
import { HttpError } from "../../utils/http-error";
import { AddCommentBody, CreatePostBody, FeedQuerystring } from "./post.schema";
import { FeedQueueJobData } from "./feed.queue";

const FEED_CACHE_PREFIX = "feed";
const FEED_CACHE_MAX_ITEMS = 100;

const userSummarySelect = {
  id: true,
  name: true,
  email: true,
  profileImageUrl: true,
  publicProfileUrl: true,
  trustScore: true,
} satisfies Prisma.UserSelect;

const commentSelect = {
  id: true,
  userId: true,
  postId: true,
  content: true,
  createdAt: true,
  user: {
    select: userSummarySelect,
  },
} satisfies Prisma.CommentSelect;

const postSummarySelect = {
  id: true,
  userId: true,
  content: true,
  imageUrl: true,
  createdAt: true,
  user: {
    select: userSummarySelect,
  },
  _count: {
    select: {
      likes: true,
      comments: true,
    },
  },
} satisfies Prisma.PostSelect;

const postDetailsSelect = {
  ...postSummarySelect,
  comments: {
    orderBy: {
      createdAt: "asc",
    },
    select: commentSelect,
  },
} satisfies Prisma.PostSelect;

type UserSummary = Prisma.UserGetPayload<{
  select: typeof userSummarySelect;
}>;

type CommentRecord = Prisma.CommentGetPayload<{
  select: typeof commentSelect;
}>;

type PostSummaryRow = Prisma.PostGetPayload<{
  select: typeof postSummarySelect;
}>;

type PostDetailsRow = Prisma.PostGetPayload<{
  select: typeof postDetailsSelect;
}>;

interface PostSummaryRecord {
  id: string;
  userId: string;
  content: string;
  imageUrl: string | null;
  createdAt: Date;
  user: UserSummary;
  likeCount: number;
  commentCount: number;
}

interface PostDetailsRecord extends PostSummaryRecord {
  comments: CommentRecord[];
}

interface FeedResult {
  items: PostSummaryRecord[];
  pageInfo: {
    nextCursor: string | null;
    hasMore: boolean;
    limit: number;
  };
}

interface LikeResult {
  postId: string;
  liked: boolean;
  likeCount: number;
}

export class PostService {
  private readonly cacheService: CacheService;
  private readonly queueService: QueueService;

  constructor(private readonly app: FastifyInstance) {
    this.cacheService = new CacheService(app.redis, app.log);
    this.queueService = new QueueService(app.log);
  }

  async createPost(data: CreatePostBody, userId: string): Promise<PostSummaryRecord> {
    const normalizedUserId = this.normalizeRequiredId(userId, "userId");
    const content = this.requireTrimmedContent(data.content, "Post content");
    const imageUrl = this.normalizeOptionalImageUrl(data.imageUrl);

    const post = await this.app.prisma.post.create({
      data: {
        userId: normalizedUserId,
        content,
        imageUrl,
      },
      select: postSummarySelect,
    });

    await this.enqueueFeedPostCreated(post.id, normalizedUserId, post.createdAt, "post_created");

    return this.mapPostSummary(post);
  }

  async getFeed(query: FeedQuerystring, userId: string): Promise<FeedResult> {
    const normalizedUserId = this.normalizeRequiredId(userId, "userId");
    const cursorDate = this.parseCursor(query.cursor);
    const limit = this.parseLimit(query.limit);
    const cachedPostIds = await this.getCachedFeedPostIds(normalizedUserId);

    if (cachedPostIds.length > 0) {
      const cachedPosts = await this.getOrderedPostsByIds(cachedPostIds);
      const feedFromCache = this.paginateFeedItems(cachedPosts, cursorDate, limit);

      if (feedFromCache.items.length > 0) {
        return feedFromCache;
      }
    }

    const fallbackFeed = await this.getFeedFromDatabase(normalizedUserId, cursorDate, limit);

    if (!cursorDate && fallbackFeed.items.length > 0) {
      await this.storeFeedPostIds(
        normalizedUserId,
        fallbackFeed.items.map((item) => item.id),
      );
    }

    return fallbackFeed;
  }

  async getPostById(postId: string): Promise<PostDetailsRecord> {
    const normalizedPostId = this.normalizeRequiredId(postId, "id");

    const post = await this.app.prisma.post.findUnique({
      where: {
        id: normalizedPostId,
      },
      select: postDetailsSelect,
    });

    if (!post) {
      throw new HttpError(404, "Post not found.");
    }

    return this.mapPostDetails(post);
  }

  async deletePost(postId: string, userId: string): Promise<void> {
    const normalizedPostId = this.normalizeRequiredId(postId, "id");
    const normalizedUserId = this.normalizeRequiredId(userId, "userId");

    const post = await this.ensurePostExists(normalizedPostId);

    if (post.userId !== normalizedUserId) {
      throw new HttpError(403, "You are not allowed to delete this post.");
    }

    await this.app.prisma.post.delete({
      where: {
        id: normalizedPostId,
      },
    });

    await this.enqueueFeedPostDeleted(normalizedPostId, post.userId, "post_deleted");
  }

  async likePost(postId: string, userId: string): Promise<LikeResult> {
    const normalizedPostId = this.normalizeRequiredId(postId, "postId");
    const normalizedUserId = this.normalizeRequiredId(userId, "userId");

    const post = await this.ensurePostExists(normalizedPostId);

    const existingLike = await this.app.prisma.like.findUnique({
      where: {
        userId_postId: {
          userId: normalizedUserId,
          postId: normalizedPostId,
        },
      },
      select: {
        id: true,
      },
    });

    let liked = false;

    if (existingLike) {
      await this.app.prisma.like.delete({
        where: {
          id: existingLike.id,
        },
      });
    } else {
      try {
        await this.app.prisma.like.create({
          data: {
            userId: normalizedUserId,
            postId: normalizedPostId,
          },
        });
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) {
          throw error;
        }
      }

      liked = true;
    }

    const likeCount = await this.app.prisma.like.count({
      where: {
        postId: normalizedPostId,
      },
    });

    if (liked && post.userId !== normalizedUserId) {
      await this.enqueueNotification({
        userId: post.userId,
        type: NotificationType.POST_LIKED,
        message: "Your post received a new like.",
      });
    }

    return {
      postId: normalizedPostId,
      liked,
      likeCount,
    };
  }

  async addComment(postId: string, data: AddCommentBody, userId: string): Promise<CommentRecord> {
    const normalizedPostId = this.normalizeRequiredId(postId, "postId");
    const normalizedUserId = this.normalizeRequiredId(userId, "userId");
    const content = this.requireTrimmedContent(data.content, "Comment content");

    const post = await this.ensurePostExists(normalizedPostId);

    const comment = await this.app.prisma.comment.create({
      data: {
        postId: normalizedPostId,
        userId: normalizedUserId,
        content,
      },
      select: commentSelect,
    });

    if (post.userId !== normalizedUserId) {
      await this.enqueueNotification({
        userId: post.userId,
        type: NotificationType.POST_COMMENTED,
        message: "Your post received a new comment.",
      });
    }

    return comment;
  }

  private buildFeedListKey(userId: string): string {
    return `${FEED_CACHE_PREFIX}:${userId}`;
  }

  private async getCachedFeedPostIds(userId: string): Promise<string[]> {
    try {
      const cachedPostIds = await this.app.redis.lrange(this.buildFeedListKey(userId), 0, FEED_CACHE_MAX_ITEMS - 1);

      return Array.from(new Set(cachedPostIds.map((postId) => postId.trim()).filter(Boolean)));
    } catch (error) {
      this.app.log.warn({ err: error, userId }, "Failed to read precomputed feed from cache.");
      return [];
    }
  }

  private async storeFeedPostIds(userId: string, postIds: string[]): Promise<void> {
    const normalizedPostIds = Array.from(new Set(postIds.map((postId) => postId.trim()).filter(Boolean))).slice(
      0,
      FEED_CACHE_MAX_ITEMS,
    );

    if (!normalizedPostIds.length) {
      return;
    }

    const feedKey = this.buildFeedListKey(userId);

    try {
      const pipeline = this.app.redis.pipeline();
      pipeline.del(feedKey);
      pipeline.rpush(feedKey, ...normalizedPostIds);
      pipeline.ltrim(feedKey, 0, FEED_CACHE_MAX_ITEMS - 1);
      await pipeline.exec();
    } catch (error) {
      this.app.log.warn({ err: error, userId }, "Failed to warm precomputed feed cache.");
    }
  }

  private async getOrderedPostsByIds(postIds: string[]): Promise<PostSummaryRecord[]> {
    if (!postIds.length) {
      return [];
    }

    const rows = await this.app.prisma.post.findMany({
      where: {
        id: {
          in: postIds,
        },
      },
      select: postSummarySelect,
    });

    const mappedById = new Map(rows.map((row) => [row.id, this.mapPostSummary(row)]));
    const orderedPosts: PostSummaryRecord[] = [];

    for (const postId of postIds) {
      const mappedPost = mappedById.get(postId);

      if (mappedPost) {
        orderedPosts.push(mappedPost);
      }
    }

    return orderedPosts;
  }

  private async getFeedFromDatabase(userId: string, cursorDate: Date | undefined, limit: number): Promise<FeedResult> {
    const feedAuthorIds = await this.getFeedAuthorIds(userId);

    const rows = await this.app.prisma.post.findMany({
      where: {
        userId: {
          in: feedAuthorIds,
        },
        ...(cursorDate
          ? {
            createdAt: {
              lt: cursorDate,
            },
          }
          : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      select: postSummarySelect,
    });

    const hasMore = rows.length > limit;
    const pageItems = hasMore ? rows.slice(0, limit) : rows;
    const mappedItems = pageItems.map((row) => this.mapPostSummary(row));

    return {
      items: mappedItems,
      pageInfo: {
        hasMore,
        limit,
        nextCursor: hasMore && mappedItems.length > 0
          ? mappedItems[mappedItems.length - 1].createdAt.toISOString()
          : null,
      },
    };
  }

  private paginateFeedItems(items: PostSummaryRecord[], cursorDate: Date | undefined, limit: number): FeedResult {
    const filteredItems = cursorDate
      ? items.filter((item) => item.createdAt < cursorDate)
      : items;
    const hasMore = filteredItems.length > limit;
    const pageItems = hasMore ? filteredItems.slice(0, limit) : filteredItems.slice(0, limit);

    return {
      items: pageItems,
      pageInfo: {
        hasMore,
        limit,
        nextCursor: hasMore && pageItems.length > 0
          ? pageItems[pageItems.length - 1].createdAt.toISOString()
          : null,
      },
    };
  }

  private async getFeedAuthorIds(userId: string): Promise<string[]> {
    const connections = await this.app.prisma.connection.findMany({
      where: {
        status: ConnectionStatus.ACCEPTED,
        OR: [
          { requesterId: userId },
          { receiverId: userId },
        ],
      },
      select: {
        requesterId: true,
        receiverId: true,
      },
    });

    const authorIds = new Set<string>([userId]);

    for (const connection of connections) {
      authorIds.add(connection.requesterId);
      authorIds.add(connection.receiverId);
    }

    return Array.from(authorIds);
  }

  private async enqueueFeedPostCreated(
    postId: string,
    authorId: string,
    createdAt: Date,
    source: string,
  ): Promise<void> {
    const jobData: FeedQueueJobData = {
      action: "fanout_post_created",
      authorId,
      postId,
      createdAt: createdAt.toISOString(),
      source,
    };

    try {
      await this.queueService.addJob(this.app.feedQueue, "feed-post-created", jobData);
    } catch {
      await this.pushPostToOwnFeed(authorId, postId);
    }
  }

  private async enqueueFeedPostDeleted(postId: string, authorId: string, source: string): Promise<void> {
    const jobData: FeedQueueJobData = {
      action: "remove_post_from_feeds",
      authorId,
      postId,
      source,
    };

    try {
      await this.queueService.addJob(this.app.feedQueue, "feed-post-deleted", jobData);
    } catch {
      await this.cacheService.delByPattern(`${FEED_CACHE_PREFIX}:*`);
    }
  }

  private async pushPostToOwnFeed(userId: string, postId: string): Promise<void> {
    const feedKey = this.buildFeedListKey(userId);

    try {
      const pipeline = this.app.redis.pipeline();
      pipeline.lrem(feedKey, 0, postId);
      pipeline.lpush(feedKey, postId);
      pipeline.ltrim(feedKey, 0, FEED_CACHE_MAX_ITEMS - 1);
      await pipeline.exec();
    } catch (error) {
      this.app.log.warn({ err: error, userId, postId }, "Failed to push post into self feed cache fallback.");
    }
  }

  private async enqueueNotification(data: NotificationQueueJobData): Promise<void> {
    try {
      await this.queueService.addJob(this.app.notificationQueue, "send-notification", data);
    } catch {
      this.app.log.error(
        {
          userId: data.userId,
          type: data.type,
        },
        "Failed to enqueue notification job.",
      );
    }
  }

  private async ensurePostExists(postId: string): Promise<{ id: string; userId: string }> {
    const post = await this.app.prisma.post.findUnique({
      where: {
        id: postId,
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!post) {
      throw new HttpError(404, "Post not found.");
    }

    return post;
  }

  private mapPostSummary(post: PostSummaryRow): PostSummaryRecord {
    const { _count, ...base } = post;

    return {
      ...base,
      likeCount: _count.likes,
      commentCount: _count.comments,
    };
  }

  private mapPostDetails(post: PostDetailsRow): PostDetailsRecord {
    const { _count, comments, ...base } = post;

    return {
      ...base,
      comments,
      likeCount: _count.likes,
      commentCount: _count.comments,
    };
  }

  private normalizeRequiredId(value: string, fieldName: string): string {
    const normalized = value.trim();

    if (!normalized) {
      throw new HttpError(400, `${fieldName} is required.`);
    }

    return normalized;
  }

  private requireTrimmedContent(value: string, fieldName: string): string {
    const normalized = value.trim();

    if (!normalized) {
      throw new HttpError(400, `${fieldName} is required.`);
    }

    return normalized;
  }

  private normalizeOptionalImageUrl(value: string | undefined): string | null {
    if (typeof value === "undefined") {
      return null;
    }

    const normalized = value.trim();

    if (!normalized) {
      return null;
    }

    return normalized;
  }

  private parseCursor(cursor: string | undefined): Date | undefined {
    if (typeof cursor === "undefined") {
      return undefined;
    }

    const normalized = cursor.trim();

    if (!normalized) {
      throw new HttpError(400, "cursor must be a valid ISO date-time string.");
    }

    const parsed = new Date(normalized);

    if (Number.isNaN(parsed.getTime())) {
      throw new HttpError(400, "cursor must be a valid ISO date-time string.");
    }

    return parsed;
  }

  private parseLimit(limit: string | undefined): number {
    if (typeof limit === "undefined") {
      return 10;
    }

    const normalized = limit.trim();

    if (!normalized) {
      throw new HttpError(400, "limit must be between 1 and 50.");
    }

    const parsed = Number.parseInt(normalized, 10);

    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 50) {
      throw new HttpError(400, "limit must be between 1 and 50.");
    }

    return parsed;
  }
}
