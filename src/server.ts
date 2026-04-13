import { buildApp } from "./app";
import { env } from "./config/env";

const start = async () => {
  const app = buildApp();

  try {
    await app.listen({
      port: env.port,
      host: "0.0.0.0",
    });

    app.log.info(`Server running on port ${env.port}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

void start();
