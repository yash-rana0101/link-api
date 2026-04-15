import { FastifyReply, FastifyRequest } from "fastify";

import { getErrorDetails } from "../../utils/http-error";
import { CreateProfileReportBody } from "./reports.schema";
import { ReportService } from "./reports.service";

export class ReportController {
  constructor(private readonly reportService: ReportService) { }

  createProfileReport = async (
    request: FastifyRequest<{ Body: CreateProfileReportBody }>,
    reply: FastifyReply,
  ): Promise<void> => {
    try {
      const report = await this.reportService.createProfileReport(request.body, request.user.sub);

      reply.status(201).send({
        success: true,
        message: "Profile report submitted.",
        data: report,
      });
    } catch (error) {
      request.log.error(
        {
          err: error,
          reportedUserId: request.body.reportedUserId,
        },
        "Failed to submit profile report.",
      );

      const { statusCode, message } = getErrorDetails(error);
      reply.status(statusCode).send({ success: false, message });
    }
  };
}
