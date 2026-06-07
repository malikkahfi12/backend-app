import { RoutingSearchService } from '../services/routing-search.service';
import { RoutingGraphService } from '../graph/routing-graph.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import { RoutingEdgeType } from '../enums/routing-edge-type.enum';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../../config/app.config';
import {
  encodePolyline6,
  decodePolyline6,
} from '../../../common/utils/polyline6';

describe('RoutingSearchService', () => {
  const mockPrismaService = {} as unknown as PrismaService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        'stadiamaps.apiKey': 'test-api-key',
        'stadiamaps.baseUrl': 'https://api.stadiamaps.com',
      };
      return config[key];
    }),
  } as unknown as ConfigService<AppConfig, true>;

  const mockRedis = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(true),
  } as unknown as RedisService;

  const mockGraph = {
    nodes: new Map([
      [
        'stop-a',
        {
          stopId: 'stop-a',
          name: 'Harmoni',
          latitude: -6.1675,
          longitude: 106.8203,
        },
      ],
      [
        'stop-b',
        {
          stopId: 'stop-b',
          name: 'Kota',
          latitude: -6.1375,
          longitude: 106.8143,
        },
      ],
      [
        'stop-c',
        {
          stopId: 'stop-c',
          name: 'Harmoni 2',
          latitude: -6.168,
          longitude: 106.821,
        },
      ],
    ]),
    adjacencyList: new Map(),
    summary: {
      nodeCount: 3,
      walkingEdgeCount: 0,
      transferEdgeCount: 0,
      transitEdgeCount: 0,
      totalEdgeCount: 0,
    },
  };

  const mockGraphService = {
    getGraph: jest.fn().mockReturnValue(mockGraph),
  } as unknown as RoutingGraphService;

  let service: RoutingSearchService;

  beforeEach(() => {
    global.fetch = jest.fn().mockRejectedValue(new Error('no fetch'));
    service = new RoutingSearchService(
      mockGraphService,
      mockPrismaService,
      mockConfigService,
      mockRedis,
    );
    jest.clearAllMocks();
  });

  it('resolves single matching stop by name (case-insensitive)', () => {
    jest.spyOn(mockGraphService, 'getGraph').mockReturnValue({
      nodes: new Map([
        [
          'stop-a',
          {
            stopId: 'stop-a',
            name: 'Harmoni',
            latitude: -6.1675,
            longitude: 106.8203,
          },
        ],
        [
          'stop-b',
          {
            stopId: 'stop-b',
            name: 'Kota',
            latitude: -6.1375,
            longitude: 106.8143,
          },
        ],
      ]),
      adjacencyList: new Map(),
      summary: {
        nodeCount: 2,
        walkingEdgeCount: 0,
        transferEdgeCount: 0,
        transitEdgeCount: 0,
        totalEdgeCount: 0,
      },
    });

    const id = service.resolveStopIdFromName('harmoni');
    expect(id).toBe('stop-a');
  });

  it('throws on multiple matches with suggestions', () => {
    jest.spyOn(mockGraphService, 'getGraph').mockReturnValue({
      nodes: new Map([
        [
          'stop-a',
          {
            stopId: 'stop-a',
            name: 'Harmoni',
            latitude: -6.1675,
            longitude: 106.8203,
          },
        ],
        [
          'stop-c',
          {
            stopId: 'stop-c',
            name: 'Harmoni 2',
            latitude: -6.168,
            longitude: 106.821,
          },
        ],
      ]),
      adjacencyList: new Map(),
      summary: {
        nodeCount: 2,
        walkingEdgeCount: 0,
        transferEdgeCount: 0,
        transitEdgeCount: 0,
        totalEdgeCount: 0,
      },
    });

    expect(() => service.resolveStopIdFromName('harmoni')).toThrow(
      'Multiple stops match',
    );
  });

  it('throws when graph not built', () => {
    jest.spyOn(mockGraphService, 'getGraph').mockReturnValue(null);
    expect(() => service.resolveStopIdFromName('blok m')).toThrow(
      'Routing graph not built',
    );
  });

  it('returns empty options when graph not built', async () => {
    jest.spyOn(mockGraphService, 'getGraph').mockReturnValue(null);
    const result = await service.searchRoute('stop-a', 'stop-b', 28800);
    expect(result.options).toEqual([]);
  });

  it('returns empty options when no path found', async () => {
    const result = await service.searchRoute('stop-a', 'stop-b');
    expect(result.options).toEqual([]);
  });

  it('uses timeless routing when departure time is omitted', async () => {
    const mockGraphWithDepartedTransit = {
      nodes: mockGraph.nodes,
      adjacencyList: new Map([
        [
          'stop-a',
          [
            {
              fromStopId: 'stop-a',
              toStopId: 'stop-b',
              type: RoutingEdgeType.TRANSIT,
              tripId: 'departed-trip',
              routeId: 'route-1',
              routeName: '1',
              departureTimeSeconds: 100,
              arrivalTimeSeconds: 400,
              travelTimeSeconds: 300,
            },
          ],
        ],
        ['stop-b', []],
      ]),
      summary: {
        nodeCount: 2,
        walkingEdgeCount: 0,
        transferEdgeCount: 0,
        transitEdgeCount: 1,
        totalEdgeCount: 1,
      },
    };

    jest
      .spyOn(mockGraphService, 'getGraph')
      .mockReturnValue(mockGraphWithDepartedTransit);

    const result = await service.searchRoute('stop-a', 'stop-b');
    expect(result.departureTimeSeconds).toBeUndefined();
    expect(result.options).toHaveLength(1);
    expect(result.options[0].strategy).toBe('FASTEST');
    expect(result.options[0].totalDurationSeconds).toBe(300);
    expect(result.options[0].waitingDurationSeconds).toBe(0);
    expect(result.options[0].legs[0].routeId).toBe('route-1');
    expect(result.options[0].legs[0].routeName).toBe('1');
  });

  it('returns null routeName when transit route short name is unavailable', async () => {
    const mockGraphWithUnnamedRoute = {
      nodes: mockGraph.nodes,
      adjacencyList: new Map([
        [
          'stop-a',
          [
            {
              fromStopId: 'stop-a',
              toStopId: 'stop-b',
              type: RoutingEdgeType.TRANSIT,
              tripId: 'unnamed-trip',
              routeId: 'route-1',
              routeName: null,
              travelTimeSeconds: 300,
            },
          ],
        ],
        ['stop-b', []],
      ]),
      summary: {
        nodeCount: 2,
        walkingEdgeCount: 0,
        transferEdgeCount: 0,
        transitEdgeCount: 1,
        totalEdgeCount: 1,
      },
    };

    jest
      .spyOn(mockGraphService, 'getGraph')
      .mockReturnValue(mockGraphWithUnnamedRoute);

    const result = await service.searchRoute('stop-a', 'stop-b');
    expect(result.options[0].legs[0].routeId).toBe('route-1');
    expect(result.options[0].legs[0].routeName).toBeNull();
  });

  it('returns multiple timeless options when route strategies differ', async () => {
    const mockGraphWithAlternatives = {
      nodes: mockGraph.nodes,
      adjacencyList: new Map([
        [
          'stop-a',
          [
            {
              fromStopId: 'stop-a',
              toStopId: 'stop-c',
              type: RoutingEdgeType.TRANSIT,
              tripId: 'fast-1',
              routeId: 'route-1',
              routeName: '1',
              travelTimeSeconds: 100,
            },
            {
              fromStopId: 'stop-a',
              toStopId: 'stop-b',
              type: RoutingEdgeType.TRANSIT,
              tripId: 'direct',
              routeId: 'route-direct',
              routeName: 'D',
              travelTimeSeconds: 800,
            },
          ],
        ],
        [
          'stop-c',
          [
            {
              fromStopId: 'stop-c',
              toStopId: 'stop-b',
              type: RoutingEdgeType.TRANSIT,
              tripId: 'fast-2',
              routeId: 'route-2',
              routeName: '2',
              travelTimeSeconds: 100,
            },
          ],
        ],
        ['stop-b', []],
      ]),
      summary: {
        nodeCount: 3,
        walkingEdgeCount: 0,
        transferEdgeCount: 0,
        transitEdgeCount: 3,
        totalEdgeCount: 3,
      },
    };

    jest
      .spyOn(mockGraphService, 'getGraph')
      .mockReturnValue(mockGraphWithAlternatives);

    const result = await service.searchRoute('stop-a', 'stop-b');
    expect(result.options).toHaveLength(2);
    expect(result.options.map((option) => option.strategy)).toEqual([
      'FASTEST',
      'FASTEST',
    ]);
    expect(result.options[0].totalDurationSeconds).toBe(200);
    expect(result.options[1].totalDurationSeconds).toBe(800);
  });

  it('routes name searches through the best candidate stop pair', async () => {
    const ambiguousGraph = {
      nodes: new Map([
        [
          'origin-exact',
          {
            stopId: 'origin-exact',
            name: 'Akses Jembatan Ciliwung Balekambang',
            latitude: -6.272,
            longitude: 106.849,
          },
        ],
        [
          'origin-opposite',
          {
            stopId: 'origin-opposite',
            name: 'Sbr. Akses Jembatan Ciliwung Balekambang',
            latitude: -6.2721,
            longitude: 106.8491,
          },
        ],
        [
          'pgc-1',
          {
            stopId: 'pgc-1',
            name: 'PGC 1 Cililitan',
            latitude: -6.262,
            longitude: 106.865,
          },
        ],
        [
          'pgc-dalam',
          {
            stopId: 'pgc-dalam',
            name: 'PGC Dalam',
            latitude: -6.2625,
            longitude: 106.8655,
          },
        ],
      ]),
      adjacencyList: new Map([
        ['origin-exact', []],
        [
          'origin-opposite',
          [
            {
              fromStopId: 'origin-opposite',
              toStopId: 'pgc-dalam',
              type: RoutingEdgeType.TRANSIT,
              tripId: 'jak-16-trip',
              routeId: 'jak-16',
              routeName: 'JAK.16',
              travelTimeSeconds: 600,
            },
          ],
        ],
        [
          'pgc-dalam',
          [
            {
              fromStopId: 'pgc-dalam',
              toStopId: 'pgc-1',
              type: RoutingEdgeType.WALK,
              walkingTimeSeconds: 90,
              distanceMeters: 95,
            },
          ],
        ],
        ['pgc-1', []],
      ]),
      summary: {
        nodeCount: 4,
        walkingEdgeCount: 1,
        transferEdgeCount: 0,
        transitEdgeCount: 1,
        totalEdgeCount: 2,
      },
    };

    jest.spyOn(mockGraphService, 'getGraph').mockReturnValue(ambiguousGraph);

    const result = await service.searchRouteByInputs({
      fromStopName: 'Akses Jembatan Ciliwung Balekambang',
      toStopName: 'PGC 1 Cilitan',
    });

    expect(result.fromStopId).toBe('origin-opposite');
    expect(result.fromStopName).toBe(
      'Sbr. Akses Jembatan Ciliwung Balekambang',
    );
    expect(result.toStopId).toBe('pgc-dalam');
    expect(result.toStopName).toBe('PGC Dalam');
    expect(result.options).toHaveLength(1);
    expect(result.options[0].legs[0].routeId).toBe('jak-16');
    expect(result.options[0].legs[0].routeName).toBe('JAK.16');
  });

  it('uses scheduled routing when departure time is provided', async () => {
    const mockGraphWithDepartedTransit = {
      nodes: mockGraph.nodes,
      adjacencyList: new Map([
        [
          'stop-a',
          [
            {
              fromStopId: 'stop-a',
              toStopId: 'stop-b',
              type: RoutingEdgeType.TRANSIT,
              tripId: 'departed-trip',
              routeId: 'route-1',
              routeName: '1',
              departureTimeSeconds: 100,
              arrivalTimeSeconds: 400,
              travelTimeSeconds: 300,
            },
          ],
        ],
        ['stop-b', []],
      ]),
      summary: {
        nodeCount: 2,
        walkingEdgeCount: 0,
        transferEdgeCount: 0,
        transitEdgeCount: 1,
        totalEdgeCount: 1,
      },
    };

    jest
      .spyOn(mockGraphService, 'getGraph')
      .mockReturnValue(mockGraphWithDepartedTransit);

    const result = await service.searchRoute('stop-a', 'stop-b', 200);
    expect(result.departureTimeSeconds).toBe(200);
    expect(result.options).toEqual([]);
  });

  it('returns top-level and leg stop names with IDs by default', async () => {
    const mockGraphWithEdge = {
      nodes: mockGraph.nodes,
      adjacencyList: new Map([
        [
          'stop-a',
          [
            {
              fromStopId: 'stop-a',
              toStopId: 'stop-b',
              type: RoutingEdgeType.WALK,
              walkingTimeSeconds: 300,
              distanceMeters: 250,
            },
          ],
        ],
        ['stop-b', []],
      ]),
      summary: {
        nodeCount: 2,
        walkingEdgeCount: 1,
        transferEdgeCount: 0,
        transitEdgeCount: 0,
        totalEdgeCount: 1,
      },
    };

    jest.spyOn(mockGraphService, 'getGraph').mockReturnValue(mockGraphWithEdge);
    const result = await service.searchRoute('stop-a', 'stop-b', 0);
    expect(result.fromStopName).toBe('Harmoni');
    expect(result.toStopName).toBe('Kota');
    expect(result.options.length).toBe(1);
    if (result.options[0].legs.length > 0) {
      expect(result.options[0].legs[0].fromStopId).toBe('stop-a');
      expect(result.options[0].legs[0].toStopId).toBe('stop-b');
      expect(result.options[0].legs[0].fromStopName).toBe('Harmoni');
      expect(result.options[0].legs[0].toStopName).toBe('Kota');
      expect(result.options[0].legs[0].routeId).toBeNull();
      expect(result.options[0].legs[0].routeName).toBeNull();
    }
  });
});

