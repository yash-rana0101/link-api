import { ArtifactType, ConnectionStatus, ExperienceStatus, Prisma } from "@prisma/client";
import { FastifyInstance } from "fastify";

import { CacheService } from "../../services/cache.service";
import { HttpError } from "../../utils/http-error";
import {
  CompletionSectionKey,
  ProfileCompletionEvaluation,
  buildProfileCompletionEvaluation,
} from "./profile-completion";
import { UpdateProfileBody } from "./user.schema";

const PROFILE_CACHE_TTL_SECONDS = 300;
const PROFILE_CACHE_PREFIX = "profile";

const profileSkillSelect = {
  id: true,
  name: true,
} satisfies Prisma.SkillSelect;

const userProfileSelect = {
  id: true,
  email: true,
  name: true,
  currentRole: true,
  headline: true,
  about: true,
  profileImageUrl: true,
  trustScore: true,
  createdAt: true,
  skills: {
    orderBy: {
      name: "asc",
    },
    select: profileSkillSelect,
  },
} satisfies Prisma.UserSelect;

const connectionUserSelect = {
  id: true,
  email: true,
  name: true,
  trustScore: true,
} satisfies Prisma.UserSelect;

const experienceArtifactSelect = {
  id: true,
  type: true,
  url: true,
  createdAt: true,
} satisfies Prisma.ArtifactSelect;

const completeExperienceSelect = {
  id: true,
  userId: true,
  companyName: true,
  role: true,
  description: true,
  status: true,
  startDate: true,
  endDate: true,
  createdAt: true,
  artifacts: {
    select: experienceArtifactSelect,
  },
} satisfies Prisma.ExperienceSelect;

const completeConnectionSelect = {
  id: true,
  requesterId: true,
  receiverId: true,
  relationship: true,
  status: true,
  createdAt: true,
  requester: {
    select: connectionUserSelect,
  },
  receiver: {
    select: connectionUserSelect,
  },
} satisfies Prisma.ConnectionSelect;

const completePostSelect = {
  id: true,
  userId: true,
  content: true,
  createdAt: true,
  _count: {
    select: {
      likes: true,
      comments: true,
    },
  },
} satisfies Prisma.PostSelect;

type UserProfile = Prisma.UserGetPayload<{ select: typeof userProfileSelect }>;
type ProfileSkillRecord = Prisma.SkillGetPayload<{ select: typeof profileSkillSelect }>;
type CompleteExperienceRecord = Prisma.ExperienceGetPayload<{ select: typeof completeExperienceSelect }>;
type CompleteConnectionRow = Prisma.ConnectionGetPayload<{ select: typeof completeConnectionSelect }>;
type CompletePostRow = Prisma.PostGetPayload<{ select: typeof completePostSelect }>;

interface ProfileCertificateRecord {
  id: string;
  experienceId: string;
  companyName: string;
  role: string;
  url: string;
  createdAt: Date;
}

interface ProfileConnectionRecord {
  id: string;
  relationship: CompleteConnectionRow["relationship"];
  status: CompleteConnectionRow["status"];
  createdAt: Date;
  otherUser: CompleteConnectionRow["requester"];
}

interface ProfilePostRecord {
  id: string;
  userId: string;
  content: string;
  createdAt: Date;
  likeCount: number;
  commentCount: number;
}

interface ProfileProofRecord {
  id: string;
  experienceId: string;
  companyName: string;
  role: string;
  type: ArtifactType;
  url: string;
  createdAt: Date;
}

export interface CompleteProfileResult {
  profile: UserProfile;
  stats: {
    totalExperiences: number;
    verifiedExperiences: number;
    totalArtifacts: number;
    certificateCount: number;
    totalConnections: number;
    totalPosts: number;
  };
  experiences: CompleteExperienceRecord[];
  certificates: ProfileCertificateRecord[];
  connections: ProfileConnectionRecord[];
  posts: ProfilePostRecord[];
}

