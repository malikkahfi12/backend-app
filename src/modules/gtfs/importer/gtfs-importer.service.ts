import { Injectable } from '@nestjs/common';
import { GtfsZipExtractorService } from './gtfs-zip-extractor.service';
import { GtfsFileValidatorService } from './gtfs-file-validator.service';
import { GtfsImportResult } from '../types/gtfs-import-result.type';

@Injectable()
export class GtfsImporterService {
  constructor(
    private readonly zipExtractor: GtfsZipExtractorService,
    private readonly fileValidator: GtfsFileValidatorService,
  ) {}

  importFromBuffer(
    buffer: Buffer,
    source: string,
  ): {
    result: GtfsImportResult;
    files: Map<string, Buffer>;
  } {
    const result: GtfsImportResult = {
      success: false,
      source,
      summary: {
        agenciesImported: 0,
        stopsImported: 0,
        routesImported: 0,
        calendarsImported: 0,
        tripsImported: 0,
        stopTimesImported: 0,
        calendarDatesImported: 0,
        shapesImported: 0,
        warnings: [],
        errors: [],
      },
    };

    const files = this.zipExtractor.extract(buffer);
    const validation = this.fileValidator.validate(files);

    if (!validation.valid) {
      result.summary.errors.push(...validation.errors);
      return { result, files };
    }

    result.success = true;
    return { result, files };
  }
}
