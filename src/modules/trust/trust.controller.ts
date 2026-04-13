import { FastifyReply, FastifyRequest } from "fastify";

import { getErrorDetails } from "../../utils/http-error";
import { RecalculateTrustScoreBody, RecalculateTrustScoreParams } from "./trust.schema";
import { TrustService } from "./trust.service";

export class TrustController {
  constructor(private readonly trustService: TrustService) { }

  recalculateTrustScore = async (
    request: FastifyRequest<{ Params: RecalculateTrustScoreParams; Body: RecalculateTrustScoreBody }>,
    reply: FastifyReply,
  ): Promise<void> => {
    try {
      const result = await this.trustService.recalculateTrustScore({
        userId: request.params.userId,
        event: request.body?.event,
        connections: request.body?.connections,
        reports: request.body?.reports,
      });

      reply.status(200).send({
        success: true,
        message: "Trust score recalculated.",
        data: result,
      });
    } catch (error) {
      const { statusCode, message } = getErrorDetails(error);
      reply.status(statusCode).send({ success: false, message });
    }
  };
}