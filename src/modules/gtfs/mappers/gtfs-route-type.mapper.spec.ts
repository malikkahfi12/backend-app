import { GtfsRouteTypeMapper } from './gtfs-route-type.mapper';

describe('GtfsRouteTypeMapper', () => {
  const mapper = new GtfsRouteTypeMapper();

  it('maps route_type 0 to LRT', () => {
    expect(mapper.map(0)).toEqual({ code: 'LRT' });
  });

  it('maps route_type 1 to MRT', () => {
    expect(mapper.map(1)).toEqual({ code: 'MRT' });
  });

  it('maps route_type 2 to KRL', () => {
    expect(mapper.map(2)).toEqual({ code: 'KRL' });
  });

  it('maps route_type 3 to BRT', () => {
    expect(mapper.map(3)).toEqual({ code: 'BRT' });
  });

  it('maps unknown route_type to UNKNOWN with warning', () => {
    expect(mapper.map(999)).toEqual({
      code: 'UNKNOWN',
      warning: "Unknown GTFS route_type '999' mapped to UNKNOWN",
    });
  });
});
