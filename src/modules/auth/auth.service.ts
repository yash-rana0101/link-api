import { createHash, randomBytes, randomUUID } from "node:crypto";

import bcrypt from "bcrypt";
import { Prisma } from "@prisma/client";
import { FastifyInstance } from "fastify";

import { env } from "../../config/env";
import { HttpError } from "../../utils/http-error";
import { LoginBody, OAuthCallbackBody, SignupBody } from "./auth.schema";

const PASSWORD_SALT_ROUNDS = 12;
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo";
const MICROSOFT_USERINFO_ENDPOINT = "https://graph.microsoft.com/oidc/userinfo";

const userPublicSelect = {
  id: true,
  email: true,
  name: true,
  currentRole: true,
  headline: true,
  about: true,
  profileImageUrl: true,
  profileBannerUrl: true,
  publicProfileUrl: true,
  trustScore: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

const userWithPasswordSelect = {
  ...userPublicSelect,
  passwordHash: true,
} satisfies Prisma.UserSelect;

type PublicUser = Prisma.UserGetPayload<{ select: typeof userPublicSelect }>;
type UserWithPassword = Prisma.UserGetPayload<{ select: typeof userWithPasswordSelect }>;

type TokenPayload = {
  sub: string;
  email: string;
  tokenType: "access" | "refresh";
};

type OAuthProviderName = "Google" | "Microsoft";

type OAuthProviderConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string | null;
};

type MicrosoftOAuthProviderConfig = OAuthProviderConfig & {
  tenantId: string;
};

type OAuthUserProfile = {
  email: string;
  name: string | null;
};

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult {
  user: PublicUser;
  tokens: AuthTokens;
}

export class AuthService {
  constructor(private readonly app: FastifyInstance) { }

  async signup(data: SignupBody): Promise<AuthResult> {
    const email = this.normalizeEmail(data.email);

    const existingUser = await this.app.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      throw new HttpError(409, "Email is already registered.");
    }

    const passwordHash = await this.hashPassword(data.password);

    const user = await this.app.prisma.user.create({
      data: {
        email,
        passwordHash,
        name: data.name?.trim() || null,
      },
      select: userPublicSelect,
    });

    const tokens = this.generateTokens({ id: user.id, email: user.email });
    await this.createSession(user.id, tokens.refreshToken);

