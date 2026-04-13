import { FastifyPluginAsync } from "fastify";

import { AuthController } from "./auth.controller";
import { loginSchema, logoutSchema, refreshSchema, signupSchema } from "./auth.schema";
import { AuthService } from "./auth.service";

export const authRoutes: FastifyPluginAsync = async (app) => {
  const authService = new AuthService(app);
  const authController = new AuthController(authService);

  app.post("/signup", { schema: signupSchema }, authController.signup);
  app.post("/login", { schema: loginSchema }, authController.login);
  app.post("/refresh", { schema: refreshSchema }, authController.refresh);
  app.post("/logout", { schema: logoutSchema }, authController.logout);
};
