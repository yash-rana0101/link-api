import { createHash, randomUUID } from "node:crypto";

import { ArtifactType, ConnectionStatus, ExperienceStatus, NotificationType, Prisma } from "@prisma/client";
import { FastifyInstance } from "fastify";

import { env } from "../../config/env";
import { CacheService } from "../../services/cache.service";
import { QueueService } from "../../services/queue.service";
import { HttpError } from "../../utils/http-error";
import { NotificationQueueJobData } from "../notification/notification.queue";
import {
  CompletionSectionKey,
  ProfileCompletionEvaluation,
  buildProfileCompletionEvaluation,
} from "./profile-completion";
import { GlobalSearchQuerystring, UpdateProfileBody, UploadAssetKind } from "./user.schema";

const PROFILE_CACHE_TTL_SECONDS = 300;
const PROFILE_CACHE_PREFIX = "profile";
const PROFILE_URL_MIN_LENGTH = 3;
const PROFILE_URL_MAX_LENGTH = 60;
const PROFILE_VIEW_NOTIFICATION_COOLDOWN_HOURS = 12;

const RESERVED_PUBLIC_PROFILE_URLS = new Set([
  "me",
  "public",
  "update",
  "upload",
  "complete",
  "completion-guide",
  "auth",
  "feed",
  "jobs",
  "messages",
  "notifications",
  "connections",
  "verification",
  "api",
  "admin",
  "settings",
  "support",
  "help",
  "privacy",
  "terms",
]);

const profileSkillSelect = {
  id: true,
  name: true,
} satisfies Prisma.SkillSelect;

const userProfileSelect = {
  id: true,
  email: true,
  name: true,
  currentRole: true,
  location: true,
  headline: true,
  about: true,
  profileImageUrl: true,
  profileBannerUrl: true,
  publicProfileUrl: true,
  trustScore: true,
  createdAt: true,
  skills: {
    orderBy: {
      name: "asc",
    },
    select: profileSkillSelect,
  },
} satisfies Prisma.UserSelect;

const publicUserProfileSelect = {
  id: true,
  name: true,
  currentRole: true,
  location: true,
  headline: true,
  about: true,
  profileImageUrl: true,
  profileBannerUrl: true,
  publicProfileUrl: true,
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
  profileImageUrl: true,
  publicProfileUrl: true,
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
  imageUrl: true,
  createdAt: true,
  _count: {
    select: {
      likes: true,
      comments: true,
    },
  },
} satisfies Prisma.PostSelect;

const profileViewSelect = {
  id: true,
  viewerId: true,
  viewedUserId: true,
  createdAt: true,
  viewer: {
    select: {
      id: true,
      name: true,
      currentRole: true,
      location: true,
      headline: true,
      profileImageUrl: true,
      publicProfileUrl: true,
      trustScore: true,
    },
  },
} satisfies Prisma.ProfileViewSelect;

const globalSearchUserSelect = {
  id: true,
  name: true,
  currentRole: true,
  location: true,
  headline: true,
  profileImageUrl: true,
  publicProfileUrl: true,
  trustScore: true,
} satisfies Prisma.UserSelect;

const globalSearchJobSelect = {
  id: true,
  title: true,
  description: true,
  location: true,
  createdAt: true,
  postedById: true,
  postedBy: {
    select: {
      id: true,
      name: true,
      publicProfileUrl: true,
    },
  },
} satisfies Prisma.JobSelect;

type UserProfile = Prisma.UserGetPayload<{ select: typeof userProfileSelect }>;
type PublicProfile = Prisma.UserGetPayload<{ select: typeof publicUserProfileSelect }>;
type ProfileSkillRecord = Prisma.SkillGetPayload<{ select: typeof profileSkillSelect }>;
type CompleteExperienceRecord = Prisma.ExperienceGetPayload<{ select: typeof completeExperienceSelect }>;
type CompleteConnectionRow = Prisma.ConnectionGetPayload<{ select: typeof completeConnectionSelect }>;
type CompletePostRow = Prisma.PostGetPayload<{ select: typeof completePostSelect }>;
type ProfileViewRow = Prisma.ProfileViewGetPayload<{ select: typeof profileViewSelect }>;
type GlobalSearchUserRow = Prisma.UserGetPayload<{ select: typeof globalSearchUserSelect }>;
type GlobalSearchJobRow = Prisma.JobGetPayload<{ select: typeof globalSearchJobSelect }>;

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
  imageUrl: string | null;
  createdAt: Date;
  likeCount: number;
  commentCount: number;
}

