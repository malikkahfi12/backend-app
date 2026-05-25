import { Controller, Get } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import { DatabaseHealthService } from '../src/infrastructure/database/database-health.service';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { SkipResponseWrap } from '../src/common/decorators/skip-response-wrap.decorator';
import { OperatorType } from '../src/modules/transit-metadata/domain/enums/operator-type.enum';
import { FeedFormat } from '../src/modules/transit-metadata/domain/enums/feed-format.enum';
import { FeedSourceType } from '../src/modules/transit-metadata/domain/enums/feed-source-type.enum';
import { COUNTRY_REPOSITORY } from '../src/modules/transit-metadata/domain/repositories/country.repository.interface';
import { FEED_SOURCE_REPOSITORY } from '../src/modules/transit-metadata/domain/repositories/feed-source.repository.interface';
import { OPERATOR_REPOSITORY } from '../src/modules/transit-metadata/domain/repositories/operator.repository.interface';
import { REGION_REPOSITORY } from '../src/modules/transit-metadata/domain/repositories/region.repository.interface';
import { TRANSIT_MODE_REPOSITORY } from '../src/modules/transit-metadata/domain/repositories/transit-mode.repository.interface';
import { AGENCY_REPOSITORY } from '../src/modules/transit/core/agencies/domain/repositories/agency.repository.interface';
import { ROUTE_REPOSITORY } from '../src/modules/transit/core/routes/domain/repositories/route.repository.interface';
import { STOP_REPOSITORY } from '../src/modules/transit/core/stops/domain/repositories/stop.repository.interface';
import { TRIP_REPOSITORY } from '../src/modules/transit/core/trips/domain/repositories/trip.repository.interface';
import { STOP_TIME_REPOSITORY } from '../src/modules/transit/core/stop-times/domain/repositories/stop-time.repository.interface';
import { CALENDAR_REPOSITORY } from '../src/modules/transit/core/calendars/domain/repositories/calendar.repository.interface';

const VALID_API_KEY = 'test-api-key-minimum-length-24chars';

@SkipResponseWrap()
@Controller('protected-test')
class ProtectedTestController {
  @Get()
  getProtected(): { status: string } {
    return { status: 'protected' };
  }
}

