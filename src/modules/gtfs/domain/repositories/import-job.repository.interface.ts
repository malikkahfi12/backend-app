import { ImportJobEntity } from '../entities/import-job.entity';
import { ImportJobStatus } from '../../enums/import-status.enum';

export const IMPORT_JOB_REPOSITORY = Symbol('IMPORT_JOB_REPOSITORY');

export type CreateImportJobInput = {
  feedSourceId: string;
};

export interface ImportJobRepository {
  create(input: CreateImportJobInput): Promise<ImportJobEntity>;
  updateStatus(
    id: string,
    status: ImportJobStatus,
    data?: {
      finishedAt?: Date;
      summary?: Record<string, unknown> | null;
      error?: string | null;
    },
  ): Promise<ImportJobEntity>;
  findById(id: string): Promise<ImportJobEntity | null>;
  findByFeedSource(feedSourceId: string): Promise<ImportJobEntity[]>;
}
