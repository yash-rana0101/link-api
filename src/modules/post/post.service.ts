import { Prisma } from "@prisma/client";
import { FastifyInstance } from "fastify";

import { HttpError } from "../../utils/http-error";
import { AddCommentBody, CreatePostBody, FeedQuerystring } from "./post.schema";

const userSummarySelect = {
  id: true,
  name: true,
  email: true,
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
  constructor(private readonly app: FastifyInstance) { }

  async createPost(data: CreatePostBody, userId: string): Promise<PostSummaryRecord> {
    const normalizedUserId = this.normalizeRequiredId(userId, "userId");
    const content = this.requireTrimmedContent(data.content, "Post content");

    const post = await this.app.prisma.post.create({
      data: {
        userId: normalizedUserId,
        content,
      },
      select: postSummarySelect,
    });

    return this.mapPostSummary(post);
  }

  async getFeed(query: FeedQuerystring): Promise<FeedResult> {
    const cursorDate = this.parseCursor(query.cursor);
    const limit = this.parseLimit(query.limit);

    const posts = await this.app.prisma.post.findMany({
      where: cursorDate
        ? {
          createdAt: {
            lt: cursorDate,
          },
        }
        : undefined,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      select: postSummarySelect,
    });

    const hasMore = posts.length > limit;
    const pageItems = hasMore ? posts.slice(0, limit) : posts;
    const mappedItems = pageItems.map((post) => this.mapPostSummary(post));

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
  }

  async likePost(postId: string, userId: string): Promise<LikeResult> {
    const normalizedPostId = this.normalizeRequiredId(postId, "postId");
    const normalizedUserId = this.normalizeRequiredId(userId, "userId");

    await this.ensurePostExists(normalizedPostId);

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

    await this.ensurePostExists(normalizedPostId);

    return this.app.prisma.comment.create({
      data: {
        postId: normalizedPostId,
        userId: normalizedUserId,
        content,
      },
      select: commentSelect,
    });
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
