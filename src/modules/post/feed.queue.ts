export const FEED_QUEUE_NAME = "feed_queue";

export const feedQueueActions = [
  "invalidate_user_feed",
  "invalidate_all_feed",
] as const;

export type FeedQueueAction = (typeof feedQueueActions)[number];

export interface FeedQueueJobData {
  action: FeedQueueAction;
  userId?: string;
  source: string;
}