describe('Route leg geometry', () => {
  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        'stadiamaps.apiKey': 'test-api-key',
        'stadiamaps.baseUrl': 'https://api.stadiamaps.com',
      };
      return config[key];
    }),
  } as unknown as ConfigService<AppConfig, true>;

  const mockRedis = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(true),
  } as unknown as RedisService;

  const nodes = new Map([
    [
      'stop-a',
      {
        stopId: 'stop-a',
        name: 'Harmoni',
        latitude: -6.1675,
        longitude: 106.8203,
      },
    ],
    [
      'stop-b',
      {
        stopId: 'stop-b',
        name: 'Kota',
        latitude: -6.1375,
        longitude: 106.8143,
      },
    ],
  ]);

  const baseGraph: Record<string, unknown> = {
    nodes,
    adjacencyList: new Map(),
    summary: {
      nodeCount: 2,
      walkingEdgeCount: 0,
      transferEdgeCount: 0,
      transitEdgeCount: 0,
      totalEdgeCount: 0,
    },
  };

  beforeEach(() => {
    global.fetch = jest.fn().mockRejectedValue(new Error('no fetch'));
  });

  it('WALK leg returns straight-line geometry between stop coords', async () => {
    const mockPrisma = {} as unknown as PrismaService;
    const mockGraphService = {
      getGraph: jest.fn().mockReturnValue(baseGraph),
    } as unknown as RoutingGraphService;

    const graph = {
      ...baseGraph,
      adjacencyList: new Map([
        [
          'stop-a',
          [
            {
              fromStopId: 'stop-a',
              toStopId: 'stop-b',
              type: RoutingEdgeType.WALK,
              walkingTimeSeconds: 300,
              distanceMeters: 250,
            },
          ],
        ],
        ['stop-b', []],
      ]),
    };

    jest.spyOn(mockGraphService, 'getGraph').mockReturnValue(graph);

    const service = new RoutingSearchService(
      mockGraphService,
      mockPrisma,
      mockConfigService,
      mockRedis,
    );
    const result = await service.searchRoute('stop-a', 'stop-b');

    expect(result.options[0].legs[0].geometry).toBeDefined();
    expect(typeof result.options[0].legs[0].geometry).toBe('string');
    expect(decodePolyline6(result.options[0].legs[0].geometry!)).toEqual([
      [106.8203, -6.1675],
      [106.8143, -6.1375],
    ]);
  });

  it('TRANSIT leg with tripId but no shape falls back to straight-line', async () => {
    const mockPrisma = {
      trip: { findUnique: jest.fn().mockResolvedValue(null) },
    } as unknown as PrismaService;

    const mockGraphService = {
      getGraph: jest.fn().mockReturnValue(baseGraph),
    } as unknown as RoutingGraphService;

    const graph = {
      ...baseGraph,
      adjacencyList: new Map([
        [
          'stop-a',
          [
            {
              fromStopId: 'stop-a',
              toStopId: 'stop-b',
              type: RoutingEdgeType.TRANSIT,
              tripId: 'no-shape-trip',
              routeId: 'route-1',
              routeName: '1',
              travelTimeSeconds: 300,
            },
          ],
        ],
        ['stop-b', []],
      ]),
    };

    jest.spyOn(mockGraphService, 'getGraph').mockReturnValue(graph);

    const service = new RoutingSearchService(
      mockGraphService,
      mockPrisma,
      mockConfigService,
      mockRedis,
    );
    const result = await service.searchRoute('stop-a', 'stop-b');

    expect(result.options[0].legs[0].geometry).toBeDefined();
    expect(typeof result.options[0].legs[0].geometry).toBe('string');
    expect(decodePolyline6(result.options[0].legs[0].geometry!)).toEqual([
      [106.8203, -6.1675],
      [106.8143, -6.1375],
    ]);
  });

  it('TRANSIT leg without tripId falls back to straight-line', async () => {
    const mockPrisma = {} as unknown as PrismaService;
    const mockGraphService = {
      getGraph: jest.fn().mockReturnValue(baseGraph),
    } as unknown as RoutingGraphService;

    const graph = {
      ...baseGraph,
      adjacencyList: new Map([
        [
          'stop-a',
          [
            {
              fromStopId: 'stop-a',
              toStopId: 'stop-b',
              type: RoutingEdgeType.TRANSIT,
              routeId: 'route-1',
              routeName: '1',
              travelTimeSeconds: 300,
            },
          ],
        ],
        ['stop-b', []],
      ]),
    };

    jest.spyOn(mockGraphService, 'getGraph').mockReturnValue(graph);

    const service = new RoutingSearchService(
      mockGraphService,
      mockPrisma,
      mockConfigService,
      mockRedis,
    );
    const result = await service.searchRoute('stop-a', 'stop-b');

    expect(result.options[0].legs[0].geometry).toBeDefined();
    expect(typeof result.options[0].legs[0].geometry).toBe('string');
    expect(decodePolyline6(result.options[0].legs[0].geometry!)).toEqual([
      [106.8203, -6.1675],
      [106.8143, -6.1375],
    ]);
  });

  it('TRANSIT leg with valid shape returns segment between stops', async () => {
    const shapePoints = [
      { shapePtLat: -6.167, shapePtLon: 106.82, shapePtSequence: 1 },
      { shapePtLat: -6.166, shapePtLon: 106.819, shapePtSequence: 2 },
      { shapePtLat: -6.165, shapePtLon: 106.818, shapePtSequence: 3 },
      { shapePtLat: -6.16, shapePtLon: 106.817, shapePtSequence: 4 },
      { shapePtLat: -6.155, shapePtLon: 106.816, shapePtSequence: 5 },
      { shapePtLat: -6.15, shapePtLon: 106.815, shapePtSequence: 6 },
      { shapePtLat: -6.145, shapePtLon: 106.814, shapePtSequence: 7 },
      { shapePtLat: -6.14, shapePtLon: 106.814, shapePtSequence: 8 },
      { shapePtLat: -6.138, shapePtLon: 106.8143, shapePtSequence: 9 },
      { shapePtLat: -6.1375, shapePtLon: 106.8143, shapePtSequence: 10 },
    ];

    const mockPrisma = {
      trip: {
        findUnique: jest.fn().mockResolvedValue({
          feedSourceId: 'feed-1',
          externalShapeId: 'shape-abc',
        }),
      },
      shape: {
        findMany: jest.fn().mockResolvedValue(shapePoints),
      },
    } as unknown as PrismaService;

    const mockGraphService = {
      getGraph: jest.fn().mockReturnValue(baseGraph),
    } as unknown as RoutingGraphService;

    const graph = {
      ...baseGraph,
      adjacencyList: new Map([
        [
          'stop-a',
          [
            {
              fromStopId: 'stop-a',
              toStopId: 'stop-b',
              type: RoutingEdgeType.TRANSIT,
              tripId: 'trip-with-shape',
              routeId: 'route-1',
              routeName: '1',
              travelTimeSeconds: 300,
            },
          ],
        ],
        ['stop-b', []],
      ]),
    };

    jest.spyOn(mockGraphService, 'getGraph').mockReturnValue(graph);

    const service = new RoutingSearchService(
      mockGraphService,
      mockPrisma,
      mockConfigService,
      mockRedis,
    );
    const result = await service.searchRoute('stop-a', 'stop-b');

    const geometry = result.options[0].legs[0].geometry;
    expect(geometry).toBeDefined();
    expect(typeof geometry).toBe('string');

    const coords = decodePolyline6(geometry!);
    expect(coords[0]).toEqual([106.82, -6.167]);
    expect(coords[coords.length - 1]).toEqual([106.8143, -6.1375]);
    expect(coords.length).toBeGreaterThanOrEqual(2);
    expect(coords.length).toBeLessThanOrEqual(shapePoints.length);
  });

  it('TRANSIT leg shape DB error falls back to straight-line', async () => {
    const mockPrisma = {
      trip: {
        findUnique: jest.fn().mockRejectedValue(new Error('DB down')),
      },
    } as unknown as PrismaService;

    const mockGraphService = {
      getGraph: jest.fn().mockReturnValue(baseGraph),
    } as unknown as RoutingGraphService;

    const graph = {
      ...baseGraph,
      adjacencyList: new Map([
        [
          'stop-a',
          [
            {
              fromStopId: 'stop-a',
              toStopId: 'stop-b',
              type: RoutingEdgeType.TRANSIT,
              tripId: 'error-trip',
              routeId: 'route-1',
              routeName: '1',
              travelTimeSeconds: 300,
            },
          ],
        ],
        ['stop-b', []],
      ]),
    };

    jest.spyOn(mockGraphService, 'getGraph').mockReturnValue(graph);

    const service = new RoutingSearchService(
      mockGraphService,
      mockPrisma,
      mockConfigService,
      mockRedis,
    );
    const result = await service.searchRoute('stop-a', 'stop-b');

    expect(result.options[0].legs[0].geometry).toBeDefined();
    expect(typeof result.options[0].legs[0].geometry).toBe('string');
    expect(decodePolyline6(result.options[0].legs[0].geometry!)).toEqual([
      [106.8203, -6.1675],
      [106.8143, -6.1375],
    ]);
  });

  it('WALK leg < 100m uses straight-line without calling Stadia Maps', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');

    const mockPrisma = {} as unknown as PrismaService;
    const mockGraphService = {
      getGraph: jest.fn().mockReturnValue(baseGraph),
    } as unknown as RoutingGraphService;

    const graph = {
      ...baseGraph,
      adjacencyList: new Map([
        [
          'stop-a',
          [
            {
              fromStopId: 'stop-a',
              toStopId: 'stop-b',
              type: RoutingEdgeType.WALK,
              walkingTimeSeconds: 75,
              distanceMeters: 90,
            },
          ],
        ],
        ['stop-b', []],
      ]),
    };

    jest.spyOn(mockGraphService, 'getGraph').mockReturnValue(graph);

    const service = new RoutingSearchService(
      mockGraphService,
      mockPrisma,
      mockConfigService,
      mockRedis,
    );
    const result = await service.searchRoute('stop-a', 'stop-b');

    expect(result.options[0].legs[0].geometry).toBeDefined();
    expect(decodePolyline6(result.options[0].legs[0].geometry!)).toEqual([
      [106.8203, -6.1675],
      [106.8143, -6.1375],
    ]);

    const stadiaMapsCalls = (fetchSpy as jest.Mock).mock.calls.filter(
      (call: unknown[]) => String(call[0]).includes('stadiamaps'),
    );
    expect(stadiaMapsCalls).toHaveLength(0);
    fetchSpy.mockRestore();
  });

  it('WALK leg >= 100m calls Stadia Maps and returns walking geometry', async () => {
    const mockPolyline6 = 'v{lwJwkxvjEg{CfpAozDn}@gzn@ffF';

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        trip: {
          legs: [{ shape: mockPolyline6 }],
        },
      }),
    });

    const mockPrisma = {} as unknown as PrismaService;
    const mockGraphService = {
      getGraph: jest.fn().mockReturnValue(baseGraph),
    } as unknown as RoutingGraphService;

    const graph = {
      ...baseGraph,
      adjacencyList: new Map([
        [
          'stop-a',
          [
            {
              fromStopId: 'stop-a',
              toStopId: 'stop-b',
              type: RoutingEdgeType.WALK,
              walkingTimeSeconds: 300,
              distanceMeters: 350,
            },
          ],
        ],
        ['stop-b', []],
      ]),
    };

    jest.spyOn(mockGraphService, 'getGraph').mockReturnValue(graph);

    const service = new RoutingSearchService(
      mockGraphService,
      mockPrisma,
      mockConfigService,
      mockRedis,
    );
    const result = await service.searchRoute('stop-a', 'stop-b');

    expect(result.options[0].legs[0].geometry).toEqual(mockPolyline6);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const fetchUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    const fetchOpts = (global.fetch as jest.Mock).mock
      .calls[0][1] as RequestInit;
    expect(fetchUrl).toContain('/route/v1?api_key=test-api-key');
    expect(fetchOpts.method).toBe('POST');
    expect(fetchOpts.body).toContain('"pedestrian"');
    expect(fetchOpts.body).toContain('"polyline6"');
  });

  it('WALK leg >= 100m falls back to straight-line when Stadia Maps returns NoRoute', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        trip: { legs: [] },
      }),
    });

    const mockPrisma = {} as unknown as PrismaService;
    const mockGraphService = {
      getGraph: jest.fn().mockReturnValue(baseGraph),
    } as unknown as RoutingGraphService;

    const graph = {
      ...baseGraph,
      adjacencyList: new Map([
        [
          'stop-a',
          [
            {
              fromStopId: 'stop-a',
              toStopId: 'stop-b',
              type: RoutingEdgeType.WALK,
              walkingTimeSeconds: 300,
              distanceMeters: 350,
            },
          ],
        ],
        ['stop-b', []],
      ]),
    };

    jest.spyOn(mockGraphService, 'getGraph').mockReturnValue(graph);

    const service = new RoutingSearchService(
      mockGraphService,
      mockPrisma,
      mockConfigService,
      mockRedis,
    );
    const result = await service.searchRoute('stop-a', 'stop-b');

    expect(result.options[0].legs[0].geometry).toBeDefined();
    expect(decodePolyline6(result.options[0].legs[0].geometry!)).toEqual([
      [106.8203, -6.1675],
      [106.8143, -6.1375],
    ]);
  });

  it('WALK leg >= 100m falls back to straight-line when Stadia Maps returns http error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: jest.fn().mockResolvedValue('Not Authorized'),
    });

    const mockPrisma = {} as unknown as PrismaService;
    const mockGraphService = {
      getGraph: jest.fn().mockReturnValue(baseGraph),
    } as unknown as RoutingGraphService;

    const graph = {
      ...baseGraph,
      adjacencyList: new Map([
        [
          'stop-a',
          [
            {
              fromStopId: 'stop-a',
              toStopId: 'stop-b',
              type: RoutingEdgeType.WALK,
              walkingTimeSeconds: 300,
              distanceMeters: 350,
            },
          ],
        ],
        ['stop-b', []],
      ]),
    };

    jest.spyOn(mockGraphService, 'getGraph').mockReturnValue(graph);

    const service = new RoutingSearchService(
      mockGraphService,
      mockPrisma,
      mockConfigService,
      mockRedis,
    );
    const result = await service.searchRoute('stop-a', 'stop-b');

    expect(result.options[0].legs[0].geometry).toBeDefined();
    expect(decodePolyline6(result.options[0].legs[0].geometry!)).toEqual([
      [106.8203, -6.1675],
      [106.8143, -6.1375],
    ]);
  });

  it('WALK leg >= 100m falls back to straight-line on network error', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network failure'));

    const mockPrisma = {} as unknown as PrismaService;
    const mockGraphService = {
      getGraph: jest.fn().mockReturnValue(baseGraph),
    } as unknown as RoutingGraphService;

    const graph = {
      ...baseGraph,
      adjacencyList: new Map([
        [
          'stop-a',
          [
            {
              fromStopId: 'stop-a',
              toStopId: 'stop-b',
              type: RoutingEdgeType.WALK,
              walkingTimeSeconds: 300,
              distanceMeters: 350,
            },
          ],
        ],
        ['stop-b', []],
      ]),
    };

    jest.spyOn(mockGraphService, 'getGraph').mockReturnValue(graph);

    const service = new RoutingSearchService(
      mockGraphService,
      mockPrisma,
      mockConfigService,
      mockRedis,
    );
    const result = await service.searchRoute('stop-a', 'stop-b');

    expect(result.options[0].legs[0].geometry).toBeDefined();
    expect(decodePolyline6(result.options[0].legs[0].geometry!)).toEqual([
      [106.8203, -6.1675],
      [106.8143, -6.1375],
    ]);
  });

  it('WALK leg without distanceMeters calls Stadia Maps and falls back on failure', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('no network'));

    const mockPrisma = {} as unknown as PrismaService;
    const mockGraphService = {
      getGraph: jest.fn().mockReturnValue(baseGraph),
    } as unknown as RoutingGraphService;

    const graph = {
      ...baseGraph,
      adjacencyList: new Map([
        [
          'stop-a',
          [
            {
              fromStopId: 'stop-a',
              toStopId: 'stop-b',
              type: RoutingEdgeType.WALK,
              walkingTimeSeconds: 300,
            },
          ],
        ],
        ['stop-b', []],
      ]),
    };

    jest.spyOn(mockGraphService, 'getGraph').mockReturnValue(graph);

    const service = new RoutingSearchService(
      mockGraphService,
      mockPrisma,
      mockConfigService,
      mockRedis,
    );
    const result = await service.searchRoute('stop-a', 'stop-b');

    expect(result.options[0].legs[0].geometry).toBeDefined();
    expect(decodePolyline6(result.options[0].legs[0].geometry!)).toEqual([
      [106.8203, -6.1675],
      [106.8143, -6.1375],
    ]);
  });

  it('WALK leg >= 100m returns cached geometry without calling Stadia Maps', async () => {
    const mockPolyline6 = 'v{lwJwkxvjEg{CfpAozDn}@gzn@ffF';

    mockRedis.get.mockResolvedValueOnce(decodePolyline6(mockPolyline6));

    const fetchSpy = jest.spyOn(global, 'fetch');

    const mockPrisma = {} as unknown as PrismaService;
    const mockGraphService = {
      getGraph: jest.fn().mockReturnValue(baseGraph),
    } as unknown as RoutingGraphService;

    const graph = {
      ...baseGraph,
      adjacencyList: new Map([
        [
          'stop-a',
          [
            {
              fromStopId: 'stop-a',
              toStopId: 'stop-b',
              type: RoutingEdgeType.WALK,
              walkingTimeSeconds: 300,
              distanceMeters: 350,
            },
          ],
        ],
        ['stop-b', []],
      ]),
    };

    jest.spyOn(mockGraphService, 'getGraph').mockReturnValue(graph);

    const service = new RoutingSearchService(
      mockGraphService,
      mockPrisma,
      mockConfigService,
      mockRedis,
    );
    const result = await service.searchRoute('stop-a', 'stop-b');

    expect(result.options[0].legs[0].geometry).toEqual(mockPolyline6);

    const stadiaMapsCalls = fetchSpy.mock.calls.filter((call: unknown[]) =>
      String(call[0]).includes('stadiamaps'),
    );
    expect(stadiaMapsCalls).toHaveLength(0);

    fetchSpy.mockRestore();
  });
});