describe('App (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const countries: unknown[] = [];
    const regions: unknown[] = [];
    const operators: unknown[] = [];
    const transitModes: unknown[] = [];
    const feedSources: unknown[] = [];
    const agencies: unknown[] = [];
    const routes: unknown[] = [];
    const stops: unknown[] = [];
    const trips: unknown[] = [];
    const stopTimes: unknown[] = [];
    const calendars: unknown[] = [];
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [ProtectedTestController],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $connect: jest.fn(),
        $disconnect: jest.fn(),
      })
      .overrideProvider(DatabaseHealthService)
      .useValue({
        check: jest.fn().mockResolvedValue({
          status: 'ok',
          postgis: 'enabled',
        }),
      })
      .overrideProvider(COUNTRY_REPOSITORY)
      .useValue({
        create: jest.fn((input: Record<string, unknown>) => {
          const country = {
            id: `country-${countries.length + 1}`,
            ...input,
            createdAt: now,
            updatedAt: now,
          };
          countries.push(country);
          return Promise.resolve(country);
        }),
        findAll: jest.fn(() => Promise.resolve(countries)),
        findById: jest.fn(),
      })
      .overrideProvider(REGION_REPOSITORY)
      .useValue({
        create: jest.fn((input: Record<string, unknown>) => {
          const region = {
            id: `region-${regions.length + 1}`,
            ...input,
            createdAt: now,
            updatedAt: now,
          };
          regions.push(region);
          return Promise.resolve(region);
        }),
        findAll: jest.fn(() => Promise.resolve(regions)),
        findById: jest.fn(),
      })
      .overrideProvider(OPERATOR_REPOSITORY)
      .useValue({
        create: jest.fn((input: Record<string, unknown>) => {
          const operator = {
            id: `operator-${operators.length + 1}`,
            websiteUrl: null,
            ...input,
            createdAt: now,
            updatedAt: now,
          };
          operators.push(operator);
          return Promise.resolve(operator);
        }),
        findAll: jest.fn(() => Promise.resolve(operators)),
        findById: jest.fn(),
      })
      .overrideProvider(TRANSIT_MODE_REPOSITORY)
      .useValue({
        create: jest.fn((input: Record<string, unknown>) => {
          const transitMode = {
            id: `mode-${transitModes.length + 1}`,
            ...input,
            createdAt: now,
            updatedAt: now,
          };
          transitModes.push(transitMode);
          return Promise.resolve(transitMode);
        }),
        findAll: jest.fn(() => Promise.resolve(transitModes)),
        findById: jest.fn(),
      })
      .overrideProvider(FEED_SOURCE_REPOSITORY)
      .useValue({
        create: jest.fn((input: Record<string, unknown>) => {
          const feedSource = {
            id: `feed-source-${feedSources.length + 1}`,
            url: null,
            ...input,
            createdAt: now,
            updatedAt: now,
          };
          feedSources.push(feedSource);
          return Promise.resolve(feedSource);
        }),
        findAll: jest.fn(() => Promise.resolve(feedSources)),
        findById: jest.fn(),
      })
      .overrideProvider(AGENCY_REPOSITORY)
      .useValue({
        create: jest.fn((input: Record<string, unknown>) => {
          const agency = {
            id: `agency-${agencies.length + 1}`,
            ...input,
            createdAt: now,
            updatedAt: now,
          };
          agencies.push(agency);
          return Promise.resolve(agency);
        }),
        findAll: jest.fn(() => Promise.resolve(agencies)),
        findById: jest.fn(),
      })
      .overrideProvider(ROUTE_REPOSITORY)
      .useValue({
        create: jest.fn((input: Record<string, unknown>) => {
          const route = {
            id: `route-${routes.length + 1}`,
            ...input,
            createdAt: now,
            updatedAt: now,
          };
          routes.push(route);
          return Promise.resolve(route);
        }),
        findAll: jest.fn(() => Promise.resolve(routes)),
        findById: jest.fn(),
      })
      .overrideProvider(STOP_REPOSITORY)
      .useValue({
        create: jest.fn((input: Record<string, unknown>) => {
          const stop = {
            id: `stop-${stops.length + 1}`,
            address: null,
            parentStationId: null,
            isStation: false,
            ...input,
            createdAt: now,
            updatedAt: now,
          };
          stops.push(stop);
          return Promise.resolve(stop);
        }),
        findAll: jest.fn(() => Promise.resolve(stops)),
        findById: jest.fn(),
      })
      .overrideProvider(TRIP_REPOSITORY)
      .useValue({
        create: jest.fn((input: Record<string, unknown>) => {
          const trip = {
            id: `trip-${trips.length + 1}`,
            directionId: null,
            blockId: null,
            ...input,
            createdAt: now,
            updatedAt: now,
          };
          trips.push(trip);
          return Promise.resolve(trip);
        }),
        findAll: jest.fn(() => Promise.resolve(trips)),
        findById: jest.fn(),
      })
      .overrideProvider(STOP_TIME_REPOSITORY)
      .useValue({
        create: jest.fn((input: Record<string, unknown>) => {
          const stopTime = {
            id: `st-${stopTimes.length + 1}`,
            pickupType: null,
            dropOffType: null,
            ...input,
          };
          stopTimes.push(stopTime);
          return Promise.resolve(stopTime);
        }),
        findAll: jest.fn(() => Promise.resolve(stopTimes)),
        findById: jest.fn(),
      })
      .overrideProvider(CALENDAR_REPOSITORY)
      .useValue({
        create: jest.fn((input: Record<string, unknown>) => {
          const calendar = {
            id: `cal-${calendars.length + 1}`,
            monday: false,
            tuesday: false,
            wednesday: false,
            thursday: false,
            friday: false,
            saturday: false,
            sunday: false,
            ...input,
            createdAt: now,
            updatedAt: now,
          };
          calendars.push(calendar);
          return Promise.resolve(calendar);
        }),
        findAll: jest.fn(() => Promise.resolve(calendars)),
        findById: jest.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    setupApp(app);
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('GET /api/v1/health returns 200 without API key', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect(({ body }) => {
        const data = (body as Record<string, unknown>).data as Record<
          string,
          unknown
        >;
        expect(data).toMatchObject({
          status: 'ok',
          service: 'Transit Backend',
          environment: 'test',
          dependencies: {
            database: {
              status: 'ok',
              postgis: 'enabled',
            },
          },
        });
        expect(typeof data.timestamp).toBe('string');
      });
  });

  it('rejects missing x-api-key on protected routes', () => {
    return request(app.getHttpServer())
      .get('/api/v1/protected-test')
      .expect(401);
  });

  it('accepts valid x-api-key on protected routes', () => {
    return request(app.getHttpServer())
      .get('/api/v1/protected-test')
      .set('x-api-key', VALID_API_KEY)
      .expect(200)
      .expect({ status: 'protected' });
  });

  it('rejects missing x-api-key on countries endpoint', () => {
    return request(app.getHttpServer()).get('/api/v1/countries').expect(401);
  });

  it('rejects missing x-api-key on regions endpoint', () => {
    return request(app.getHttpServer()).get('/api/v1/regions').expect(401);
  });

  it('rejects missing x-api-key on operators endpoint', () => {
    return request(app.getHttpServer()).get('/api/v1/operators').expect(401);
  });

  it('rejects missing x-api-key on transit-modes endpoint', () => {
    return request(app.getHttpServer())
      .get('/api/v1/transit-modes')
      .expect(401);
  });

  it('rejects missing x-api-key on feed-sources endpoint', () => {
    return request(app.getHttpServer()).get('/api/v1/feed-sources').expect(401);
  });

  it('creates and lists countries with valid x-api-key', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/countries')
      .set('x-api-key', VALID_API_KEY)
      .send({ code: 'ID', name: 'Indonesia' })
      .expect(201)
      .expect(({ body }) => {
        expect((body as Record<string, unknown>).data).toMatchObject({
          id: 'country-1',
          code: 'ID',
          name: 'Indonesia',
        });
      });

    await request(app.getHttpServer())
      .get('/api/v1/countries')
      .set('x-api-key', VALID_API_KEY)
      .expect(200)
      .expect(({ body }) => {
        const data = (body as Record<string, unknown>).data as unknown[];
        expect(data).toHaveLength(1);
        expect(data[0]).toMatchObject({
          id: 'country-1',
          code: 'ID',
          name: 'Indonesia',
        });
      });
  });

  it('creates and lists regions with valid x-api-key', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/regions')
      .set('x-api-key', VALID_API_KEY)
      .send({
        countryId: 'country-1',
        code: 'JKT',
        name: 'Jakarta',
        timezone: 'Asia/Jakarta',
        defaultLocale: 'id-ID',
      })
      .expect(201)
      .expect(({ body }) => {
        expect((body as Record<string, unknown>).data).toMatchObject({
          id: 'region-1',
          countryId: 'country-1',
          code: 'JKT',
          name: 'Jakarta',
        });
      });

    await request(app.getHttpServer())
      .get('/api/v1/regions')
      .set('x-api-key', VALID_API_KEY)
      .expect(200)
      .expect(({ body }) => {
        const data = (body as Record<string, unknown>).data as unknown[];
        expect(data).toHaveLength(1);
        expect(data[0]).toMatchObject({
          id: 'region-1',
          countryId: 'country-1',
          code: 'JKT',
          name: 'Jakarta',
        });
      });
  });

  it('creates and lists operators with valid x-api-key', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/operators')
      .set('x-api-key', VALID_API_KEY)
      .send({
        regionId: 'region-1',
        code: 'MRT_JAKARTA',
        name: 'MRT Jakarta',
        type: OperatorType.GOVERNMENT,
      })
      .expect(201)
      .expect(({ body }) => {
        expect((body as Record<string, unknown>).data).toMatchObject({
          id: 'operator-1',
          regionId: 'region-1',
          code: 'MRT_JAKARTA',
          name: 'MRT Jakarta',
          type: OperatorType.GOVERNMENT,
        });
      });

    await request(app.getHttpServer())
      .get('/api/v1/operators')
      .set('x-api-key', VALID_API_KEY)
      .expect(200)
      .expect(({ body }) => {
        const data = (body as Record<string, unknown>).data as unknown[];
        expect(data).toHaveLength(1);
        expect(data[0]).toMatchObject({
          id: 'operator-1',
          regionId: 'region-1',
          code: 'MRT_JAKARTA',
          type: OperatorType.GOVERNMENT,
        });
      });
  });

  it('creates and lists transit-modes with valid x-api-key', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/transit-modes')
      .set('x-api-key', VALID_API_KEY)
      .send({ code: 'SUBWAY', name: 'Subway' })
      .expect(201)
      .expect(({ body }) => {
        expect((body as Record<string, unknown>).data).toMatchObject({
          id: 'mode-1',
          code: 'SUBWAY',
          name: 'Subway',
        });
      });

    await request(app.getHttpServer())
      .get('/api/v1/transit-modes')
      .set('x-api-key', VALID_API_KEY)
      .expect(200)
      .expect(({ body }) => {
        const data = (body as Record<string, unknown>).data as unknown[];
        expect(data).toHaveLength(1);
        expect(data[0]).toMatchObject({
          id: 'mode-1',
          code: 'SUBWAY',
          name: 'Subway',
        });
      });
  });

  it('creates and lists feed-sources with valid x-api-key', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/feed-sources')
      .set('x-api-key', VALID_API_KEY)
      .send({
        operatorId: 'operator-1',
        name: 'MRT Jakarta GTFS',
        type: FeedSourceType.GTFS_STATIC,
        format: FeedFormat.GTFS_ZIP,
        isActive: true,
      })
      .expect(201)
      .expect(({ body }) => {
        expect((body as Record<string, unknown>).data).toMatchObject({
          id: 'feed-source-1',
          operatorId: 'operator-1',
          name: 'MRT Jakarta GTFS',
          type: FeedSourceType.GTFS_STATIC,
          format: FeedFormat.GTFS_ZIP,
          isActive: true,
        });
      });

    await request(app.getHttpServer())
      .get('/api/v1/feed-sources')
      .set('x-api-key', VALID_API_KEY)
      .expect(200)
      .expect(({ body }) => {
        const data = (body as Record<string, unknown>).data as unknown[];
        expect(data).toHaveLength(1);
        expect(data[0]).toMatchObject({
          id: 'feed-source-1',
          operatorId: 'operator-1',
          name: 'MRT Jakarta GTFS',
          type: FeedSourceType.GTFS_STATIC,
          format: FeedFormat.GTFS_ZIP,
          isActive: true,
        });
      });
  });

  it('rejects missing x-api-key on agencies endpoint', () => {
    return request(app.getHttpServer()).get('/api/v1/agencies').expect(401);
  });

  it('rejects missing x-api-key on routes endpoint', () => {
    return request(app.getHttpServer()).get('/api/v1/routes').expect(401);
  });

  it('rejects missing x-api-key on stops endpoint', () => {
    return request(app.getHttpServer()).get('/api/v1/stops').expect(401);
  });

  it('rejects missing x-api-key on trips endpoint', () => {
    return request(app.getHttpServer()).get('/api/v1/trips').expect(401);
  });

  it('rejects missing x-api-key on stop-times endpoint', () => {
    return request(app.getHttpServer()).get('/api/v1/stop-times').expect(401);
  });

  it('rejects missing x-api-key on calendars endpoint', () => {
    return request(app.getHttpServer()).get('/api/v1/calendars').expect(401);
  });

  it('creates and lists agencies with valid x-api-key', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/agencies')
      .set('x-api-key', VALID_API_KEY)
      .send({
        regionId: 'region-1',
        operatorId: 'operator-1',
        name: 'TransJakarta',
        slug: 'transjakarta',
        timezone: 'Asia/Jakarta',
      })
      .expect(201)
      .expect(({ body }) => {
        expect((body as Record<string, unknown>).data).toMatchObject({
          id: 'agency-1',
          name: 'TransJakarta',
          slug: 'transjakarta',
        });
      });

    await request(app.getHttpServer())
      .get('/api/v1/agencies')
      .set('x-api-key', VALID_API_KEY)
      .expect(200)
      .expect(({ body }) => {
        const data = (body as Record<string, unknown>).data as unknown[];
        expect(data).toHaveLength(1);
        expect(data[0]).toMatchObject({ id: 'agency-1', slug: 'transjakarta' });
      });
  });

  it('creates and lists stops with valid x-api-key', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/stops')
      .set('x-api-key', VALID_API_KEY)
      .send({
        regionId: 'region-1',
        name: 'Bundaran HI',
        slug: 'bundaran-hi',
        latitude: -6.2,
        longitude: 106.8,
        isStation: true,
      })
      .expect(201)
      .expect(({ body }) => {
        expect((body as Record<string, unknown>).data).toMatchObject({
          id: 'stop-1',
          name: 'Bundaran HI',
          latitude: -6.2,
          longitude: 106.8,
          isStation: true,
        });
      });

    await request(app.getHttpServer())
      .get('/api/v1/stops')
      .set('x-api-key', VALID_API_KEY)
      .expect(200)
      .expect(({ body }) => {
        const data = (body as Record<string, unknown>).data as unknown[];
        expect(data).toHaveLength(1);
        expect(data[0]).toMatchObject({ id: 'stop-1', name: 'Bundaran HI' });
      });
  });

  it('creates stop with parent station', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/stops')
      .set('x-api-key', VALID_API_KEY)
      .send({
        regionId: 'region-1',
        name: 'Bundaran HI Platform 1',
        slug: 'bundaran-hi-platform-1',
        latitude: -6.2001,
        longitude: 106.8001,
        isStation: false,
        parentStationId: 'stop-1',
      })
      .expect(201)
      .expect(({ body }) => {
        expect((body as Record<string, unknown>).data).toMatchObject({
          parentStationId: 'stop-1',
          isStation: false,
        });
      });
  });

  it('rejects invalid latitude on stop create', () => {
    return request(app.getHttpServer())
      .post('/api/v1/stops')
      .set('x-api-key', VALID_API_KEY)
      .send({
        regionId: 'region-1',
        name: 'Invalid Stop',
        slug: 'invalid-stop',
        latitude: 100,
        longitude: 106.8,
      })
      .expect(400);
  });

  it('creates and lists calendars with duplicate serviceId allowed', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/calendars')
      .set('x-api-key', VALID_API_KEY)
      .send({
        serviceId: 'service-weekday',
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: false,
        sunday: false,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/calendars')
      .set('x-api-key', VALID_API_KEY)
      .send({
        serviceId: 'service-weekday',
        monday: true,
        tuesday: true,
        startDate: '2026-06-01',
        endDate: '2026-06-30',
      })
      .expect(201)
      .expect(({ body }) => {
        expect((body as Record<string, unknown>).data).toMatchObject({
          serviceId: 'service-weekday',
          startDate: '2026-06-01',
        });
      });
  });

  it('creates and lists stop-times with GTFS time', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/trips')
      .set('x-api-key', VALID_API_KEY)
      .send({
        routeId: 'route-1',
        serviceId: 'service-weekday',
        headsign: 'Blok M',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/stop-times')
      .set('x-api-key', VALID_API_KEY)
      .send({
        tripId: 'trip-1',
        stopId: 'stop-1',
        stopSequence: 1,
        arrivalTime: '08:00:00',
        departureTime: '08:01:00',
      })
      .expect(201)
      .expect(({ body }) => {
        expect((body as Record<string, unknown>).data).toMatchObject({
          arrivalTime: '08:00:00',
          departureTime: '08:01:00',
          stopSequence: 1,
        });
      });
  });

  it('allows GTFS time with hours > 24', () => {
    return request(app.getHttpServer())
      .post('/api/v1/stop-times')
      .set('x-api-key', VALID_API_KEY)
      .send({
        tripId: 'trip-1',
        stopId: 'stop-1',
        stopSequence: 2,
        arrivalTime: '25:10:00',
        departureTime: '25:11:00',
      })
      .expect(201);
  });

  it('rejects invalid hex color on route create', () => {
    return request(app.getHttpServer())
      .post('/api/v1/routes')
      .set('x-api-key', VALID_API_KEY)
      .send({
        agencyId: 'agency-1',
        transitModeId: 'mode-1',
        shortName: '1A',
        longName: 'Test Route',
        color: 'NOTHEX',
      })
      .expect(400);
  });

  it('rejects import endpoint without Bearer token', () => {
    return request(app.getHttpServer())
      .post('/api/v1/internal/transit/import/jakarta/feed-1')
      .send({ path: './test/fixtures/gtfs/valid' })
      .expect(401);
  });

  it('rejects import endpoint with only API key (no Bearer)', () => {
    return request(app.getHttpServer())
      .post('/api/v1/internal/transit/import/jakarta/feed-1')
      .set('x-api-key', VALID_API_KEY)
      .send({ path: './test/fixtures/gtfs/valid' })
      .expect(401);
  });

  it('rejects import without path in body', () => {
    return request(app.getHttpServer())
      .post('/api/v1/internal/transit/import/jakarta/feed-1')
      .set('x-api-key', VALID_API_KEY)
      .send({})
      .expect(401);
  });
});
