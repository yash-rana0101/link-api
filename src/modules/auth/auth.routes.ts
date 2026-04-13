import { FastifyPluginAsync } from "fastify";

import { createRateLimitPreHandler } from "../../middlewares/rate-limit";
import { AuthController } from "./auth.controller";
import {
  LoginBody,
  LogoutBody,
  OAuthCallbackBody,
  RefreshBody,
  SignupBody,
  loginSchema,
  logoutSchema,
  oauthCallbackSchema,
  refreshSchema,
  signupSchema,
} from "./auth.schema";
import { AuthService } from "./auth.service";

export const authRoutes: FastifyPluginAsync = async (app) => {
  const authService = new AuthService(app);
  const authController = new AuthController(authService);

  const signupRateLimit = createRateLimitPreHandler(app, {
    endpoint: "auth:signup",
    maxRequests: 5,
    windowSeconds: 300,
  });

  const loginRateLimit = createRateLimitPreHandler(app, {
    endpoint: "auth:login",
    maxRequests: 10,
    windowSeconds: 60,
  });

  const refreshRateLimit = createRateLimitPreHandler(app, {
    endpoint: "auth:refresh",
    maxRequests: 20,
    windowSeconds: 60,
  });

  const logoutRateLimit = createRateLimitPreHandler(app, {
    endpoint: "auth:logout",
    maxRequests: 30,
    windowSeconds: 60,
  });

  const googleOauthRateLimit = createRateLimitPreHandler(app, {
    endpoint: "auth:oauth:google",
    maxRequests: 15,
    windowSeconds: 60,
  });

  const microsoftOauthRateLimit = createRateLimitPreHandler(app, {
    endpoint: "auth:oauth:microsoft",
    maxRequests: 15,
    windowSeconds: 60,
  });

  app.post<{ Body: SignupBody }>(
    "/signup",
    { preHandler: signupRateLimit, schema: signupSchema },
    authController.signup,
  );

  app.post<{ Body: LoginBody }>(
    "/login",
    { preHandler: loginRateLimit, schema: loginSchema },
    authController.login,
  );

  app.post<{ Body: RefreshBody }>(
    "/refresh",
    { preHandler: refreshRateLimit, schema: refreshSchema },
    authController.refresh,
  );

  app.post<{ Body: LogoutBody }>(
    "/logout",
    { preHandler: logoutRateLimit, schema: logoutSchema },
    authController.logout,
  );

  app.post<{ Body: OAuthCallbackBody }>(
    "/oauth/google",
    { preHandler: googleOauthRateLimit, schema: oauthCallbackSchema },
    authController.oauthGoogle,
  );

  app.post<{ Body: OAuthCallbackBody }>(
    "/oauth/microsoft",
    { preHandler: microsoftOauthRateLimit, schema: oauthCallbackSchema },
    authController.oauthMicrosoft,
  );
};
