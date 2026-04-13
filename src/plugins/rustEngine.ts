import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

import { env } from "../config/env";
import { RustEngineClient } from "../utils/rust-engine-client";

const rustEnginePlugin: FastifyPluginAsync = fp(async (app) => {
  const rustEngine = new RustEngineClient(env.rustServiceUrl, app.log);

  app.decorate("rustEngine", rustEngine);

  try {
    await rustEngine.healthcheck({ silent: true });
    app.log.info({ rustServiceUrl: env.rustServiceUrl }, "Rust trust engine is reachable.");
  } catch {
    app.log.info(
      {
        rustServiceUrl: env.rustServiceUrl,
      },
      "Rust trust engine is not running at startup. Continuing with fallback behavior.",
    );
  }
});

export default rustEnginePlugin;
