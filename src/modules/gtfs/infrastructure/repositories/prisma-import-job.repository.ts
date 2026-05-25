import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import {
  ImportJobRepository,
  CreateImportJobInput,
} from '../../domain/repositories/import-job.repository.interface';
import { ImportJobEntity } from '../../domain/entities/import-job.entity';
import { ImportJobStatus } from '../../enums/import-status.enum';
import { Prisma } from '@prisma/client';

@Injectable()
export class PrismaImportJobRepository implements ImportJobRepository {
  constructor(private readonly prismaService: PrismaService) {}

  create(input: CreateImportJobInput): Promise<ImportJobEntity> {
    return this.prismaService.importJob.create({
      data: input,
    }) as unknown as Promise<ImportJobEntity>;
  }

  async updateStatus(
    id: string,
    status: ImportJobStatus,
    data?: {
      finishedAt?: Date;
      summary?: Record<string, unknown> | null;
      error?: string | null;
    },
  ): Promise<ImportJobEntity> {
    const updateData: Prisma.ImportJobUpdateInput = { status };
    if (data?.finishedAt) updateData.finishedAt = data.finishedAt;
    if (data?.summary !== undefined)
      updateData.summary = data.summary as Prisma.InputJsonValue;
    if (data?.error !== undefined) updateData.error = data.error;

    return this.prismaService.importJob.update({
      where: { id },
      data: updateData,
    }) as unknown as Promise<ImportJobEntity>;
  }

  findById(id: string): Promise<ImportJobEntity | null> {
    return this.prismaService.importJob.findUnique({
      where: { id },
    }) as unknown as Promise<ImportJobEntity | null>;
  }

  findByFeedSource(feedSourceId: string): Promise<ImportJobEntity[]> {
    return this.prismaService.importJob.findMany({
      where: { feedSourceId },
      orderBy: { startedAt: 'desc' },
    }) as unknown as Promise<ImportJobEntity[]>;
  }
}
