import { FastifySchema } from "fastify";

export interface SignupBody {
  email: string;
  password: string;
  name?: string;
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface RefreshBody {
  refreshToken: string;
}

export interface LogoutBody {
  refreshToken: string;
}

export interface OAuthCallbackBody {
  code: string;
  redirectUri?: string;
  codeVerifier?: string;
}

export const signupSchema: FastifySchema = {
  body: {
    type: "object",
    required: ["email", "password"],
    additionalProperties: false,
    properties: {
      email: { type: "string", format: "email", maxLength: 255 },
      password: { type: "string", minLength: 6, maxLength: 72 },
      name: { type: "string", minLength: 1, maxLength: 120 },
    },
  },
};

export const loginSchema: FastifySchema = {
  body: {
    type: "object",
    required: ["email", "password"],
    additionalProperties: false,
    properties: {
      email: { type: "string", format: "email", maxLength: 255 },
      password: { type: "string", minLength: 6, maxLength: 72 },
    },
  },
};

export const refreshSchema: FastifySchema = {
  body: {
    type: "object",
    required: ["refreshToken"],
    additionalProperties: false,
    properties: {
      refreshToken: { type: "string", minLength: 20 },
    },
  },
};

export const logoutSchema: FastifySchema = {
  body: {
    type: "object",
    required: ["refreshToken"],
    additionalProperties: false,
    properties: {
      refreshToken: { type: "string", minLength: 20 },
    },
  },
};

export const oauthCallbackSchema: FastifySchema = {
  body: {
    type: "object",
    required: ["code"],
    additionalProperties: false,
    properties: {
      code: { type: "string", minLength: 10, maxLength: 4096 },
      redirectUri: { type: "string", format: "uri", maxLength: 2048 },
      codeVerifier: { type: "string", minLength: 43, maxLength: 128 },
    },
  },
};
