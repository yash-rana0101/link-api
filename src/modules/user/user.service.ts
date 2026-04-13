import { Prisma } from "@prisma/client";
import { FastifyInstance } from "fastify";

import { HttpError } from "../../utils/http-error";
import { UpdateProfileBody } from "./user.schema";

const userProfileSelect = {
  id: true,
  email: true,
  name: true,
  trustScore: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

type UserProfile = Prisma.UserGetPayload<{ select: typeof userProfileSelect }>;

export class UserService {
  constructor(private readonly app: FastifyInstance) { }

  async getProfile(userId: string): Promise<UserProfile> {
    const user = await this.app.prisma.user.findUnique({
      where: { id: userId },
      select: userProfileSelect,
    });

    if (!user) {
      throw new HttpError(404, "User not found.");
    }

    return user;
  }

  async updateProfile(userId: string, data: UpdateProfileBody): Promise<UserProfile> {
    if (typeof data.name === "undefined") {
      return this.getProfile(userId);
    }

    const nextName = data.name.trim();

    if (!nextName) {
      throw new HttpError(400, "Name cannot be empty.");
    }

    try {
      return await this.app.prisma.user.update({
        where: { id: userId },
        data: {
          name: nextName,
        },
        select: userProfileSelect,
      });
    } catch {
      throw new HttpError(404, "User not found.");
    }
  }
}