    return { user, tokens };
  }

  async login(data: LoginBody): Promise<AuthResult> {
    const email = this.normalizeEmail(data.email);

    const user = await this.app.prisma.user.findUnique({
      where: { email },
      select: userWithPasswordSelect,
    });

    if (!user) {
      throw new HttpError(401, "Invalid email or password.");
    }

    const isPasswordValid = await this.comparePassword(data.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new HttpError(401, "Invalid email or password.");
    }

    const tokens = this.generateTokens({ id: user.id, email: user.email });
    await this.createSession(user.id, tokens.refreshToken);

    return {
      user: this.toPublicUser(user),
      tokens,
    };
  }

  async oauthGoogle(data: OAuthCallbackBody): Promise<AuthResult> {
    const googleConfig = this.getGoogleOAuthConfig();
    const redirectUri = this.resolveOAuthRedirectUri(data.redirectUri, googleConfig.redirectUri, "Google");

    const tokenBody = new URLSearchParams({
      client_id: googleConfig.clientId,
      client_secret: googleConfig.clientSecret,
      code: data.code.trim(),
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    });

    if (typeof data.codeVerifier === "string" && data.codeVerifier.trim().length > 0) {
      tokenBody.set("code_verifier", data.codeVerifier.trim());
    }

    const tokenPayload = await this.exchangeOAuthToken({
      provider: "Google",
      tokenEndpoint: GOOGLE_TOKEN_ENDPOINT,
      body: tokenBody,
    });

    const accessToken = this.readString(tokenPayload, "access_token");

    if (!accessToken) {
      throw new HttpError(401, "Google OAuth authentication failed.");
    }

    const profileResponse = await fetch(GOOGLE_USERINFO_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const profilePayload = await this.readJsonObject(profileResponse);

    if (!profileResponse.ok) {
      this.app.log.warn(
        {
          provider: "Google",
          statusCode: profileResponse.status,
          oauthError: this.readString(profilePayload, "error"),
          oauthErrorDescription: this.readString(profilePayload, "error_description"),
        },
        "Google user info lookup failed.",
      );

      throw new HttpError(401, "Google OAuth authentication failed.");
    }

    const email = this.readString(profilePayload, "email");
    const emailVerified = this.readBoolean(profilePayload, "email_verified");

    if (!email || emailVerified !== true) {
      throw new HttpError(401, "Google account email is missing or unverified.");
    }

    const oauthUserProfile = this.buildOAuthUserProfile({
      provider: "Google",
      email,
      name: this.readString(profilePayload, "name"),
    });

    return this.loginWithOAuthUser(oauthUserProfile);
  }

  async oauthMicrosoft(data: OAuthCallbackBody): Promise<AuthResult> {
    const microsoftConfig = this.getMicrosoftOAuthConfig();
    const redirectUri = this.resolveOAuthRedirectUri(data.redirectUri, microsoftConfig.redirectUri, "Microsoft");

    const tokenBody = new URLSearchParams({
      client_id: microsoftConfig.clientId,
      client_secret: microsoftConfig.clientSecret,
      code: data.code.trim(),
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    });

    if (typeof data.codeVerifier === "string" && data.codeVerifier.trim().length > 0) {
      tokenBody.set("code_verifier", data.codeVerifier.trim());
    }

    const tokenPayload = await this.exchangeOAuthToken({
      provider: "Microsoft",
      tokenEndpoint: `https://login.microsoftonline.com/${encodeURIComponent(microsoftConfig.tenantId)}/oauth2/v2.0/token`,
      body: tokenBody,
    });

    const accessToken = this.readString(tokenPayload, "access_token");

    if (!accessToken) {
      throw new HttpError(401, "Microsoft OAuth authentication failed.");
    }

    const profileResponse = await fetch(MICROSOFT_USERINFO_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const profilePayload = await this.readJsonObject(profileResponse);

    if (!profileResponse.ok) {
      this.app.log.warn(
        {
          provider: "Microsoft",
          statusCode: profileResponse.status,
          oauthError: this.readString(profilePayload, "error"),
          oauthErrorDescription: this.readString(profilePayload, "error_description"),
        },
        "Microsoft user info lookup failed.",
      );

      throw new HttpError(401, "Microsoft OAuth authentication failed.");
    }

    const email =
      this.readString(profilePayload, "email")
      ?? this.readString(profilePayload, "preferred_username")
      ?? this.readString(profilePayload, "upn");

    if (!email) {
      throw new HttpError(401, "Microsoft account email is missing.");
    }

    const oauthUserProfile = this.buildOAuthUserProfile({
      provider: "Microsoft",
      email,
      name: this.readString(profilePayload, "name"),
    });

    return this.loginWithOAuthUser(oauthUserProfile);
  }

  async refresh(refreshToken: string): Promise<AuthResult> {
    const tokenPayload = this.verifyRefreshToken(refreshToken);
    const refreshTokenHash = this.hashToken(refreshToken);

    const session = await this.app.prisma.session.findUnique({
      where: {
        userId_refreshToken: {
          userId: tokenPayload.sub,
          refreshToken: refreshTokenHash,
        },
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!session) {
      throw new HttpError(401, "Invalid refresh token.");
    }

    const user = await this.app.prisma.user.findUnique({
      where: { id: session.userId },
      select: userPublicSelect,
    });

    if (!user) {
      await this.app.prisma.session.delete({ where: { id: session.id } });
      throw new HttpError(401, "User session is no longer valid.");
    }

    const tokens = this.generateTokens({ id: user.id, email: user.email });

    await this.app.prisma.session.update({
      where: { id: session.id },
      data: {
        refreshToken: this.hashToken(tokens.refreshToken),
      },
    });

    return { user, tokens };
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenPayload = this.verifyRefreshToken(refreshToken);

    await this.app.prisma.session.deleteMany({
      where: {
        userId: tokenPayload.sub,
        refreshToken: this.hashToken(refreshToken),
      },
    });
  }

  private verifyRefreshToken(refreshToken: string): TokenPayload {
    try {
      const payload = this.app.jwt.verify<TokenPayload>(refreshToken);

      if (payload.tokenType !== "refresh") {
        throw new HttpError(401, "Invalid token type.");
      }

      return payload;
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }

      throw new HttpError(401, "Invalid or expired refresh token.");
    }
  }

  private async loginWithOAuthUser(profile: OAuthUserProfile): Promise<AuthResult> {
    const user = await this.findOrCreateOAuthUser(profile);
    const tokens = this.generateTokens({ id: user.id, email: user.email });
    await this.createSession(user.id, tokens.refreshToken);

    return {
      user,
      tokens,
    };
  }

  private async findOrCreateOAuthUser(profile: OAuthUserProfile): Promise<PublicUser> {
    const existingUser = await this.app.prisma.user.findUnique({
      where: { email: profile.email },
      select: userPublicSelect,
    });

    if (existingUser) {
      return existingUser;
    }

    try {
      return await this.app.prisma.user.create({
        data: {
          email: profile.email,
          name: profile.name,
          passwordHash: await this.createOAuthPlaceholderPasswordHash(),
        },
        select: userPublicSelect,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const raceRecoveredUser = await this.app.prisma.user.findUnique({
          where: { email: profile.email },
          select: userPublicSelect,
        });

        if (raceRecoveredUser) {
          return raceRecoveredUser;
        }
      }

      throw error;
    }
  }

  private getGoogleOAuthConfig(): OAuthProviderConfig {
    if (!env.googleOAuthClientId || !env.googleOAuthClientSecret) {
      throw new HttpError(503, "Google OAuth is not configured.");
    }

    return {
      clientId: env.googleOAuthClientId,
      clientSecret: env.googleOAuthClientSecret,
      redirectUri: env.googleOAuthRedirectUri,
    };
  }

  private getMicrosoftOAuthConfig(): MicrosoftOAuthProviderConfig {
    if (!env.microsoftOAuthClientId || !env.microsoftOAuthClientSecret) {
      throw new HttpError(503, "Microsoft OAuth is not configured.");
    }

    return {
      clientId: env.microsoftOAuthClientId,
      clientSecret: env.microsoftOAuthClientSecret,
      redirectUri: env.microsoftOAuthRedirectUri,
      tenantId: env.microsoftOAuthTenantId,
    };
  }

  private resolveOAuthRedirectUri(
    requestRedirectUri: string | undefined,
    configuredRedirectUri: string | null,
    provider: OAuthProviderName,
  ): string {
    const normalizedRequestRedirectUri =
      typeof requestRedirectUri === "string" && requestRedirectUri.trim().length > 0
        ? this.normalizeRedirectUri(requestRedirectUri, `${provider} redirectUri`)
        : null;

    if (configuredRedirectUri && normalizedRequestRedirectUri && configuredRedirectUri !== normalizedRequestRedirectUri) {
      throw new HttpError(400, `${provider} redirect URI does not match configured value.`);
    }

    const resolvedRedirectUri = normalizedRequestRedirectUri ?? configuredRedirectUri;

    if (!resolvedRedirectUri) {
      throw new HttpError(400, `${provider} redirect URI is required.`);
    }

    return resolvedRedirectUri;
  }

  private async exchangeOAuthToken(options: {
    provider: OAuthProviderName;
    tokenEndpoint: string;
    body: URLSearchParams;
  }): Promise<Record<string, unknown>> {
    const response = await fetch(options.tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: options.body.toString(),
    });

    const payload = await this.readJsonObject(response);

    if (!response.ok) {
      this.app.log.warn(
        {
          provider: options.provider,
          statusCode: response.status,
          oauthError: this.readString(payload, "error"),
          oauthErrorDescription: this.readString(payload, "error_description"),
        },
        `${options.provider} token exchange failed.`,
      );

      throw new HttpError(401, `${options.provider} OAuth authentication failed.`);
    }

    return payload;
  }

  private buildOAuthUserProfile(profile: {
    provider: OAuthProviderName;
    email: string;
    name?: string;
  }): OAuthUserProfile {
    const normalizedEmail = this.normalizeEmail(profile.email);

    if (!normalizedEmail) {
      throw new HttpError(401, `${profile.provider} account email is missing.`);
    }

    return {
      email: normalizedEmail,
      name: this.normalizeName(profile.name),
    };
  }

  private async readJsonObject(response: { json: () => Promise<unknown> }): Promise<Record<string, unknown>> {
    try {
      const payload = await response.json();

      if (payload && typeof payload === "object" && !Array.isArray(payload)) {
        return payload as Record<string, unknown>;
      }

      return {};
    } catch {
      return {};
    }
  }

  private readString(payload: Record<string, unknown>, key: string): string | undefined {
    const value = payload[key];

    if (typeof value !== "string") {
      return undefined;
    }

    const normalized = value.trim();

    if (!normalized) {
      return undefined;
    }

    return normalized;
  }

  private readBoolean(payload: Record<string, unknown>, key: string): boolean | undefined {
    const value = payload[key];

    return typeof value === "boolean" ? value : undefined;
  }

  private normalizeRedirectUri(value: string, fieldName: string): string {
    try {
      return new URL(value.trim()).toString();
    } catch {
      throw new HttpError(400, `${fieldName} must be a valid URL.`);
    }
  }

  private normalizeName(name: string | undefined): string | null {
    if (typeof name !== "string") {
      return null;
    }

    const normalized = name.trim();

    return normalized || null;
  }

  private async createOAuthPlaceholderPasswordHash(): Promise<string> {
    return this.hashPassword(randomBytes(32).toString("hex"));
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
  }

  private async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  private generateTokens(user: { id: string; email: string }): AuthTokens {
    const basePayload = {
      sub: user.id,
      email: user.email,
    };

    const accessToken = this.app.jwt.sign(
      {
        ...basePayload,
        tokenType: "access",
        tokenId: randomUUID(),
      },
      {
        expiresIn: env.accessTokenTtl,
      },
    );

    const refreshToken = this.app.jwt.sign(
      {
        ...basePayload,
        tokenType: "refresh",
        tokenId: randomUUID(),
      },
      {
        expiresIn: env.refreshTokenTtl,
      },
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  private async createSession(userId: string, refreshToken: string): Promise<void> {
    await this.app.prisma.session.create({
      data: {
        userId,
        refreshToken: this.hashToken(refreshToken),
      },
    });
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private toPublicUser(user: UserWithPassword): PublicUser {
    const { passwordHash, ...publicUser } = user;
    return publicUser;
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }
}
