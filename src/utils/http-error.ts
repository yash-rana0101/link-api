import { Prisma } from "@prisma/client";

export class HttpError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
  }
}

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

export const getErrorDetails = (error: unknown): { statusCode: number; message: string } => {
  if (error instanceof HttpError) {
    return {
      statusCode: error.statusCode,
      message: error.message,
    };
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return mapPrismaError(error);
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return {
      statusCode: 503,
      message: "Database connection failed. Check DATABASE_URL and database availability.",
    };
  }

  return {
    statusCode: 500,
    message: "Internal server error.",
  };
};
