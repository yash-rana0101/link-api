import { ConnectionStatus } from "@prisma/client";
import { Job } from "bullmq";
import { FastifyInstance } from "fastify";

import { FeedQueueJobData } from "../modules/post/feed.queue";
import { CacheService } from "../services/cache.service";

const FEED_KEY_PREFIX = "feed";
const FEED_MAX_ITEMS = 100;
const FEED_BATCH_SIZE = 250;

const buildFeedKey = (userId: string): string => `${FEED_KEY_PREFIX}:${userId}`;

const normalizeOptionalId = (value: string | undefined): string => value?.trim() ?? "";

const toUniqueNonEmptyIds = (values: string[]): string[] =>
  Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));

const chunkArray = <T>(items: T[], chunkSize: number): T[][] => {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }

  return chunks;
};

const getFeedRecipients = async (app: FastifyInstance, authorId: string): Promise<string[]> => {
  const connections = await app.prisma.connection.findMany({
    where: {
      status: ConnectionStatus.ACCEPTED,
      OR: [
        { requesterId: authorId },
        { receiverId: authorId },
      ],
    },
    select: {
      requesterId: true,
      receiverId: true,
    },
  });

  const recipientIds = new Set<string>([authorId]);

  for (const connection of connections) {
    recipientIds.add(connection.requesterId);
    recipientIds.add(connection.receiverId);
  }

  return Array.from(recipientIds);
};

const fanoutPostToRecipients = async (
  app: FastifyInstance,
  postId: string,
  recipientIds: string[],
): Promise<void> => {
  const recipientChunks = chunkArray(recipientIds, FEED_BATCH_SIZE);

  for (const recipientChunk of recipientChunks) {
    const pipeline = app.redis.pipeline();

    for (const recipientId of recipientChunk) {
      const feedKey = buildFeedKey(recipientId);
      pipeline.lrem(feedKey, 0, postId);
      pipeline.lpush(feedKey, postId);
      pipeline.ltrim(feedKey, 0, FEED_MAX_ITEMS - 1);
    }

    await pipeline.exec();
  }
};

const removePostFromRecipients = async (
  app: FastifyInstance,
  postId: string,
  recipientIds: string[],
): Promise<void> => {
  const recipientChunks = chunkArray(recipientIds, FEED_BATCH_SIZE);

  for (const recipientChunk of recipientChunks) {
    const pipeline = app.redis.pipeline();

    for (const recipientId of recipientChunk) {
      pipeline.lrem(buildFeedKey(recipientId), 0, postId);
    }

    await pipeline.exec();
  }
};

export const processFeedJob = async (
  app: FastifyInstance,
  job: Job<FeedQueueJobData>,
): Promise<void> => {
  const cacheService = new CacheService(app.redis, app.log);

  if (job.data.action === "invalidate_all_feed") {
    await cacheService.delByPattern(`${FEED_KEY_PREFIX}:*`);

    app.log.info(
      {
        jobId: job.id,
        source: job.data.source,
      },
      "Invalidated all feed cache entries.",
    );

    return;
  }

  if (job.data.action === "invalidate_user_feed") {
    const userId = normalizeOptionalId(job.data.userId);

    if (!userId) {
      app.log.warn(
        {
          jobId: job.id,
          source: job.data.source,
        },
        "Skipped feed invalidation job because userId is missing.",
      );

      return;
    }

    await cacheService.delByPattern(`${buildFeedKey(userId)}*`);

    app.log.info(
      {
        jobId: job.id,
        userId,
        source: job.data.source,
      },
      "Invalidated user feed cache entries.",
    );

    return;
  }

  const authorId = normalizeOptionalId(job.data.authorId ?? job.data.userId);
  const postId = normalizeOptionalId(job.data.postId);

  if (job.data.action === "fanout_post_created") {
    if (!authorId || !postId) {
      app.log.warn(
        {
          jobId: job.id,
          authorId,
          postId,
          source: job.data.source,
        },
        "Skipped feed fan-out job because authorId or postId is missing.",
      );

      return;
    }

    const recipientIds = toUniqueNonEmptyIds(await getFeedRecipients(app, authorId));

    if (!recipientIds.length) {
      return;
    }

    await fanoutPostToRecipients(app, postId, recipientIds);

    app.log.info(
      {
        jobId: job.id,
        authorId,
        postId,
        recipients: recipientIds.length,
        source: job.data.source,
      },
      "Precomputed feed entries for a newly created post.",
    );

    return;
  }

  if (job.data.action === "remove_post_from_feeds") {
    if (!postId) {
      app.log.warn(
        {
          jobId: job.id,
          source: job.data.source,
        },
        "Skipped feed cleanup job because postId is missing.",
      );

      return;
    }

    if (!authorId) {
      await cacheService.delByPattern(`${FEED_KEY_PREFIX}:*`);

      app.log.warn(
        {
          jobId: job.id,
          postId,
          source: job.data.source,
        },
        "Removed all feed cache entries because post cleanup job was missing authorId.",
      );

      return;
    }

    const recipientIds = toUniqueNonEmptyIds(await getFeedRecipients(app, authorId));

    if (!recipientIds.length) {
      return;
    }

    await removePostFromRecipients(app, postId, recipientIds);

    app.log.info(
      {
        jobId: job.id,
        authorId,
        postId,
        recipients: recipientIds.length,
        source: job.data.source,
      },
      "Removed a deleted post from precomputed feeds.",
    );

    return;
  }

  app.log.warn(
    {
      jobId: job.id,
      action: job.data.action,
      source: job.data.source,
    },
    "Skipped feed job because action is unsupported.",
  );
};
