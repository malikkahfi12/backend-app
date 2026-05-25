import { OsmQaService } from '../services/osm-qa.service';
import { PrismaService } from '@/infrastructure/database/prisma.service';

describe('OsmQaService', () => {
  const createMockPrisma = (overrides: Record<string, unknown> = {}) =>
    ({
      $queryRawUnsafe: jest.fn().mockResolvedValue([]),
      $executeRawUnsafe: jest.fn().mockResolvedValue(undefined),
      $transaction: jest.fn((fn: (tx: unknown) => Promise<void>) => {
        const tx = {
          routeStop: {
            delete: jest.fn(),
            update: jest.fn(),
          },
        };
        return fn(tx);
      }),
      ...overrides,
    }) as unknown as PrismaService;

  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let service: OsmQaService;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    service = new OsmQaService(mockPrisma);
    jest.clearAllMocks();
  });

  describe('runQaChecks', () => {
    it('returns empty issues when no OSM routes exist', async () => {
      const result = await service.runQaChecks();

      expect(result.totalRoutesChecked).toBe(0);
      expect(result.issues).toHaveLength(0);
    });

    it('runs selected checks only', async () => {
      (mockPrisma.$queryRawUnsafe as jest.Mock)
        .mockResolvedValueOnce([
          {
            id: 'route-1',
            short_name: 'Bus 1',
            osm_id: '123',
            transit_mode_code: 'bus',
          },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.runQaChecks(undefined, [
        'few_stops',
        'missing_geometry',
        'geometry_too_short',
      ]);

      expect(result.totalRoutesChecked).toBe(1);
    });

    it('detects routes with fewer than 2 stops', async () => {
      (mockPrisma.$queryRawUnsafe as jest.Mock)
        .mockResolvedValueOnce([
          {
            id: 'route-1',
            short_name: 'Solo Route',
            osm_id: '999',
            transit_mode_code: 'bus',
          },
        ])
        .mockResolvedValueOnce([{ route_id: 'route-1', stop_count: 1 }]);

      const result = await service.runQaChecks(undefined, ['few_stops']);

      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].failedChecks).toContain('few_stops');
      expect(result.issues[0].details).toHaveProperty('few_stops');
    });

    it('detects routes with missing geometry', async () => {
      (mockPrisma.$queryRawUnsafe as jest.Mock)
        .mockResolvedValueOnce([
          {
            id: 'route-1',
            short_name: 'No Geometry',
            osm_id: '111',
            transit_mode_code: 'bus',
          },
        ])
        .mockResolvedValueOnce([{ id: 'route-1' }]);

      const result = await service.runQaChecks(undefined, ['missing_geometry']);

      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].failedChecks).toContain('missing_geometry');
    });

    it('detects duplicate consecutive RouteStops', async () => {
      (mockPrisma.$queryRawUnsafe as jest.Mock)
        .mockResolvedValueOnce([
          {
            id: 'route-1',
            short_name: 'Dupe Route',
            osm_id: '222',
            transit_mode_code: 'bus',
          },
        ])
        .mockResolvedValueOnce([
          {
            route_id: 'route-1',
            route_stop_id: 'rs-1',
            stop_id: 'stop-a',
            stop_name: 'A',
            stop_sequence: 1,
            latitude: -6.1,
            longitude: 106.1,
          },
          {
            route_id: 'route-1',
            route_stop_id: 'rs-2',
            stop_id: 'stop-a',
            stop_name: 'A',
            stop_sequence: 2,
            latitude: -6.1,
            longitude: 106.1,
          },
        ]);

      const result = await service.runQaChecks(undefined, ['duplicate_stops']);

      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].failedChecks).toContain('duplicate_stops');
    });

    it('detects large gaps between stops', async () => {
      (mockPrisma.$queryRawUnsafe as jest.Mock)
        .mockResolvedValueOnce([
          {
            id: 'route-1',
            short_name: 'Gap Route',
            osm_id: '333',
            transit_mode_code: 'bus',
          },
        ])
        .mockResolvedValueOnce([
          {
            route_id: 'route-1',
            route_stop_id: 'rs-1',
            stop_id: 'stop-a',
            stop_name: 'A',
            stop_sequence: 1,
            latitude: -6.1,
            longitude: 106.1,
          },
          {
            route_id: 'route-1',
            route_stop_id: 'rs-2',
            stop_id: 'stop-b',
            stop_name: 'B',
            stop_sequence: 2,
            latitude: -6.2,
            longitude: 106.2,
          },
        ]);

      const result = await service.runQaChecks(undefined, ['large_gaps']);

      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].failedChecks).toContain('large_gaps');
    });

    it('detects geometry too short', async () => {
      (mockPrisma.$queryRawUnsafe as jest.Mock)
        .mockResolvedValueOnce([
          {
            id: 'route-1',
            short_name: 'Short Geo',
            osm_id: '444',
            transit_mode_code: 'rail',
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'route-1',
            transit_mode_code: 'rail',
            length_m: 50,
          },
        ]);

      const result = await service.runQaChecks(undefined, [
        'geometry_too_short',
      ]);

      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].failedChecks).toContain('geometry_too_short');
    });

    it('detects unsupported mode', async () => {
      (mockPrisma.$queryRawUnsafe as jest.Mock)
        .mockResolvedValueOnce([
          {
            id: 'route-1',
            short_name: 'Bad Mode',
            osm_id: '555',
            transit_mode_code: 'rail',
          },
        ])
        .mockResolvedValueOnce([
          { id: 'route-1', transitModeId: 'deleted-mode' },
        ]);

      const result = await service.runQaChecks(undefined, ['unsupported_mode']);

      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].failedChecks).toContain('unsupported_mode');
    });
  });

  describe('runCleanup', () => {
    it('removes duplicate stops in dryRun mode', async () => {
      (mockPrisma.$queryRawUnsafe as jest.Mock).mockResolvedValue([
        {
          route_id: 'route-1',
          route_stop_id: 'rs-1',
          stop_id: 'stop-a',
          stop_name: 'A',
          stop_sequence: 1,
          latitude: -6.1,
          longitude: 106.1,
        },
        {
          route_id: 'route-1',
          route_stop_id: 'rs-2',
          stop_id: 'stop-a',
          stop_name: 'A',
          stop_sequence: 2,
          latitude: -6.1,
          longitude: 106.1,
        },
        {
          route_id: 'route-1',
          route_stop_id: 'rs-3',
          stop_id: 'stop-b',
          stop_name: 'B',
          stop_sequence: 3,
          latitude: -6.2,
          longitude: 106.2,
        },
      ]);

      const result = await service.runCleanup(
        undefined,
        true,
        undefined,
        true,
        undefined,
      );

      expect(result.duplicateStopsRemoved).toBe(1);
      expect(result.dryRun).toBe(true);
    });

    it('disables unusable routes', async () => {
      (mockPrisma.$queryRawUnsafe as jest.Mock)
        .mockResolvedValueOnce([
          {
            id: 'route-1',
            short_name: 'Bad',
            osm_id: '999',
            transit_mode_code: 'bus',
          },
        ])
        .mockResolvedValueOnce([{ route_id: 'route-1', stop_count: 1 }]);

      const result = await service.runCleanup(
        undefined,
        undefined,
        true,
        false,
        ['few_stops'],
      );

      expect(result.routesDisabled).toBe(1);
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalled();
    });
  });
});
