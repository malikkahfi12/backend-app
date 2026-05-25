import { OsmImportService } from '../services/osm-import.service';
import { OverpassClientService } from '../services/overpass-client.service';
import { PrismaService } from '@/infrastructure/database/prisma.service';

describe('OsmImportService', () => {
  const mockOverpassClient = {
    queryStops: jest.fn(),
  } as unknown as OverpassClientService;

  const mockNormalizer = {
    normalize: jest.fn(),
  };

  const mockPrisma = {
    stop: {
      upsert: jest.fn(),
    },
  } as unknown as PrismaService;

  let service: OsmImportService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OsmImportService(
      mockOverpassClient,
      mockNormalizer,
      mockPrisma,
    );
  });

  it('imports stops and returns correct counts', async () => {
    const elements = [
      { type: 'node' as const, id: 1, lat: -6.1, lon: 106.1, tags: {} },
      { type: 'node' as const, id: 2, lat: -6.2, lon: 106.2, tags: {} },
      { type: 'node' as const, id: 3, lat: -6.3, lon: 106.3, tags: {} },
    ];

    (mockOverpassClient.queryStops as jest.Mock).mockResolvedValue(elements);
    mockNormalizer.normalize
      .mockReturnValueOnce({
        name: 'Stop 1',
        slug: 'stop-1-osm-node-1',
        regionId: 'r1',
        latitude: -6.1,
        longitude: 106.1,
        isStation: true,
        osmId: '1',
        osmType: 'node',
        source: 'osm',
        mode: 'bus',
      })
      .mockReturnValueOnce(null)
      .mockReturnValueOnce({
        name: 'Stop 3',
        slug: 'stop-3-osm-node-3',
        regionId: 'r1',
        latitude: -6.3,
        longitude: 106.3,
        isStation: false,
        osmId: '3',
        osmType: 'node',
        source: 'osm',
        mode: 'rail',
      });

    (mockPrisma.stop.upsert as jest.Mock).mockResolvedValue({});

    const result = await service.importStops('r1', '-6.5,106.6,-6.0,107.0');

    expect(result.totalFetched).toBe(3);
    expect(result.imported).toBe(2);
    expect(result.skipped).toBe(1);
    expect(result.errors).toHaveLength(0);
    expect(mockPrisma.stop.upsert).toHaveBeenCalledTimes(2);
  });

  it('returns error when Overpass API fails', async () => {
    (mockOverpassClient.queryStops as jest.Mock).mockRejectedValue(
      new Error('Network error'),
    );

    const result = await service.importStops('r1', 'bbox');

    expect(result.totalFetched).toBe(0);
    expect(result.imported).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Failed to fetch from Overpass');
  });

  it('captures per-element upsert errors', async () => {
    const elements = [
      { type: 'node' as const, id: 1, lat: -6.1, lon: 106.1, tags: {} },
    ];

    (mockOverpassClient.queryStops as jest.Mock).mockResolvedValue(elements);
    mockNormalizer.normalize.mockReturnValue({
      name: 'Stop 1',
      slug: 'stop-1-osm-node-1',
      regionId: 'r1',
      latitude: -6.1,
      longitude: 106.1,
      isStation: true,
      osmId: '1',
      osmType: 'node',
      source: 'osm',
      mode: 'bus',
    });
    (mockPrisma.stop.upsert as jest.Mock).mockRejectedValue(
      new Error('unique constraint violation'),
    );

    const result = await service.importStops('r1', 'bbox');

    expect(result.totalFetched).toBe(1);
    expect(result.imported).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Failed to upsert node/1');
  });
});
