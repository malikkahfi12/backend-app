import { GtfsValidatorService } from './gtfs-validator.service';

describe('GtfsValidatorService', () => {
  const service = new GtfsValidatorService();

  it('detects missing required file', () => {
    const fileData = new Map<string, Record<string, string>[]>();
    fileData.set('agency.txt', []);

    const result = service.validate(fileData);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Missing required file'))).toBe(
      true,
    );
  });

  it('detects missing required column', () => {
    const fileData = new Map<string, Record<string, string>[]>();
    fileData.set('agency.txt', [{}]);
    fileData.set('routes.txt', [{}]);
    fileData.set('stops.txt', [{ stop_name: 'X' }]);
    fileData.set('trips.txt', [{}]);
    fileData.set('stop_times.txt', [{}]);
    fileData.set('calendar.txt', [{}]);

    const result = service.validate(fileData);
    expect(result.valid).toBe(false);
  });

  it('rejects invalid GTFS time format', () => {
    const fileData = new Map<string, Record<string, string>[]>();
    fileData.set('agency.txt', [
      { agency_name: 'X', agency_url: 'X', agency_timezone: 'X' },
    ]);
    fileData.set('routes.txt', [
      {
        route_id: '1',
        route_short_name: 'X',
        route_long_name: 'X',
        route_type: '1',
      },
    ]);
    fileData.set('stops.txt', [
      { stop_id: '1', stop_name: 'X', stop_lat: '0', stop_lon: '0' },
    ]);
    fileData.set('trips.txt', [
      { route_id: '1', service_id: '1', trip_id: '1' },
    ]);
    fileData.set('calendar.txt', [
      {
        service_id: '1',
        monday: '1',
        tuesday: '0',
        wednesday: '0',
        thursday: '0',
        friday: '0',
        saturday: '0',
        sunday: '0',
        start_date: '20260101',
        end_date: '20261231',
      },
    ]);
    fileData.set('stop_times.txt', [
      {
        trip_id: '1',
        arrival_time: 'invalid',
        departure_time: '08:00:00',
        stop_id: '1',
        stop_sequence: '1',
      },
    ]);

    const result = service.validate(fileData);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('invalid arrival_time'))).toBe(
      true,
    );
  });

  it('rejects invalid latitude/longitude', () => {
    const fileData = new Map<string, Record<string, string>[]>();
    fileData.set('agency.txt', [
      { agency_name: 'X', agency_url: 'X', agency_timezone: 'X' },
    ]);
    fileData.set('routes.txt', [
      {
        route_id: '1',
        route_short_name: 'X',
        route_long_name: 'X',
        route_type: '1',
      },
    ]);
    fileData.set('trips.txt', [
      { route_id: '1', service_id: '1', trip_id: '1' },
    ]);
    fileData.set('stop_times.txt', [
      {
        trip_id: '1',
        arrival_time: '08:00:00',
        departure_time: '08:01:00',
        stop_id: '1',
        stop_sequence: '1',
      },
    ]);
    fileData.set('calendar.txt', [
      {
        service_id: '1',
        monday: '1',
        tuesday: '0',
        wednesday: '0',
        thursday: '0',
        friday: '0',
        saturday: '0',
        sunday: '0',
        start_date: '20260101',
        end_date: '20261231',
      },
    ]);
    fileData.set('stops.txt', [
      { stop_id: '1', stop_name: 'Bad', stop_lat: '100', stop_lon: '200' },
    ]);

    const result = service.validate(fileData);
    expect(result.valid).toBe(false);
  });

  it('rejects calendar with end_date before start_date', () => {
    const fileData = new Map<string, Record<string, string>[]>();
    fileData.set('agency.txt', [
      { agency_name: 'X', agency_url: 'X', agency_timezone: 'X' },
    ]);
    fileData.set('routes.txt', [
      {
        route_id: '1',
        route_short_name: 'X',
        route_long_name: 'X',
        route_type: '1',
      },
    ]);
    fileData.set('stops.txt', [
      { stop_id: '1', stop_name: 'X', stop_lat: '0', stop_lon: '0' },
    ]);
    fileData.set('trips.txt', [
      { route_id: '1', service_id: '1', trip_id: '1' },
    ]);
    fileData.set('stop_times.txt', [
      {
        trip_id: '1',
        arrival_time: '08:00:00',
        departure_time: '08:01:00',
        stop_id: '1',
        stop_sequence: '1',
      },
    ]);
    fileData.set('calendar.txt', [
      {
        service_id: '1',
        monday: '1',
        tuesday: '0',
        wednesday: '0',
        thursday: '0',
        friday: '0',
        saturday: '0',
        sunday: '0',
        start_date: '20261231',
        end_date: '20260101',
      },
    ]);

    const result = service.validate(fileData);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('start_date'))).toBe(true);
  });

  it('accepts valid GTFS times with hours > 24', () => {
    const fileData = new Map<string, Record<string, string>[]>();
    fileData.set('agency.txt', [
      { agency_name: 'X', agency_url: 'X', agency_timezone: 'X' },
    ]);
    fileData.set('routes.txt', [
      {
        route_id: '1',
        route_short_name: 'X',
        route_long_name: 'X',
        route_type: '1',
      },
    ]);
    fileData.set('stops.txt', [
      { stop_id: '1', stop_name: 'X', stop_lat: '0', stop_lon: '0' },
    ]);
    fileData.set('trips.txt', [
      { route_id: '1', service_id: '1', trip_id: '1' },
    ]);
    fileData.set('calendar.txt', [
      {
        service_id: '1',
        monday: '1',
        tuesday: '0',
        wednesday: '0',
        thursday: '0',
        friday: '0',
        saturday: '0',
        sunday: '0',
        start_date: '20260101',
        end_date: '20261231',
      },
    ]);
    fileData.set('stop_times.txt', [
      {
        trip_id: '1',
        arrival_time: '25:10:00',
        departure_time: '25:11:00',
        stop_id: '1',
        stop_sequence: '1',
      },
    ]);

    const result = service.validate(fileData);
    expect(result.valid).toBe(true);
  });
});
