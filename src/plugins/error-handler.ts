import { Prisma } from "@prisma/client";
import { FastifyError, FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

import { HttpError } from "../utils/http-error";

const errorHandlerPlugin: FastifyPluginAsync = fp(async (app) => {
  app.setErrorHandler((error: FastifyError, request, reply) => {
    const path = request.url.split("?")[0];
    const requestMeta = {
      reqId: request.id,
      method: request.method,
      path,
    };

    if (error.validation) {
      app.log.warn(
        {
          ...requestMeta,
          issues: error.validation,
        },
        "Request validation failed.",
      );

      reply.status(400).send({
        success: false,
        message: "Request validation failed.",
      });
      return;
    }

    if (error instanceof HttpError) {
      app.log.warn(
        {
          ...requestMeta,
          statusCode: error.statusCode,
          message: error.message,
        },
        "Request rejected.",
      );

      reply.status(error.statusCode).send({
        success: false,
        message: error.message,
      });
      return;
    }

    if (isJwtError(error)) {
      app.log.warn(
        {
          ...requestMeta,
          code: error.code,
        },
        "Authentication failed.",
      );

      reply.status(401).send({
        success: false,
        message: "Unauthorized.",
      });
      return;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      const prismaClientError = mapPrismaError(error);

      app.log.warn(
        {
          ...requestMeta,
          code: error.code,
          statusCode: prismaClientError.statusCode,
          detail: prismaClientError.message,
        },
        "Database request failed.",
      );

      reply.status(prismaClientError.statusCode).send({
        success: false,
        message: prismaClientError.message,
      });
      return;
    }

    const statusCode = normalizeStatusCode(error.statusCode);

    if (statusCode >= 400 && statusCode < 500) {
      app.log.warn(
        {
          ...requestMeta,
          statusCode,
          code: error.code,
          message: error.message,
        },
        "Client request failed.",
      );

      reply.status(statusCode).send({
        success: false,
        message: error.message || "Request failed.",
      });
      return;
    }

    app.log.error(
      {
        ...requestMeta,
        err: error,
      },
      "Unhandled server error.",
    );

    reply.status(500).send({
      success: false,
      message: "Internal server error.",
    });
  });
});

const isJwtError = (error: FastifyError): boolean => {
  return typeof error.code === "string" && error.code.startsWith("FST_JWT_");
};

const mapPrismaError = (error: Prisma.PrismaClientKnownRequestError): { statusCode: number; message: string } => {
  if (error.code === "P2002") {
    return {
      statusCode: 409,
      message: "A resource with the same unique value already exists.",
    };
  }

  if (error.code === "P2025") {
    return {
      statusCode: 404,
      message: "Requested resource was not found.",
    };
  }

  if (error.code === "P2021" || error.code === "P2022") {
    return {
      statusCode: 503,
      message: "Database schema is out of date. Run Prisma migrations and restart the API.",
    };
  }

  return {
    statusCode: 500,
    message: "Database operation failed.",
  };
};

const normalizeStatusCode = (value: number | undefined): number => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 500;
  }

  if (value < 400 || value > 599) {
    return 500;
  }

  return Math.floor(value);
};

export default errorHandlerPlugin;
