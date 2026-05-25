import { toRouteResponse } from '../mappers/route.mapper';
import { RouteEntity } from '../../domain/entities/route.entity';

describe('toRouteResponse', () => {
  it('maps entity to response DTO excluding timestamps', () => {
    const entity: RouteEntity = {
      id: 'route-1',
      feedSourceId: null,
      externalRouteId: null,
      agencyId: 'agency-1',
      transitModeId: 'mode-1',
      shortName: '1',
      longName: 'Koridor 1',
      description: 'Main corridor',
      color: 'FF0000',
      textColor: 'FFFFFF',
      isActive: true,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      osmId: null,
      osmType: null,
      source: 'gtfs',
      regionId: null,
    };

    const dto = toRouteResponse(entity);
    expect(dto).toMatchObject({
      id: 'route-1',
      agencyId: 'agency-1',
      shortName: '1',
      color: 'FF0000',
    });
    expect((dto as Record<string, unknown>).createdAt).toBeUndefined();
  });
});
