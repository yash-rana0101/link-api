import { ConnectionStatus, Prisma } from "@prisma/client";
import { FastifyInstance } from "fastify";

import { HttpError } from "../../utils/http-error";
import { ConversationMessagesQuerystring, SendMessageBody } from "./messaging.schema";

const userSummarySelect = {
  id: true,
  name: true,
  email: true,
  trustScore: true,
} satisfies Prisma.UserSelect;

const messageSelect = {
  id: true,
  senderId: true,
  conversationId: true,
  content: true,
  createdAt: true,
  sender: {
    select: userSummarySelect,
  },
} satisfies Prisma.MessageSelect;

const conversationSummarySelect = {
  id: true,
  createdAt: true,
  participants: {
    select: {
      userId: true,
      user: {
        select: userSummarySelect,
      },
    },
  },
  messages: {
    take: 1,
    orderBy: {
      createdAt: "desc",
    },
    select: messageSelect,
  },
  _count: {
    select: {
      messages: true,
    },
  },
} satisfies Prisma.ConversationSelect;

type UserSummary = Prisma.UserGetPayload<{
  select: typeof userSummarySelect;
}>;

type MessageRecord = Prisma.MessageGetPayload<{
  select: typeof messageSelect;
}>;

type ConversationSummaryRow = Prisma.ConversationGetPayload<{
  select: typeof conversationSummarySelect;
}>;

interface ConversationSummaryRecord {
  id: string;
  createdAt: Date;
  otherParticipant: UserSummary | null;
  lastMessage: MessageRecord | null;
  messageCount: number;
}

interface ConversationMessagesResult {
  items: MessageRecord[];
  pageInfo: {
    nextCursor: string | null;
    hasMore: boolean;
    limit: number;
  };
}

export class MessagingService {
  constructor(private readonly app: FastifyInstance) { }

  async sendMessage(data: SendMessageBody, senderId: string): Promise<MessageRecord> {
    const normalizedSenderId = this.normalizeRequiredId(senderId, "senderId");
    const normalizedReceiverId = this.normalizeRequiredId(data.receiverId, "receiverId");
    const content = this.requireTrimmedContent(data.content, "Message content");

    if (normalizedSenderId === normalizedReceiverId) {
      throw new HttpError(400, "You cannot send a message to yourself.");
    }

    await this.ensureUsersCanMessage(normalizedSenderId, normalizedReceiverId);

    const conversationId = await this.getOrCreateConversationId(
      normalizedSenderId,
      normalizedReceiverId,
    );

    return this.app.prisma.message.create({
      data: {
        senderId: normalizedSenderId,
        conversationId,
        content,
      },
      select: messageSelect,
    });
  }

  async getConversations(userId: string): Promise<ConversationSummaryRecord[]> {
    const normalizedUserId = this.normalizeRequiredId(userId, "userId");

    const rows = await this.app.prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            userId: normalizedUserId,
          },
        },
      },
      select: conversationSummarySelect,
    });

    const mapped = rows.map((row) => this.mapConversationSummary(row, normalizedUserId));

    return mapped.sort((left, right) => {
      const leftTime = left.lastMessage?.createdAt.getTime() ?? left.createdAt.getTime();
      const rightTime = right.lastMessage?.createdAt.getTime() ?? right.createdAt.getTime();

      return rightTime - leftTime;
    });
  }

  async getConversationMessages(
    conversationId: string,
    query: ConversationMessagesQuerystring,
    userId: string,
  ): Promise<ConversationMessagesResult> {
    const normalizedConversationId = this.normalizeRequiredId(conversationId, "conversationId");
    const normalizedUserId = this.normalizeRequiredId(userId, "userId");
    const cursorDate = this.parseCursor(query.cursor);
    const limit = this.parseLimit(query.limit);

    await this.ensureConversationParticipant(normalizedConversationId, normalizedUserId);

    const messages = await this.app.prisma.message.findMany({
      where: {
        conversationId: normalizedConversationId,
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
      select: messageSelect,
    });

    const hasMore = messages.length > limit;
    const pageItems = hasMore ? messages.slice(0, limit) : messages;

    return {
      items: [...pageItems].reverse(),
      pageInfo: {
        hasMore,
        limit,
        nextCursor: hasMore && pageItems.length > 0
          ? pageItems[pageItems.length - 1].createdAt.toISOString()
          : null,
      },
    };
  }

  private async ensureUsersCanMessage(senderId: string, receiverId: string): Promise<void> {
    const receiverExists = await this.app.prisma.user.findUnique({
      where: {
        id: receiverId,
      },
      select: {
        id: true,
      },
    });

    if (!receiverExists) {
      throw new HttpError(404, "Receiver user not found.");
    }

    const connection = await this.app.prisma.connection.findFirst({
      where: {
        status: ConnectionStatus.ACCEPTED,
        OR: [
          {
            requesterId: senderId,
            receiverId,
          },
          {
            requesterId: receiverId,
            receiverId: senderId,
          },
        ],
      },
      select: {
        id: true,
      },
    });

    if (!connection) {
      throw new HttpError(403, "You can only message users you are connected with.");
    }
  }

  private async getOrCreateConversationId(senderId: string, receiverId: string): Promise<string> {
    const existingConversation = await this.app.prisma.conversation.findFirst({
      where: {
        AND: [
          {
            participants: {
              some: {
                userId: senderId,
              },
            },
          },
          {
            participants: {
              some: {
                userId: receiverId,
              },
            },
          },
          {
            participants: {
              every: {
                userId: {
                  in: [senderId, receiverId],
                },
              },
            },
          },
        ],
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
      },
    });

    if (existingConversation) {
      return existingConversation.id;
    }

    const createdConversation = await this.app.prisma.conversation.create({
      data: {
        participants: {
          create: [{ userId: senderId }, { userId: receiverId }],
        },
      },
      select: {
        id: true,
      },
    });

    return createdConversation.id;
  }

  private async ensureConversationParticipant(conversationId: string, userId: string): Promise<void> {
    const participant = await this.app.prisma.participant.findFirst({
      where: {
        conversationId,
        userId,
      },
      select: {
        id: true,
      },
    });

    if (!participant) {
      throw new HttpError(403, "You are not allowed to access this conversation.");
    }
  }

  private mapConversationSummary(
    row: ConversationSummaryRow,
    currentUserId: string,
  ): ConversationSummaryRecord {
    const otherParticipant = row.participants.find((participant) => participant.userId !== currentUserId)?.user ?? null;

    return {
      id: row.id,
      createdAt: row.createdAt,
      otherParticipant,
      lastMessage: row.messages[0] ?? null,
      messageCount: row._count.messages,
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
      return 30;
    }

    const parsed = Number(limit);

    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
      throw new HttpError(400, "limit must be an integer between 1 and 100.");
    }

    return parsed;
  }
}
