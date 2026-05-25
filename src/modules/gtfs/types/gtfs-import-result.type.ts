export interface GtfsImportResult {
  success: boolean;
  source: string;
  summary: {
    agenciesImported: number;
    stopsImported: number;
    routesImported: number;
    calendarsImported: number;
    tripsImported: number;
    stopTimesImported: number;
    calendarDatesImported: number;
    shapesImported: number;
    warnings: string[];
    errors: string[];
  };
}
