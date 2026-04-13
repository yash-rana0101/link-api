import { createHash, randomUUID } from "node:crypto";

import bcrypt from "bcrypt";
import { Prisma } from "@prisma/client";
import { FastifyInstance } from "fastify";

import { env } from "../../config/env";
import { HttpError } from "../../utils/http-error";
import { LoginBody, SignupBody } from "./auth.schema";

const PASSWORD_SALT_ROUNDS = 12;

const userPublicSelect = {
  id: true,
  email: true,
  name: true,
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
