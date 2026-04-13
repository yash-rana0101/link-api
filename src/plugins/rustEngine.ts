import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

import { env } from "../config/env";
import { RustEngineClient } from "../utils/rust-engine-client";

const rustEnginePlugin: FastifyPluginAsync = fp(async (app) => {
  const rustEngine = new RustEngineClient(env.rustServiceUrl, app.log);

  app.decorate("rustEngine", rustEngine);

  try {
    await rustEngine.healthcheck();
    app.log.info({ rustServiceUrl: env.rustServiceUrl }, "Rust trust engine is reachable.");
  } catch (error) {
    app.log.warn(
      {
        err: error,
        rustServiceUrl: env.rustServiceUrl,
      },
      "Rust trust engine is unreachable at startup. Falling back to safe Node behavior.",
    );
  }
});

export default rustEnginePlugin;
