import { Injectable } from '@nestjs/common';
import { GtfsParseResult } from '../types/gtfs-parse-result.type';
import { GtfsImportResult } from '../types/gtfs-import-result.type';

@Injectable()
export class GtfsImportMapper {
  toImportResult(
    source: string,
    parseResult: GtfsParseResult,
    errors: string[],
  ): GtfsImportResult {
    return {
      success: errors.length === 0,
      source,
      summary: {
        agenciesImported: parseResult.agencies.length,
        stopsImported: parseResult.stops.length,
        routesImported: parseResult.routes.length,
        calendarsImported: 0,
        tripsImported: 0,
        stopTimesImported: 0,
        calendarDatesImported: 0,
        shapesImported: 0,
        warnings: [],
        errors,
      },
    };
  }
}
