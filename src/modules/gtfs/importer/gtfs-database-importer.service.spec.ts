import {
  GtfsDatabaseImporterService,
  ImportContext,
} from './gtfs-database-importer.service';
import { GtfsRouteTypeMapper } from '../mappers/gtfs-route-type.mapper';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

describe('GtfsDatabaseImporterService', () => {
  const mockPrisma = {
    agency: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: 'agency-1' }),
      update: jest.fn().mockResolvedValue({ id: 'agency-1' }),
    },
    stop: {
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({}),
    },
    route: {
      upsert: jest.fn().mockResolvedValue({}),
    },
    trip: {
      upsert: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([
        { id: 'trip-uuid-1', externalTripId: 'trip-1' },
        { id: 'trip-uuid-2', externalTripId: 'trip-2' },
      ]),
    },
    shape: {
      createMany: jest.fn().mockResolvedValue({ count: 3 }),
    },
    calendar: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'cal-1' }),
      update: jest.fn().mockResolvedValue({ id: 'cal-1' }),
    },
    calendarDate: {
      upsert: jest.fn().mockResolvedValue({}),
    },
    stopTime: {
      upsert: jest.fn().mockResolvedValue({}),
    },
    $executeRawUnsafe: jest.fn().mockResolvedValue(undefined),
  };

  const context: ImportContext = {
    regionId: 'region-1',
    operatorId: 'operator-1',
    transitModeByCode: new Map([
      ['MRT', 'mode-mrt'],
      ['LRT', 'mode-lrt'],
      ['BRT', 'mode-brt'],
      ['UNKNOWN', 'mode-unknown'],
    ]),
  };

  const service = new GtfsDatabaseImporterService(
    mockPrisma as unknown as PrismaService,
    new GtfsRouteTypeMapper(),
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.agency.findFirst.mockResolvedValue(null);
    mockPrisma.agency.create.mockResolvedValue({ id: 'agency-1' });
  });

  describe('importAgencies', () => {
    it('creates new agencies', async () => {
      const result = await service.importAgencies(
        [
          {
            gtfsAgencyId: 'ag-1',
            name: 'Test Agency',
            timezone: 'Asia/Jakarta',
          },
        ],
        context,
      );

      expect(result.imported).toBe(1);
      expect(mockPrisma.agency.create).toHaveBeenCalled();
    });

    it('updates existing agencies', async () => {
      mockPrisma.agency.findFirst.mockResolvedValue({ id: 'existing-1' });

      const result = await service.importAgencies(
        [
          {
            gtfsAgencyId: 'ag-1',
            name: 'Updated Agency',
            timezone: 'Asia/Jakarta',
          },
        ],
        context,
      );

      expect(result.imported).toBe(1);
      expect(mockPrisma.agency.update).toHaveBeenCalled();
    });

    it('deduplicates slugs against existing DB records', async () => {
      mockPrisma.agency.findMany.mockResolvedValue([{ slug: 'test-agency' }]);

      const result = await service.importAgencies(
        [
          {
            gtfsAgencyId: 'ag-1',
            name: 'Test Agency',
            timezone: 'Asia/Jakarta',
          },
        ],
        context,
      );

      const createCall = mockPrisma.agency.create.mock.calls[0][0];
      expect(createCall.data.slug).toBe('test-agency-2');
      expect(result.imported).toBe(1);
    });

    it('deduplicates slugs within the same batch', async () => {
      mockPrisma.agency.findMany.mockResolvedValue([]);

      await service.importAgencies(
        [
          {
            gtfsAgencyId: 'ag-1',
            name: 'Duplicate Name!',
            timezone: 'Asia/Jakarta',
          },
          {
            gtfsAgencyId: 'ag-2',
            name: 'Duplicate Name',
            timezone: 'Asia/Jakarta',
          },
        ],
        context,
      );

      const calls = mockPrisma.agency.create.mock.calls;
      expect(calls[0][0].data.slug).toBe('duplicate-name');
      expect(calls[1][0].data.slug).toBe('duplicate-name-2');
    });
  });

  describe('importStops', () => {
    it('batch-imports stops and calls PostGIS update', async () => {
      const result = await service.importStops(
        [
          {
            gtfsStopId: 'stop-1',
            name: 'Stop 1',
            lat: -6.2,
            lng: 106.8,
            countryCode: 'ID',
            regionCode: 'JKT',
          },
          {
            gtfsStopId: 'stop-2',
            name: 'Stop 2',
            lat: -6.3,
            lng: 106.9,
            countryCode: 'ID',
            regionCode: 'JKT',
          },
          {
            gtfsStopId: 'stop-3',
            name: 'Stop 3',
            lat: -6.4,
            lng: 107.0,
            countryCode: 'ID',
            regionCode: 'JKT',
          },
        ],
        context,
      );

      expect(result.imported).toBe(3);
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalled();
    });

    it('deduplicates stops by gtfsStopId', async () => {
      const result = await service.importStops(
        [
          {
            gtfsStopId: 'stop-1',
            name: 'Stop 1',
            lat: -6.2,
            lng: 106.8,
            countryCode: 'ID',
            regionCode: 'JKT',
          },
          {
            gtfsStopId: 'stop-1',
            name: 'Stop 1 Dup',
            lat: -6.2,
            lng: 106.8,
            countryCode: 'ID',
            regionCode: 'JKT',
          },
        ],
        context,
      );

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('duplicate');
    });
  });

  describe('importRoutes', () => {
    it('batch-imports routes with mode resolution', async () => {
      const result = await service.importRoutes(
        [
          {
            gtfsRouteId: 'route-1',
            shortName: '1',
            longName: 'Line 1',
            routeType: 1,
            agencyId: 'ag-1',
          },
          {
            gtfsRouteId: 'route-2',
            shortName: '2',
            longName: 'Line 2',
            routeType: 3,
            agencyId: 'ag-1',
          },
        ],
        context,
      );

      expect(result.imported).toBe(2);
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalled();
    });

    it('warns on unknown route_type', async () => {
      const result = await service.importRoutes(
        [
          {
            gtfsRouteId: 'route-x',
            shortName: 'X',
            longName: 'Unknown',
            routeType: 999,
            agencyId: 'ag-1',
          },
        ],
        context,
      );

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('UNKNOWN');
    });
  });

  describe('importTrips', () => {
    it('batch-imports trips with externalShapeId', async () => {
      const routeMap = new Map([['route-1', 'route-uuid']]);

      const { result } = await service.importTrips(
        [
          {
            gtfsTripId: 'trip-1',
            routeId: 'route-1',
            serviceId: 'svc-1',
            headsign: 'Kota',
            directionId: 0,
            shapeId: 'shape-001',
          },
          {
            gtfsTripId: 'trip-2',
            routeId: 'route-1',
            serviceId: 'svc-1',
            headsign: 'Blok M',
            directionId: 1,
          },
        ],
        context,
        routeMap,
      );

      expect(result.imported).toBe(2);
      expect(result.skipped).toBe(0);
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalled();
    });

    it('skips trips with missing route', async () => {
      const routeMap = new Map([['other-route', 'route-uuid']]);

      const { result } = await service.importTrips(
        [
          {
            gtfsTripId: 'trip-1',
            routeId: 'route-1',
            serviceId: 'svc-1',
          },
        ],
        context,
        routeMap,
      );

      expect(result.skipped).toBe(1);
      expect(result.warnings.some((w) => w.includes('route_id'))).toBe(true);
    });

    it('builds tripMap from DB after import', async () => {
      mockPrisma.trip.findMany.mockResolvedValue([
        { id: 'trip-db-1', externalTripId: 'trip-1' },
      ]);

      const routeMap = new Map([['route-1', 'route-uuid']]);

      const { tripMap } = await service.importTrips(
        [{ gtfsTripId: 'trip-1', routeId: 'route-1', serviceId: 'svc-1' }],
        context,
        routeMap,
      );

      expect(tripMap.get('trip-1')).toBe('trip-db-1');
    });
  });

  describe('importShapes', () => {
    it('batch-imports shape points', async () => {
      const result = await service.importShapes(
        [
          {
            shapeId: 'shape-001',
            shapePtLat: -6.1675,
            shapePtLon: 106.8203,
            shapePtSequence: 1,
          },
          {
            shapeId: 'shape-001',
            shapePtLat: -6.1676,
            shapePtLon: 106.8204,
            shapePtSequence: 2,
            shapeDistTraveled: 15.5,
          },
          {
            shapeId: 'shape-002',
            shapePtLat: -6.17,
            shapePtLon: 106.83,
            shapePtSequence: 1,
          },
        ],
        context,
      );

      expect(result.imported).toBe(3);
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalled();
    });

    it('includes shapeDistTraveled when present', async () => {
      const result = await service.importShapes(
        [
          {
            shapeId: 'shape-001',
            shapePtLat: -6.1675,
            shapePtLon: 106.8203,
            shapePtSequence: 1,
            shapeDistTraveled: 12.3,
          },
        ],
        context,
      );

      expect(result.imported).toBe(1);
    });
  });
});
