import { ImportJobStatus } from '../../enums/import-status.enum';

describe('ImportJobStatus', () => {
  it('has all required states', () => {
    expect(ImportJobStatus.PENDING).toBe('PENDING');
    expect(ImportJobStatus.RUNNING).toBe('RUNNING');
    expect(ImportJobStatus.SUCCESS).toBe('SUCCESS');
    expect(ImportJobStatus.FAILED).toBe('FAILED');
  });
});