interface ProfileEducationRecord {
  id: string;
  experienceId: string;
  institutionName: string;
  degree: string;
  description: string | null;
  startDate: Date;
  endDate: Date | null;
  proofUrl: string;
  createdAt: Date;
}

interface ProfileProjectRecord {
  id: string;
  experienceId: string;
  organizationName: string;
  title: string;
  description: string | null;
  type: ArtifactType;
  url: string;
  createdAt: Date;
}

interface ProfileAnalyticsRecord {
  totalConnections: number;
  totalFollowers: number;
  totalFollowing: number;
  totalExperiences: number;
  verifiedExperiences: number;
  totalArtifacts: number;
  certificateCount: number;
  totalPosts: number;
  totalSkills: number;
  totalProjects: number;
  totalReactions: number;
  totalComments: number;
  totalProfileViews: number;
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

interface ProfileStatsResult {
  totalExperiences: number;
  verifiedExperiences: number;
  totalArtifacts: number;
  certificateCount: number;
  totalConnections: number;
  totalPosts: number;
}

export interface CompleteProfileResult {
  profile: UserProfile;
  stats: ProfileStatsResult;
  experiences: CompleteExperienceRecord[];
  certificates: ProfileCertificateRecord[];
  education: ProfileEducationRecord[];
  projects: ProfileProjectRecord[];
  connections: ProfileConnectionRecord[];
  posts: ProfilePostRecord[];
  featuredPost: ProfilePostRecord | null;
  analytics: ProfileAnalyticsRecord;
}

export interface PublicProfileResult {
  profile: PublicProfile;
  stats: ProfileStatsResult;
  experiences: CompleteExperienceRecord[];
  certificates: ProfileCertificateRecord[];
  education: ProfileEducationRecord[];
  projects: ProfileProjectRecord[];
  posts: ProfilePostRecord[];
  featuredPost: ProfilePostRecord | null;
  analytics: ProfileAnalyticsRecord;
}

export interface ProfileViewerRecord {
  viewer: ProfileViewRow["viewer"];
  firstViewedAt: Date;
  lastViewedAt: Date;
  viewCount: number;
}

export interface GlobalSearchUserRecord {
  id: string;
  name: string | null;
  currentRole: string | null;
  location: string | null;
  headline: string | null;
  profileImageUrl: string | null;
  publicProfileUrl: string | null;
  trustScore: number;
}

export interface GlobalSearchJobRecord {
  id: string;
  title: string;
  description: string;
  location: string | null;
  createdAt: Date;
  postedById: string;
  postedBy: {
    id: string;
    name: string | null;
    publicProfileUrl: string | null;
  };
}

export interface GlobalSearchCompanyRecord {
  companyName: string;
  memberCount: number;
}

export interface GlobalSearchResult {
  query: string;
  users: GlobalSearchUserRecord[];
  jobs: GlobalSearchJobRecord[];
  companies: GlobalSearchCompanyRecord[];
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

export interface UploadSignatureResult {
  kind: UploadAssetKind;
  cloudName: string;
  apiKey: string;
  folder: string;
  timestamp: number;
  publicId: string;
  signature: string;
  uploadUrl: string;
}

export class UserService {
  private readonly cacheService: CacheService;
  private readonly queueService: QueueService;

  constructor(private readonly app: FastifyInstance) {
    this.cacheService = new CacheService(app.redis, app.log);
    this.queueService = new QueueService(app.log);
  }

  async getProfile(userId: string): Promise<UserProfile> {
    const normalizedUserId = this.normalizeRequiredId(userId, "userId");
    const cacheKey = this.buildProfileCacheKey(normalizedUserId);
    const cachedProfile = await this.cacheService.get<UserProfile>(cacheKey);

    if (cachedProfile) {
      const hydratedCachedProfile = this.hydrateCachedProfile(cachedProfile);

      if (hydratedCachedProfile.publicProfileUrl) {
        return hydratedCachedProfile;
      }

      const repairedProfile = await this.ensureUserHasPublicProfileUrl(hydratedCachedProfile);
      await this.cacheService.set(cacheKey, repairedProfile, PROFILE_CACHE_TTL_SECONDS);

      return repairedProfile;
    }

    const user = await this.app.prisma.user.findUnique({
      where: { id: normalizedUserId },
      select: userProfileSelect,
    });

    if (!user) {
      throw new HttpError(404, "User not found.");
    }

    const profile = await this.ensureUserHasPublicProfileUrl(user);

    await this.cacheService.set(cacheKey, profile, PROFILE_CACHE_TTL_SECONDS);

    return profile;
  }

