import { FastifySchema } from "fastify";

export type UploadAssetKind = "PROFILE_IMAGE" | "PROFILE_BANNER" | "POST_IMAGE";

const uploadAssetKindValues: UploadAssetKind[] = ["PROFILE_IMAGE", "PROFILE_BANNER", "POST_IMAGE"];

export interface UpdateProfileBody {
  name?: string;
  currentRole?: string | null;
  location?: string | null;
  profileImageUrl?: string | null;
  profileBannerUrl?: string | null;
  publicProfileUrl?: string | null;
  headline?: string | null;
  about?: string | null;
  skills?: string[];
}

export interface PublicProfileParams {
  publicProfileUrl: string;
}

export interface GenerateUploadSignatureBody {
  kind: UploadAssetKind;
}

export interface ProfileViewsQuerystring {
  limit?: string;
}

export interface GlobalSearchQuerystring {
  q?: string;
  limit?: string;
}

export const updateProfileSchema: FastifySchema = {
  body: {
    type: "object",
    additionalProperties: false,
    properties: {
      name: { type: "string", minLength: 1, maxLength: 120 },
      currentRole: { type: ["string", "null"], minLength: 1, maxLength: 160 },
      location: { type: ["string", "null"], minLength: 1, maxLength: 120 },
      profileImageUrl: { type: ["string", "null"], format: "uri", maxLength: 2000 },
      profileBannerUrl: { type: ["string", "null"], format: "uri", maxLength: 2000 },
      publicProfileUrl: { type: ["string", "null"], minLength: 3, maxLength: 100 },
      headline: { type: ["string", "null"], minLength: 1, maxLength: 180 },
      about: { type: ["string", "null"], minLength: 1, maxLength: 2000 },
      skills: {
        type: "array",
        minItems: 0,
        maxItems: 10,
        uniqueItems: true,
        items: { type: "string", minLength: 1, maxLength: 40 },
      },
    },
  },
};

export const getPublicProfileSchema: FastifySchema = {
  params: {
    type: "object",
    required: ["publicProfileUrl"],
    additionalProperties: false,
    properties: {
      publicProfileUrl: { type: "string", minLength: 3, maxLength: 100 },
    },
  },
};

export const generateUploadSignatureSchema: FastifySchema = {
  body: {
    type: "object",
    required: ["kind"],
    additionalProperties: false,
    properties: {
      kind: { type: "string", enum: uploadAssetKindValues },
    },
  },
};

const listLimitQueryProperty = {
  type: "string",
  pattern: "^[0-9]+$",
} as const;

export const getProfileViewsSchema: FastifySchema = {
  querystring: {
    type: "object",
    additionalProperties: false,
    properties: {
      limit: listLimitQueryProperty,
    },
  },
};

export const globalSearchSchema: FastifySchema = {
  querystring: {
    type: "object",
    additionalProperties: false,
    properties: {
      q: {
        type: "string",
        maxLength: 120,
      },
      limit: listLimitQueryProperty,
    },
  },
};
