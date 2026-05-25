import { GtfsParserService } from './gtfs-parser.service';
import * as path from 'path';

describe('GtfsParserService', () => {
  const service = new GtfsParserService();
  const fixturesDir = path.join(__dirname, '../../../../test/fixtures/gtfs');

  it('parses valid GTFS directory with all 6 files', () => {
    const dirPath = path.join(fixturesDir, 'valid');
    const result = service.parseDirectory(dirPath);

    expect(result.has('agency.txt')).toBe(true);
    expect(result.has('routes.txt')).toBe(true);
    expect(result.has('stops.txt')).toBe(true);
    expect(result.has('trips.txt')).toBe(true);
    expect(result.has('stop_times.txt')).toBe(true);
    expect(result.has('calendar.txt')).toBe(true);

    const agencies = result.get('agency.txt')!;
    expect(agencies.length).toBeGreaterThan(0);
    expect(agencies[0]).toHaveProperty('agency_name');
    expect(agencies[0]).toHaveProperty('agency_url');
  });

  it('handles quoted CSV values', () => {
    const dirPath = path.join(fixturesDir, 'valid');
    const result = service.parseDirectory(dirPath);
    const routes = result.get('routes.txt')!;
    expect(routes[0].route_long_name).toBe(
      'Koridor 1: Lebak Bulus — Bundaran HI',
    );
  });

  it('ignores empty lines', () => {
    const dirPath = path.join(fixturesDir, 'valid');
    const result = service.parseDirectory(dirPath);
    const stops = result.get('stops.txt')!;
    expect(stops.length).toBe(3);
  });

  it('maps columns by header row', () => {
    const dirPath = path.join(fixturesDir, 'valid');
    const result = service.parseDirectory(dirPath);
    const calendar = result.get('calendar.txt')!;
    expect(calendar[0].monday).toBe('1');
    expect(calendar[0].sunday).toBe('0');
  });
});
