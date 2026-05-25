import { Inject, Injectable } from '@nestjs/common';
import { ImportJobEntity } from '../../domain/entities/import-job.entity';
import {
  IMPORT_JOB_REPOSITORY,
  CreateImportJobInput,
} from '../../domain/repositories/import-job.repository.interface';
import type { ImportJobRepository } from '../../domain/repositories/import-job.repository.interface';
import { ImportJobStatus } from '../../enums/import-status.enum';

@Injectable()
export class ImportJobService {
  constructor(
    @Inject(IMPORT_JOB_REPOSITORY)
    private readonly importJobRepository: ImportJobRepository,
  ) {}

  create(input: CreateImportJobInput): Promise<ImportJobEntity> {
    return this.importJobRepository.create(input);
  }

  markRunning(id: string): Promise<ImportJobEntity> {
    return this.importJobRepository.updateStatus(id, ImportJobStatus.RUNNING);
  }

  markSuccess(
    id: string,
    summary: Record<string, unknown>,
  ): Promise<ImportJobEntity> {
    return this.importJobRepository.updateStatus(id, ImportJobStatus.SUCCESS, {
      finishedAt: new Date(),
      summary,
    });
  }

  markFailed(id: string, error: string): Promise<ImportJobEntity> {
    return this.importJobRepository.updateStatus(id, ImportJobStatus.FAILED, {
      finishedAt: new Date(),
      error,
    });
  }

  findById(id: string): Promise<ImportJobEntity | null> {
    return this.importJobRepository.findById(id);
  }
}