  async updateProfile(userId: string, data: UpdateProfileBody): Promise<UserProfile> {
    const normalizedUserId = this.normalizeRequiredId(userId, "userId");

    if (
      typeof data.name === "undefined"
      && typeof data.currentRole === "undefined"
      && typeof data.location === "undefined"
      && typeof data.profileImageUrl === "undefined"
      && typeof data.profileBannerUrl === "undefined"
      && typeof data.publicProfileUrl === "undefined"
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

    if (typeof data.location !== "undefined") {
      updateData.location = this.normalizeNullableText(data.location, "location");
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

    if (typeof data.profileBannerUrl !== "undefined") {
      updateData.profileBannerUrl = this.normalizeNullableUrl(data.profileBannerUrl, "profileBannerUrl");
    }

    if (typeof data.publicProfileUrl !== "undefined") {
      updateData.publicProfileUrl = data.publicProfileUrl === null
        ? this.buildDefaultPublicProfileUrl(normalizedUserId)
        : this.normalizePublicProfileUrl(data.publicProfileUrl);
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

      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new HttpError(409, "This public profile URL is already in use.");
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

  async getPublicProfileByUrl(publicProfileUrl: string, viewerId?: string | null): Promise<PublicProfileResult> {
    const normalizedPublicProfileUrl = this.normalizePublicProfileUrl(publicProfileUrl);

    if (!normalizedPublicProfileUrl) {
      throw new HttpError(400, "publicProfileUrl is required.");
    }

    const profile = await this.app.prisma.user.findUnique({
      where: {
        publicProfileUrl: normalizedPublicProfileUrl,
      },
      select: publicUserProfileSelect,
    });

    if (!profile) {
      throw new HttpError(404, "Public profile not found.");
    }

    const [
      experiences,
      posts,
      totalConnections,
      totalPosts,
      totalProfileViews,
      totalFollowers,
      totalFollowing,
    ] = await Promise.all([
      this.app.prisma.experience.findMany({
        where: {
          userId: profile.id,
        },
        orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
        select: completeExperienceSelect,
      }),
      this.app.prisma.post.findMany({
        where: {
          userId: profile.id,
        },
        orderBy: {
          createdAt: "desc",
        },
        select: completePostSelect,
      }),
      this.app.prisma.connection.count({
        where: {
          status: ConnectionStatus.ACCEPTED,
          OR: [{ requesterId: profile.id }, { receiverId: profile.id }],
        },
      }),
      this.app.prisma.post.count({
        where: {
          userId: profile.id,
        },
      }),
      this.app.prisma.profileView.count({
        where: {
          viewedUserId: profile.id,
        },
      }),
      this.countFollowersSafe(profile.id),
      this.countFollowingSafe(profile.id),
    ]);

    const certificates = this.buildCertificates(experiences);
    const education = this.buildEducation(experiences);
    const projects = this.buildProjects(experiences);
    const mappedPosts = posts.map((post) => ({
      id: post.id,
      userId: post.userId,
      content: post.content,
      imageUrl: post.imageUrl,
      createdAt: post.createdAt,
      likeCount: post._count.likes,
      commentCount: post._count.comments,
    }));
    const featuredPost = this.pickFeaturedPost(mappedPosts);
    const stats = this.buildProfileStats(experiences, certificates.length, totalConnections, totalPosts);
    const analytics = this.buildProfileAnalytics(
      stats,
      profile.skills.length,
      projects.length,
      mappedPosts,
      totalProfileViews,
      totalFollowers,
      totalFollowing,
    );

    if (viewerId) {
      try {
        await this.trackProfileView(profile.id, viewerId);
      } catch (error) {
        this.app.log.warn(
          {
            err: error,
            viewedUserId: profile.id,
            viewerId,
          },
          "Failed to record profile view.",
        );
      }
    }

    return {
      profile,
      stats,
      experiences,
      certificates,
      education,
      projects,
      posts: mappedPosts,
      featuredPost,
      analytics,
    };
  }

  async getProfileViews(userId: string, limitRaw?: string): Promise<ProfileViewerRecord[]> {
    const normalizedUserId = this.normalizeRequiredId(userId, "userId");
    const limit = this.parseListLimit(limitRaw, 20, 100);

    const rows = await this.app.prisma.profileView.findMany({
      where: {
        viewedUserId: normalizedUserId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: Math.min(limit * 6, 500),
      select: profileViewSelect,
    });

    const groupedByViewer = new Map<string, ProfileViewerRecord>();

    for (const row of rows) {
      if (row.viewerId === normalizedUserId) {
        continue;
      }

      const existing = groupedByViewer.get(row.viewerId);

      if (!existing) {
        groupedByViewer.set(row.viewerId, {
          viewer: row.viewer,
          firstViewedAt: row.createdAt,
          lastViewedAt: row.createdAt,
          viewCount: 1,
        });
        continue;
      }

      existing.viewCount += 1;

      if (row.createdAt < existing.firstViewedAt) {
        existing.firstViewedAt = row.createdAt;
      }

      if (row.createdAt > existing.lastViewedAt) {
        existing.lastViewedAt = row.createdAt;
      }
    }

    return Array.from(groupedByViewer.values())
      .sort((left, right) => right.lastViewedAt.getTime() - left.lastViewedAt.getTime())
      .slice(0, limit);
  }

  async searchGlobal(userId: string, query: GlobalSearchQuerystring): Promise<GlobalSearchResult> {
    const normalizedUserId = this.normalizeRequiredId(userId, "userId");
    const normalizedQuery = query.q?.trim() ?? "";
    const limit = this.parseListLimit(query.limit, 8, 25);

    const userWhere: Prisma.UserWhereInput = {
      id: {
        not: normalizedUserId,
      },
      publicProfileUrl: {
        not: null,
      },
      ...(normalizedQuery
        ? {
          OR: [
            {
              name: {
                contains: normalizedQuery,
                mode: "insensitive",
              },
            },
            {
              currentRole: {
                contains: normalizedQuery,
                mode: "insensitive",
              },
            },
            {
              location: {
                contains: normalizedQuery,
                mode: "insensitive",
              },
            },
            {
              headline: {
                contains: normalizedQuery,
                mode: "insensitive",
              },
            },
            {
              about: {
                contains: normalizedQuery,
                mode: "insensitive",
              },
            },
            {
              publicProfileUrl: {
                contains: normalizedQuery,
                mode: "insensitive",
              },
            },
            {
              experiences: {
                some: {
                  companyName: {
                    contains: normalizedQuery,
                    mode: "insensitive",
                  },
                },
              },
            },
          ],
        }
        : {}),
    };

    const jobsWhere: Prisma.JobWhereInput = normalizedQuery
      ? {
        OR: [
          {
            title: {
              contains: normalizedQuery,
              mode: "insensitive",
            },
          },
          {
            description: {
              contains: normalizedQuery,
              mode: "insensitive",
            },
          },
          {
            location: {
              contains: normalizedQuery,
              mode: "insensitive",
            },
          },
        ],
      }
      : {};

    const companiesWhere: Prisma.ExperienceWhereInput = normalizedQuery
      ? {
        companyName: {
          contains: normalizedQuery,
          mode: "insensitive",
        },
      }
      : {};

    const [users, jobs, companies] = await Promise.all([
      this.app.prisma.user.findMany({
        where: userWhere,
        orderBy: [{ trustScore: "desc" }, { createdAt: "desc" }],
        take: limit,
        select: globalSearchUserSelect,
      }),
      this.app.prisma.job.findMany({
        where: jobsWhere,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: limit,
        select: globalSearchJobSelect,
      }),
      this.app.prisma.experience.groupBy({
        by: ["companyName"],
        where: companiesWhere,
        _count: {
          companyName: true,
        },
        orderBy: {
          _count: {
            companyName: "desc",
          },
        },
        take: limit,
      }),
    ]);

    return {
      query: normalizedQuery,
      users: users.map((user): GlobalSearchUserRecord => ({
        id: user.id,
        name: user.name,
        currentRole: user.currentRole,
        location: user.location,
        headline: user.headline,
        profileImageUrl: user.profileImageUrl,
        publicProfileUrl: user.publicProfileUrl,
        trustScore: user.trustScore,
      })),
      jobs: jobs.map((job): GlobalSearchJobRecord => ({
        id: job.id,
        title: job.title,
        description: job.description,
        location: job.location,
        createdAt: job.createdAt,
        postedById: job.postedById,
        postedBy: {
          id: job.postedBy.id,
          name: job.postedBy.name,
          publicProfileUrl: job.postedBy.publicProfileUrl,
        },
      })),
      companies: companies.map((company): GlobalSearchCompanyRecord => ({
        companyName: company.companyName,
        memberCount: company._count.companyName,
      })),
    };
  }

  async generateUploadSignature(userId: string, kind: UploadAssetKind): Promise<UploadSignatureResult> {
    const normalizedUserId = this.normalizeRequiredId(userId, "userId");
    const cloudName = env.cloudinaryCloudName;
    const apiKey = env.cloudinaryApiKey;
    const apiSecret = env.cloudinaryApiSecret;

    if (!cloudName || !apiKey || !apiSecret) {
      throw new HttpError(503, "Cloudinary upload is not configured.");
    }

    const userExists = await this.app.prisma.user.findUnique({
      where: { id: normalizedUserId },
      select: { id: true },
    });

    if (!userExists) {
      throw new HttpError(404, "User not found.");
    }

    let kindFolder = "profile-banners";

    if (kind === "PROFILE_IMAGE") {
      kindFolder = "profile-images";
    } else if (kind === "POST_IMAGE") {
      kindFolder = "post-images";
    }
    const folder = `${env.cloudinaryUploadFolder}/${kindFolder}`;
    const timestamp = Math.floor(Date.now() / 1000);
    const publicId = `${kindFolder}/${normalizedUserId}-${randomUUID()}`;
    const signatureBase = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}`;
    const signature = createHash("sha1")
      .update(`${signatureBase}${apiSecret}`)
      .digest("hex");

    return {
      kind,
      cloudName,
      apiKey,
      folder,
      timestamp,
      publicId,
      signature,
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    };
  }

  async getCompleteProfile(userId: string): Promise<CompleteProfileResult> {
    const normalizedUserId = this.normalizeRequiredId(userId, "userId");
    const profile = await this.getProfile(normalizedUserId);

    const [
      experiences,
      connections,
      posts,
      totalProfileViews,
      totalFollowers,
      totalFollowing,
    ] = await Promise.all([
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
      this.app.prisma.profileView.count({
        where: {
          viewedUserId: normalizedUserId,
        },
      }),
      this.countFollowersSafe(normalizedUserId),
      this.countFollowingSafe(normalizedUserId),
    ]);

    const certificates = this.buildCertificates(experiences);
    const education = this.buildEducation(experiences);
    const projects = this.buildProjects(experiences);

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
      imageUrl: post.imageUrl,
      createdAt: post.createdAt,
      likeCount: post._count.likes,
      commentCount: post._count.comments,
    }));

    const featuredPost = this.pickFeaturedPost(mappedPosts);

    const stats = this.buildProfileStats(
      experiences,
      certificates.length,
      mappedConnections.length,
      mappedPosts.length,
    );

    const analytics = this.buildProfileAnalytics(
      stats,
      profile.skills.length,
      projects.length,
      mappedPosts,
      totalProfileViews,
      totalFollowers,
      totalFollowing,
    );

    return {
      profile,
      stats,
      experiences,
      certificates,
      education,
      projects,
      connections: mappedConnections,
      posts: mappedPosts,
      featuredPost,
      analytics,
    };
  }

  private async countFollowersSafe(userId: string): Promise<number> {
    try {
      return await this.app.prisma.follow.count({
        where: {
          followingId: userId,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2021" || error.code === "P2022")) {
        this.app.log.warn(
          {
            err: error,
            userId,
          },
          "Follow table unavailable while counting followers; defaulting to zero.",
        );

        return 0;
      }

      throw error;
    }
  }

  private async countFollowingSafe(userId: string): Promise<number> {
    try {
      return await this.app.prisma.follow.count({
        where: {
          followerId: userId,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2021" || error.code === "P2022")) {
        this.app.log.warn(
          {
            err: error,
            userId,
          },
          "Follow table unavailable while counting following; defaulting to zero.",
        );

        return 0;
      }

      throw error;
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

  private async ensureUserHasPublicProfileUrl(profile: UserProfile): Promise<UserProfile> {
    if (profile.publicProfileUrl) {
      return profile;
    }

    const primarySlug = this.buildDefaultPublicProfileUrl(profile.id);
    const fallbackSlug = `member-${randomUUID().replace(/-/g, "").slice(0, 12)}`;
    const candidateSlugs = [primarySlug, fallbackSlug];

    for (const slug of candidateSlugs) {
      try {
        return await this.app.prisma.user.update({
          where: {
            id: profile.id,
          },
          data: {
            publicProfileUrl: slug,
          },
          select: userProfileSelect,
        });
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
          throw error;
        }
      }
    }

    throw new HttpError(409, "Unable to generate a unique public profile URL.");
  }

  private buildDefaultPublicProfileUrl(userId: string): string {
    const normalizedId = userId.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12);
    const slugSuffix = normalizedId || randomUUID().replace(/-/g, "").slice(0, 12);

    return `member-${slugSuffix}`;
  }

  private parseListLimit(limitRaw: string | undefined, defaultLimit: number, maxLimit: number): number {
    if (typeof limitRaw === "undefined") {
      return defaultLimit;
    }

    const normalized = limitRaw.trim();

    if (!normalized) {
      throw new HttpError(400, `limit must be between 1 and ${maxLimit}.`);
    }

    const parsed = Number.parseInt(normalized, 10);

    if (!Number.isInteger(parsed) || parsed < 1 || parsed > maxLimit) {
      throw new HttpError(400, `limit must be between 1 and ${maxLimit}.`);
    }

    return parsed;
  }

  private async trackProfileView(viewedUserId: string, viewerId: string): Promise<void> {
    const normalizedViewedUserId = this.normalizeRequiredId(viewedUserId, "viewedUserId");
    const normalizedViewerId = this.normalizeRequiredId(viewerId, "viewerId");

    if (normalizedViewedUserId === normalizedViewerId) {
      return;
    }

    const notificationCooldownStart = new Date(
      Date.now() - PROFILE_VIEW_NOTIFICATION_COOLDOWN_HOURS * 60 * 60 * 1000,
    );

    const [viewer, recentViewForNotification] = await Promise.all([
      this.app.prisma.user.findUnique({
        where: {
          id: normalizedViewerId,
        },
        select: {
          id: true,
          name: true,
        },
      }),
      this.app.prisma.profileView.findFirst({
        where: {
          viewerId: normalizedViewerId,
          viewedUserId: normalizedViewedUserId,
          createdAt: {
            gte: notificationCooldownStart,
          },
        },
        select: {
          id: true,
        },
      }),
    ]);

    if (!viewer) {
      return;
    }

    await this.app.prisma.profileView.create({
      data: {
        viewerId: normalizedViewerId,
        viewedUserId: normalizedViewedUserId,
      },
    });

    if (recentViewForNotification) {
      return;
    }

    const viewerLabel = viewer.name?.trim() || "Someone";

    await this.enqueueNotification({
      userId: normalizedViewedUserId,
      type: NotificationType.PROFILE_VIEWED,
      message: `${viewerLabel} viewed your profile.`,
    });
  }

  private async enqueueNotification(data: NotificationQueueJobData): Promise<void> {
    try {
      await this.queueService.addJob(this.app.notificationQueue, "send-notification", data);
    } catch (error) {
      this.app.log.error(
        {
          err: error,
          userId: data.userId,
          type: data.type,
        },
        "Failed to enqueue profile notification.",
      );
    }
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

  private normalizePublicProfileUrl(value: string | null): string | null {
    if (value === null) {
      return null;
    }

    const rawValue = value.trim();

    if (!rawValue) {
      throw new HttpError(400, "publicProfileUrl cannot be empty string. Use null to clear it.");
    }

    let slug = rawValue;

    if (rawValue.includes("/")) {
      try {
        const parsed = new URL(rawValue.startsWith("http") ? rawValue : `https://${rawValue}`);
        slug = this.extractProfileSlug(parsed.pathname);
      } catch {
        slug = this.extractProfileSlug(rawValue);
      }
    }

    const normalized = slug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    if (normalized.length < PROFILE_URL_MIN_LENGTH || normalized.length > PROFILE_URL_MAX_LENGTH) {
      throw new HttpError(
        400,
        `publicProfileUrl must be ${PROFILE_URL_MIN_LENGTH}-${PROFILE_URL_MAX_LENGTH} characters after normalization.`,
      );
    }

    if (RESERVED_PUBLIC_PROFILE_URLS.has(normalized)) {
      throw new HttpError(400, "This public profile URL is reserved.");
    }

    return normalized;
  }

  private extractProfileSlug(value: string): string {
    const cleaned = value.trim().replace(/^\/+|\/+$/g, "");
    const parts = cleaned.split("/").filter(Boolean);

    if (parts.length === 0) {
      return cleaned;
    }

    if (parts[0]?.toLowerCase() === "in" && parts[1]) {
      return parts[1];
    }

    return parts[parts.length - 1] ?? cleaned;
  }

  private buildCertificates(experiences: CompleteExperienceRecord[]): ProfileCertificateRecord[] {
    return experiences
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
  }

  private buildEducation(experiences: CompleteExperienceRecord[]): ProfileEducationRecord[] {
    return experiences
      .flatMap((experience) => experience.artifacts
        .filter((artifact) => artifact.type === ArtifactType.CERTIFICATE)
        .map((artifact) => ({
          id: artifact.id,
          experienceId: experience.id,
          institutionName: experience.companyName,
          degree: experience.role,
          description: experience.description,
          startDate: experience.startDate,
          endDate: experience.endDate,
          proofUrl: artifact.url,
          createdAt: artifact.createdAt,
        })))
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }

  private buildProjects(experiences: CompleteExperienceRecord[]): ProfileProjectRecord[] {
    return experiences
      .flatMap((experience) => experience.artifacts
        .filter((artifact) => (
          artifact.type === ArtifactType.PROJECT
          || artifact.type === ArtifactType.PORTFOLIO
          || artifact.type === ArtifactType.GITHUB
        ))
        .map((artifact) => ({
          id: artifact.id,
          experienceId: experience.id,
          organizationName: experience.companyName,
          title: experience.role,
          description: experience.description,
          type: artifact.type,
          url: artifact.url,
          createdAt: artifact.createdAt,
        })))
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }

  private pickFeaturedPost(posts: ProfilePostRecord[]): ProfilePostRecord | null {
    if (!posts.length) {
      return null;
    }

    return [...posts]
      .sort((left, right) => {
        const leftScore = left.likeCount * 2 + left.commentCount;
        const rightScore = right.likeCount * 2 + right.commentCount;

        if (rightScore !== leftScore) {
          return rightScore - leftScore;
        }

        return right.createdAt.getTime() - left.createdAt.getTime();
      })[0] ?? null;
  }

  private buildProfileAnalytics(
    stats: ProfileStatsResult,
    totalSkills: number,
    totalProjects: number,
    posts: ProfilePostRecord[],
    totalProfileViews: number,
    totalFollowers: number,
    totalFollowing: number,
  ): ProfileAnalyticsRecord {
    const totalReactions = posts.reduce((sum, post) => sum + post.likeCount, 0);
    const totalComments = posts.reduce((sum, post) => sum + post.commentCount, 0);

    return {
      totalConnections: stats.totalConnections,
      totalFollowers,
      totalFollowing,
      totalExperiences: stats.totalExperiences,
      verifiedExperiences: stats.verifiedExperiences,
      totalArtifacts: stats.totalArtifacts,
      certificateCount: stats.certificateCount,
      totalPosts: stats.totalPosts,
      totalSkills,
      totalProjects,
      totalReactions,
      totalComments,
      totalProfileViews,
    };
  }

  private buildProfileStats(
    experiences: CompleteExperienceRecord[],
    certificateCount: number,
    totalConnections: number,
    totalPosts: number,
  ): ProfileStatsResult {
    const verifiedExperiences = experiences.filter((experience) => (
      experience.status === ExperienceStatus.PEER_VERIFIED
      || experience.status === ExperienceStatus.FULLY_VERIFIED
    )).length;
    const totalArtifacts = experiences.reduce((total, experience) => total + experience.artifacts.length, 0);

    return {
      totalExperiences: experiences.length,
      verifiedExperiences,
      totalArtifacts,
      certificateCount,
      totalConnections,
      totalPosts,
    };
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
