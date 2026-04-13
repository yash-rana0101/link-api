import { Prisma } from "@prisma/client";
import { FastifyInstance } from "fastify";

const artifactSelect = {
  id: true,
  type: true,
  url: true,
  createdAt: true,
} satisfies Prisma.ArtifactSelect;

const experienceSelect = {
  id: true,
  userId: true,
  companyName: true,
  role: true,
  description: true,
  status: true,
  startDate: true,
  endDate: true,
  createdAt: true,
  artifacts: {
    select: artifactSelect,
  },
} satisfies Prisma.ExperienceSelect;

export type ExperienceRecord = Prisma.ExperienceGetPayload<{
  select: typeof experienceSelect;
}>;

export type ArtifactRecord = Prisma.ArtifactGetPayload<{
  select: typeof artifactSelect;
}>;

export class ExperienceRepository {
  constructor(private readonly app: FastifyInstance) { }

  createExperience(data: Prisma.ExperienceUncheckedCreateInput): Promise<ExperienceRecord> {
    return this.app.prisma.experience.create({
      data,
      select: experienceSelect,
    });
  }

  findExperienceById(id: string): Promise<ExperienceRecord | null> {
    return this.app.prisma.experience.findUnique({
      where: { id },
      select: experienceSelect,
    });
  }

  findExperiencesByUserId(userId: string): Promise<ExperienceRecord[]> {
    return this.app.prisma.experience.findMany({
      where: { userId },
      orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
      select: experienceSelect,
    });
  }

  updateExperience(id: string, data: Prisma.ExperienceUncheckedUpdateInput): Promise<ExperienceRecord> {
    return this.app.prisma.experience.update({
      where: { id },
      data,
      select: experienceSelect,
    });
  }

  async deleteExperience(id: string): Promise<void> {
    await this.app.prisma.experience.delete({
      where: { id },
    });
  }

  createArtifact(data: Prisma.ArtifactUncheckedCreateInput): Promise<ArtifactRecord> {
    return this.app.prisma.artifact.create({
      data,
      select: artifactSelect,
    });
  }
}