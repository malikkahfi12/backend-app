import { OsmRouteImportService } from '../services/osm-route-import.service';
import { OverpassClientService } from '../services/overpass-client.service';
import { OsmRouteGeometryService } from '../services/osm-route-geometry.service';
import { PrismaService } from '@/infrastructure/database/prisma.service';

describe('OsmRouteImportService', () => {
  const mockOverpassClient = {
    queryRouteRelations: jest.fn(),
  } as unknown as OverpassClientService;

  const mockNormalizer = {
    normalize: jest.fn(),
  };

  const mockGeometryService = {
    buildGeometry: jest.fn().mockReturnValue(null),
    buildFromStopCoords: jest.fn().mockReturnValue(null),
  } as unknown as OsmRouteGeometryService;

  const createMockPrisma = () => ({
    transitMode: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'mode-rail', code: 'rail' },
        { id: 'mode-subway', code: 'subway' },
        { id: 'mode-light_rail', code: 'light_rail' },
        { id: 'mode-tram', code: 'tram' },
        { id: 'mode-bus', code: 'bus' },
      ]),
    },
    region: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'region-jakarta',
        code: 'jkt',
        timezone: 'Asia/Jakarta',
        defaultLocale: 'id',
      }),
    },
    operator: {
      upsert: jest.fn().mockResolvedValue({ id: 'operator-osm' }),
    },
    agency: {
      upsert: jest.fn().mockResolvedValue({ id: 'agency-osm' }),
    },
    route: {
      upsert: jest.fn(),
    },
    routeStop: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    $transaction: jest.fn((fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        routeStop: {
          deleteMany: jest.fn(),
          createMany: jest.fn(),
        },
      };
      return fn(tx);
    }),
    $queryRawUnsafe: jest.fn(),
  });

  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let service: OsmRouteImportService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = createMockPrisma();
    service = new OsmRouteImportService(
      mockOverpassClient,
      mockNormalizer,
      mockGeometryService,
      mockPrisma as unknown as PrismaService,
    );
  });

  it('imports routes and returns correct summary', async () => {
    const relations = [
      {
        type: 'relation' as const,
        id: 1,
        tags: { name: 'Bus 1', route: 'bus' },
        members: [
          { type: 'node' as const, ref: 100, role: 'stop' },
          { type: 'node' as const, ref: 200, role: 'platform' },
        ],
      },
    ];

    (mockOverpassClient.queryRouteRelations as jest.Mock).mockResolvedValue(
      relations,
    );
    mockNormalizer.normalize.mockReturnValue({
      route: {
        agencyId: 'agency-osm',
        transitModeId: 'mode-bus',
        shortName: 'Bus 1',
        longName: 'Bus 1',
        isActive: true,
        osmId: '1',
        osmType: 'relation',
        source: 'osm',
        regionId: 'region-jakarta',
      },
      stopOsmIds: [
        { osmId: '100', osmType: 'node' },
        { osmId: '200', osmType: 'node' },
      ],
    });

    mockPrisma.route.upsert.mockResolvedValue({ id: 'route-1' });
    mockPrisma.$queryRawUnsafe.mockResolvedValue([
      { id: 'stop-100', osm_id: '100' },
      { id: 'stop-200', osm_id: '200' },
    ]);

    const result = await service.importRoutes(
      'region-jakarta',
      '-6.5,106.6,-6.0,107.0',
    );

    expect(result.totalRelations).toBe(1);
    expect(result.importedRoutes).toBe(1);
    expect(result.createdRouteStops).toBe(2);
    expect(result.skippedRoutes).toBe(0);
    expect(result.unmatchedStops).toBe(0);
  });

  it('skips relations with fewer than 2 matched stops', async () => {
    const relations = [
      {
        type: 'relation' as const,
        id: 1,
        tags: { name: 'Solo Route', route: 'bus' },
        members: [{ type: 'node' as const, ref: 100, role: 'stop' }],
      },
    ];

    (mockOverpassClient.queryRouteRelations as jest.Mock).mockResolvedValue(
      relations,
    );
    mockNormalizer.normalize.mockReturnValue({
      route: {
        agencyId: 'agency-osm',
        transitModeId: 'mode-bus',
        shortName: 'Solo Route',
        longName: 'Solo Route',
        isActive: true,
        osmId: '1',
        osmType: 'relation',
        source: 'osm',
        regionId: 'region-jakarta',
      },
      stopOsmIds: [{ osmId: '100', osmType: 'node' }],
    });

    mockPrisma.$queryRawUnsafe.mockResolvedValue([
      { id: 'stop-100', osm_id: '100' },
    ]);

    const result = await service.importRoutes('region-jakarta', 'bbox');

    expect(result.skippedRoutes).toBe(1);
    expect(result.importedRoutes).toBe(0);
  });

  it('handles Overpass API failure gracefully', async () => {
    (mockOverpassClient.queryRouteRelations as jest.Mock).mockRejectedValue(
      new Error('Timeout'),
    );

    const result = await service.importRoutes('region-jakarta', 'bbox');

    expect(result.totalRelations).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Failed to fetch from Overpass');
  });

  it('returns error when region does not exist', async () => {
    mockPrisma.region.findUnique.mockResolvedValue(null);

    const result = await service.importRoutes('nonexistent-region', 'bbox');

    expect(result.errors).toContain('Failed to create OSM agency');
  });
});