export interface ProfileCompletionGuideResult extends ProfileCompletionEvaluation {
  profileCompleteness: Record<CompletionSectionKey, boolean>;
  structuredOutput: {
    profile: UserProfile;
    experiences: CompleteExperienceRecord[];
    skills: string[];
    artifacts: ProfileProofRecord[];
  };
}

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

    if (
      typeof data.name === "undefined"
      && typeof data.currentRole === "undefined"
      && typeof data.profileImageUrl === "undefined"
      && typeof data.headline === "undefined"
      && typeof data.about === "undefined"
      && typeof data.skills === "undefined"
    ) {
      return this.getProfile(normalizedUserId);
    }

    const updateData: Prisma.UserUpdateInput = {};

    if (typeof data.name !== "undefined") {
      const nextName = data.name.trim();

      if (!nextName) {
        throw new HttpError(400, "Name cannot be empty.");
      }

      updateData.name = nextName;
    }

    if (typeof data.currentRole !== "undefined") {
      updateData.currentRole = this.normalizeNullableText(data.currentRole, "currentRole");
    }

    if (typeof data.headline !== "undefined") {
      updateData.headline = this.normalizeNullableText(data.headline, "headline");
    }

    if (typeof data.about !== "undefined") {
      updateData.about = this.normalizeNullableText(data.about, "about");
    }

    if (typeof data.profileImageUrl !== "undefined") {
      updateData.profileImageUrl = this.normalizeNullableUrl(data.profileImageUrl, "profileImageUrl");
    }

    if (typeof data.skills !== "undefined") {
      const normalizedSkills = this.normalizeSkills(data.skills);

      updateData.skills = {
        deleteMany: {},
        create: normalizedSkills.map((name) => ({ name })),
      };
    }

    try {
      const updatedProfile = await this.app.prisma.user.update({
        where: { id: normalizedUserId },
        data: updateData,
        select: userProfileSelect,
      });

      await this.cacheService.del(this.buildProfileCacheKey(normalizedUserId));

      return updatedProfile;
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }

      throw new HttpError(404, "User not found.");
    }
  }

  async getProfileCompletionGuide(userId: string): Promise<ProfileCompletionGuideResult> {
    const normalizedUserId = this.normalizeRequiredId(userId, "userId");
    const profile = await this.getProfile(normalizedUserId);
    const experiences = await this.app.prisma.experience.findMany({
      where: {
        userId: normalizedUserId,
      },
      orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
      select: completeExperienceSelect,
    });

    const artifacts = experiences.flatMap((experience) => experience.artifacts.map((artifact) => ({
      id: artifact.id,
      experienceId: experience.id,
      companyName: experience.companyName,
      role: experience.role,
      type: artifact.type,
      url: artifact.url,
      createdAt: artifact.createdAt,
    })));
    const skillNames = this.mapSkillNames(profile.skills);

    const evaluation = buildProfileCompletionEvaluation({
      profile: {
        name: profile.name,
        currentRole: profile.currentRole,
        headline: profile.headline,
        about: profile.about,
        profileImageUrl: profile.profileImageUrl,
      },
      experiences: experiences.map((experience) => ({
        id: experience.id,
        companyName: experience.companyName,
        role: experience.role,
        description: experience.description,
        status: experience.status,
        artifacts: experience.artifacts.map((artifact) => ({
          id: artifact.id,
          type: artifact.type,
          url: artifact.url,
        })),
      })),
      skills: skillNames,
    });

    return {
      ...evaluation,
      profileCompleteness: evaluation.completion.sections,
      structuredOutput: {
        profile,
        experiences,
        skills: skillNames,
        artifacts,
      },
    };
  }

  async getCompleteProfile(userId: string): Promise<CompleteProfileResult> {
    const normalizedUserId = this.normalizeRequiredId(userId, "userId");
    const profile = await this.getProfile(normalizedUserId);

    const [experiences, connections, posts] = await Promise.all([
      this.app.prisma.experience.findMany({
        where: {
          userId: normalizedUserId,
        },
        orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
        select: completeExperienceSelect,
      }),
      this.app.prisma.connection.findMany({
        where: {
          status: ConnectionStatus.ACCEPTED,
          OR: [{ requesterId: normalizedUserId }, { receiverId: normalizedUserId }],
        },
        orderBy: {
          createdAt: "desc",
        },
        select: completeConnectionSelect,
      }),
      this.app.prisma.post.findMany({
        where: {
          userId: normalizedUserId,
        },
        orderBy: {
          createdAt: "desc",
        },
        select: completePostSelect,
      }),
    ]);

    const certificates = experiences
      .flatMap((experience) => experience.artifacts
        .filter((artifact) => artifact.type === ArtifactType.CERTIFICATE)
        .map((artifact) => ({
          id: artifact.id,
          experienceId: experience.id,
          companyName: experience.companyName,
          role: experience.role,
          url: artifact.url,
          createdAt: artifact.createdAt,
        })))
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());

    const mappedConnections = connections.map((connection) => ({
      id: connection.id,
      relationship: connection.relationship,
      status: connection.status,
      createdAt: connection.createdAt,
      otherUser: connection.requesterId === normalizedUserId ? connection.receiver : connection.requester,
    }));

    const mappedPosts = posts.map((post) => ({
      id: post.id,
      userId: post.userId,
      content: post.content,
      createdAt: post.createdAt,
      likeCount: post._count.likes,
      commentCount: post._count.comments,
    }));

    const verifiedExperiences = experiences.filter((experience) => (
      experience.status === ExperienceStatus.PEER_VERIFIED
      || experience.status === ExperienceStatus.FULLY_VERIFIED
    )).length;
    const totalArtifacts = experiences.reduce((total, experience) => total + experience.artifacts.length, 0);

    return {
      profile,
      stats: {
        totalExperiences: experiences.length,
        verifiedExperiences,
        totalArtifacts,
        certificateCount: certificates.length,
        totalConnections: mappedConnections.length,
        totalPosts: mappedPosts.length,
      },
      experiences,
      certificates,
      connections: mappedConnections,
      posts: mappedPosts,
    };
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

  private normalizeNullableText(value: string | null, fieldName: string): string | null {
    if (value === null) {
      return null;
    }

    const normalized = value.trim();

    if (!normalized) {
      throw new HttpError(400, `${fieldName} cannot be empty string. Use null to clear it.`);
    }

    return normalized;
  }

  private normalizeNullableUrl(value: string | null, fieldName: string): string | null {
    if (value === null) {
      return null;
    }

    const normalized = value.trim();

    if (!normalized) {
      throw new HttpError(400, `${fieldName} cannot be empty string. Use null to clear it.`);
    }

    try {
      const parsed = new URL(normalized);

      if (!parsed.protocol.startsWith("http")) {
        throw new HttpError(400, `${fieldName} must start with http or https.`);
      }

      return parsed.toString();
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }

      throw new HttpError(400, `${fieldName} must be a valid URL.`);
    }
  }

  private normalizeSkills(skills: string[]): string[] {
    if (skills.length > 10) {
      throw new HttpError(400, "skills can include at most 10 items.");
    }

    const uniqueSkills: string[] = [];
    const seen = new Set<string>();

    for (const skill of skills) {
      const normalizedSkill = skill.trim();

      if (!normalizedSkill) {
        throw new HttpError(400, "skills cannot include empty values.");
      }

      const dedupeKey = normalizedSkill.toLowerCase();

      if (seen.has(dedupeKey)) {
        continue;
      }

      seen.add(dedupeKey);
      uniqueSkills.push(normalizedSkill);
    }

    return uniqueSkills;
  }

  private mapSkillNames(skills: ProfileSkillRecord[]): string[] {
    return skills.map((skill) => skill.name);
  }

  private normalizeRequiredId(value: string, fieldName: string): string {
    const normalized = value.trim();

    if (!normalized) {
      throw new HttpError(400, `${fieldName} is required.`);
    }

    return normalized;
  }
}
