import { FastifyPluginAsync } from "fastify";

import { UserController } from "./user.controller";
import { UpdateProfileBody, updateProfileSchema } from "./user.schema";
import { UserService } from "./user.service";

export const userRoutes: FastifyPluginAsync = async (app) => {
  const userService = new UserService(app);
  const userController = new UserController(userService);

  app.get("/me", { preHandler: [app.authenticate] }, userController.getMe);

  app.patch<{ Body: UpdateProfileBody }>(
    "/update",
    {
      preHandler: [app.authenticate],
      schema: updateProfileSchema,
    },
    userController.updateProfile,
  );
};
