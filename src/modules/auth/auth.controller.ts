import { FastifyReply, FastifyRequest } from "fastify";

import { getErrorDetails } from "../../utils/http-error";
import { LoginBody, LogoutBody, OAuthCallbackBody, RefreshBody, SignupBody } from "./auth.schema";
import { AuthService } from "./auth.service";

export class AuthController {
  constructor(private readonly authService: AuthService) { }

  signup = async (request: FastifyRequest<{ Body: SignupBody }>, reply: FastifyReply): Promise<void> => {
    try {
      const result = await this.authService.signup(request.body);

      reply.status(201).send({
        success: true,
        message: "Signup successful.",
        data: result,
      });
    } catch (error) {
      const { statusCode, message } = getErrorDetails(error);
      reply.status(statusCode).send({ success: false, message });
    }
  };

  login = async (request: FastifyRequest<{ Body: LoginBody }>, reply: FastifyReply): Promise<void> => {
    try {
      const result = await this.authService.login(request.body);

      reply.status(200).send({
        success: true,
        message: "Login successful.",
        data: result,
      });
    } catch (error) {
      const { statusCode, message } = getErrorDetails(error);
      reply.status(statusCode).send({ success: false, message });
    }
  };

  refresh = async (request: FastifyRequest<{ Body: RefreshBody }>, reply: FastifyReply): Promise<void> => {
    try {
      const result = await this.authService.refresh(request.body.refreshToken);

      reply.status(200).send({
        success: true,
        message: "Token refreshed.",
        data: result,
      });
    } catch (error) {
      const { statusCode, message } = getErrorDetails(error);
      reply.status(statusCode).send({ success: false, message });
    }
  };

  logout = async (request: FastifyRequest<{ Body: LogoutBody }>, reply: FastifyReply): Promise<void> => {
    try {
      await this.authService.logout(request.body.refreshToken);

      reply.status(200).send({
        success: true,
        message: "Logout successful.",
      });
    } catch (error) {
      const { statusCode, message } = getErrorDetails(error);
      reply.status(statusCode).send({ success: false, message });
    }
  };

  oauthGoogle = async (
    request: FastifyRequest<{ Body: OAuthCallbackBody }>,
    reply: FastifyReply,
  ): Promise<void> => {
    try {
      const result = await this.authService.oauthGoogle(request.body);

      reply.status(200).send({
        success: true,
        message: "Google authentication successful.",
        data: result,
      });
    } catch (error) {
      const { statusCode, message } = getErrorDetails(error);
      reply.status(statusCode).send({ success: false, message });
    }
  };

  oauthMicrosoft = async (
    request: FastifyRequest<{ Body: OAuthCallbackBody }>,
    reply: FastifyReply,
  ): Promise<void> => {
    try {
      const result = await this.authService.oauthMicrosoft(request.body);

      reply.status(200).send({
        success: true,
        message: "Microsoft authentication successful.",
        data: result,
      });
    } catch (error) {
      const { statusCode, message } = getErrorDetails(error);
      reply.status(statusCode).send({ success: false, message });
    }
  };
}
