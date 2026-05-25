import { ImportJobStatus } from '../../enums/import-status.enum';

export type ImportJobEntity = {
  id: string;
  feedSourceId: string;
  status: ImportJobStatus;
  startedAt: Date;
  finishedAt: Date | null;
  summary: Record<string, unknown> | null;
  error: string | null;
  createdAt: Date;
};
