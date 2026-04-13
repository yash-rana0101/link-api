import { ExperienceStatus, Prisma } from "@prisma/client";

import { HttpError } from "../../utils/http-error";
import { AddArtifactBody, CreateExperienceBody, UpdateExperienceBody } from "./experience.schema";
import { ArtifactRecord, ExperienceRecord, ExperienceRepository } from "./experience.repository";

export class ExperienceService {
  constructor(private readonly repository: ExperienceRepository) { }

  async createExperience(data: CreateExperienceBody, userId: string): Promise<ExperienceRecord> {
    const companyName = this.requireTrimmedValue(data.companyName, "Company name");
    const role = this.requireTrimmedValue(data.role, "Role");
    const startDate = this.parseDate(data.startDate, "startDate");
    const endDate = this.parseOptionalDate(data.endDate, "endDate");

    this.assertDateRange(startDate, endDate);

    return this.repository.createExperience({
      userId,
      companyName,
      role,
      description: this.normalizeOptionalText(data.description),
      startDate,
      endDate,
      status: ExperienceStatus.SELF_CLAIMED,
    });
  }

  async updateExperience(id: string, data: UpdateExperienceBody, userId: string): Promise<ExperienceRecord> {
    const experience = await this.getOwnedExperience(id, userId);

    const updateData: Prisma.ExperienceUncheckedUpdateInput = {};

    if (typeof data.companyName !== "undefined") {
      updateData.companyName = this.requireTrimmedValue(data.companyName, "Company name");
    }

    if (typeof data.role !== "undefined") {
      updateData.role = this.requireTrimmedValue(data.role, "Role");
    }

    if (typeof data.description !== "undefined") {
      updateData.description = this.normalizeOptionalText(data.description);
    }

    const nextStartDate = typeof data.startDate === "undefined"
      ? experience.startDate
      : this.parseDate(data.startDate, "startDate");

    const nextEndDate = typeof data.endDate === "undefined"
      ? experience.endDate
      : this.parseOptionalDate(data.endDate, "endDate");

    this.assertDateRange(nextStartDate, nextEndDate);

    if (typeof data.startDate !== "undefined") {
      updateData.startDate = nextStartDate;
    }

    if (typeof data.endDate !== "undefined") {
      updateData.endDate = nextEndDate;
    }

    if (Object.keys(updateData).length === 0) {
      return experience;
    }

    return this.repository.updateExperience(id, updateData);
  }

  async deleteExperience(id: string, userId: string): Promise<void> {
    await this.getOwnedExperience(id, userId);
    await this.repository.deleteExperience(id);
  }

  async getExperienceById(id: string): Promise<ExperienceRecord> {
    const experience = await this.repository.findExperienceById(id);

    if (!experience) {
      throw new HttpError(404, "Experience not found.");
    }

    return experience;
  }

  getUserExperiences(userId: string): Promise<ExperienceRecord[]> {
    return this.repository.findExperiencesByUserId(userId);
  }

  async addArtifact(experienceId: string, data: AddArtifactBody, userId: string): Promise<ArtifactRecord> {
    await this.getOwnedExperience(experienceId, userId);

    const url = this.validateUrl(data.url);

    return this.repository.createArtifact({
      experienceId,
      type: data.type,
      url,
    });
  }

  private async getOwnedExperience(id: string, userId: string): Promise<ExperienceRecord> {
    const experience = await this.repository.findExperienceById(id);

    if (!experience) {
      throw new HttpError(404, "Experience not found.");
    }

    if (experience.userId !== userId) {
      throw new HttpError(403, "You are not allowed to modify this experience.");
    }

    return experience;
  }

  private requireTrimmedValue(value: string, fieldName: string): string {
    const trimmed = value.trim();

    if (!trimmed) {
      throw new HttpError(400, `${fieldName} is required.`);
    }

    return trimmed;
  }

  private normalizeOptionalText(value: string | null | undefined): string | null {
    if (typeof value === "undefined" || value === null) {
      return null;
    }

    const trimmed = value.trim();

    return trimmed ? trimmed : null;
  }

  private parseDate(value: string, fieldName: string): Date {
    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
      throw new HttpError(400, `${fieldName} must be a valid date.`);
    }

    return parsedDate;
  }

  private parseOptionalDate(value: string | null | undefined, fieldName: string): Date | null {
    if (typeof value === "undefined" || value === null) {
      return null;
    }

    return this.parseDate(value, fieldName);
  }

  private assertDateRange(startDate: Date, endDate: Date | null): void {
    if (endDate && endDate < startDate) {
      throw new HttpError(400, "endDate cannot be earlier than startDate.");
    }
  }

  private validateUrl(url: string): string {
    const normalized = this.requireTrimmedValue(url, "Artifact URL");

    try {
      const parsedUrl = new URL(normalized);

      if (!parsedUrl.protocol.startsWith("http")) {
        throw new HttpError(400, "Artifact URL must start with http or https.");
      }

      return parsedUrl.toString();
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }

      throw new HttpError(400, "Artifact URL must be a valid URL.");
    }
  }
}