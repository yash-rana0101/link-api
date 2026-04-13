export const FEED_QUEUE_NAME = "feed_queue";

export const feedQueueActions = [
  "fanout_post_created",
  "remove_post_from_feeds",
  "invalidate_user_feed",
  "invalidate_all_feed",
] as const;

export type FeedQueueAction = (typeof feedQueueActions)[number];

export interface FeedQueueJobData {
  action: FeedQueueAction;
  authorId?: string;
  postId?: string;
  createdAt?: string;
  userId?: string;
  source: string;
}
