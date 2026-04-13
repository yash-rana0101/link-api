import { Prisma } from "@prisma/client";
import { FastifyInstance } from "fastify";

import { CacheService } from "../../services/cache.service";
import { HttpError } from "../../utils/http-error";
import { UpdateProfileBody } from "./user.schema";

const PROFILE_CACHE_TTL_SECONDS = 300;
const PROFILE_CACHE_PREFIX = "profile";

const userProfileSelect = {
  id: true,
  email: true,
  name: true,
  trustScore: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

type UserProfile = Prisma.UserGetPayload<{ select: typeof userProfileSelect }>;

export class UserService {
  private readonly cacheService: CacheService;

  constructor(private readonly app: FastifyInstance) {
    this.cacheService = new CacheService(app.redis, app.log);
  }

  async getProfile(userId: string): Promise<UserProfile> {
    const normalizedUserId = this.normalizeRequiredId(userId, "userId");
    const cacheKey = this.buildProfileCacheKey(normalizedUserId);
    const cachedProfile = await this.cacheService.get<UserProfile>(cacheKey);

    if (cachedProfile) {
      return this.hydrateCachedProfile(cachedProfile);
    }

    const user = await this.app.prisma.user.findUnique({
      where: { id: normalizedUserId },
      select: userProfileSelect,
    });

    if (!user) {
      throw new HttpError(404, "User not found.");
    }

    await this.cacheService.set(cacheKey, user, PROFILE_CACHE_TTL_SECONDS);

    return user;
  }

  async updateProfile(userId: string, data: UpdateProfileBody): Promise<UserProfile> {
    const normalizedUserId = this.normalizeRequiredId(userId, "userId");

    if (typeof data.name === "undefined") {
      return this.getProfile(normalizedUserId);
    }

    const nextName = data.name.trim();

    if (!nextName) {
      throw new HttpError(400, "Name cannot be empty.");
    }

    try {
      const updatedProfile = await this.app.prisma.user.update({
        where: { id: normalizedUserId },
        data: {
          name: nextName,
        },
        select: userProfileSelect,
      });

      await this.cacheService.del(this.buildProfileCacheKey(normalizedUserId));

      return updatedProfile;
    } catch {
      throw new HttpError(404, "User not found.");
    }
  }

  private buildProfileCacheKey(userId: string): string {
    return `${PROFILE_CACHE_PREFIX}:${userId}`;
  }

  private hydrateCachedProfile(profile: UserProfile): UserProfile {
    return {
      ...profile,
      createdAt: new Date(profile.createdAt),
    };
  }

  private normalizeRequiredId(value: string, fieldName: string): string {
    const normalized = value.trim();

    if (!normalized) {
      throw new HttpError(400, `${fieldName} is required.`);
    }

    return normalized;
  }
}
