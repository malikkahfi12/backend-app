import {
  OsmRouteNormalizerService,
  osmRouteModeToTransitModeCode,
  getOsmRouteModes,
} from '../services/osm-route-normalizer.service';
import { OsmRouteRelation } from '../services/overpass-client.service';

describe('OsmRouteNormalizerService', () => {
  let normalizer: OsmRouteNormalizerService;

  beforeEach(() => {
    normalizer = new OsmRouteNormalizerService();
  });

  const agencyId = 'agency-osm';
  const transitModeId = 'mode-rail';
  const regionId = 'region-jakarta';

  it('normalizes a basic train route relation', () => {
    const relation: OsmRouteRelation = {
      type: 'relation',
      id: 12345,
      tags: {
        name: 'KRL Commuter Line Bogor',
        route: 'train',
        ref: 'B',
        from: 'Jakarta Kota',
        to: 'Bogor',
        colour: '#FF0000',
      },
      members: [
        { type: 'node', ref: 100, role: 'stop' },
        { type: 'node', ref: 200, role: 'stop' },
        { type: 'node', ref: 300, role: 'platform' },
        { type: 'way', ref: 999, role: '' },
      ],
    };

    const result = normalizer.normalize(
      relation,
      agencyId,
      transitModeId,
      regionId,
    );

    expect(result).not.toBeNull();
    expect(result!.route.shortName).toBe('B');
    expect(result!.route.longName).toBe('Jakarta Kota – Bogor');
    expect(result!.route.agencyId).toBe(agencyId);
    expect(result!.route.transitModeId).toBe(transitModeId);
    expect(result!.route.osmId).toBe('12345');
    expect(result!.route.osmType).toBe('relation');
    expect(result!.route.source).toBe('osm');
    expect(result!.route.regionId).toBe(regionId);
    expect(result!.route.isActive).toBe(true);
    expect(result!.route.color).toBe('FF0000');
    expect(result!.stopOsmIds).toHaveLength(3);
    expect(result!.stopOsmIds[0]).toEqual({ osmId: '100', osmType: 'node' });
  });

  it('filters out way and invalid role members', () => {
    const relation: OsmRouteRelation = {
      type: 'relation',
      id: 1,
      tags: { name: 'Test Route', route: 'bus' },
      members: [
        { type: 'node', ref: 1, role: 'stop' },
        { type: 'way', ref: 999, role: '' },
        { type: 'node', ref: 2, role: 'forward' },
        { type: 'node', ref: 3, role: 'platform' },
        { type: 'node', ref: 4, role: 'backward' },
      ],
    };

    const result = normalizer.normalize(
      relation,
      agencyId,
      transitModeId,
      regionId,
    );

    expect(result).not.toBeNull();
    expect(result!.stopOsmIds).toHaveLength(2);
    expect(result!.stopOsmIds[0].osmId).toBe('1');
    expect(result!.stopOsmIds[1].osmId).toBe('3');
  });

  it('returns null when name is missing', () => {
    const relation: OsmRouteRelation = {
      type: 'relation',
      id: 1,
      tags: { route: 'bus' },
      members: [],
    };

    const result = normalizer.normalize(
      relation,
      agencyId,
      transitModeId,
      regionId,
    );
    expect(result).toBeNull();
  });

  it('uses name as shortName when ref is absent', () => {
    const relation: OsmRouteRelation = {
      type: 'relation',
      id: 5,
      tags: { name: 'Busway Koridor 1', route: 'bus' },
      members: [
        { type: 'node', ref: 10, role: 'stop' },
        { type: 'node', ref: 20, role: 'stop' },
      ],
    };

    const result = normalizer.normalize(
      relation,
      agencyId,
      transitModeId,
      regionId,
    );

    expect(result).not.toBeNull();
    expect(result!.route.shortName).toBe('Busway Koridor 1');
    expect(result!.route.longName).toBe('Busway Koridor 1');
  });

  it('handles from-only and to-only long names', () => {
    const fromOnly: OsmRouteRelation = {
      type: 'relation',
      id: 1,
      tags: { name: 'Route', route: 'bus', from: 'Terminal A' },
      members: [
        { type: 'node', ref: 1, role: 'stop' },
        { type: 'node', ref: 2, role: 'stop' },
      ],
    };

    const toOnly: OsmRouteRelation = {
      type: 'relation',
      id: 2,
      tags: { name: 'Route', route: 'bus', to: 'Terminal B' },
      members: [
        { type: 'node', ref: 1, role: 'stop' },
        { type: 'node', ref: 2, role: 'stop' },
      ],
    };

    expect(
      normalizer.normalize(fromOnly, agencyId, transitModeId, regionId)!.route
        .longName,
    ).toBe('Terminal A');
    expect(
      normalizer.normalize(toOnly, agencyId, transitModeId, regionId)!.route
        .longName,
    ).toBe('Terminal B');
  });

  it('handles color from both color and colour tags', () => {
    const colourTag: OsmRouteRelation = {
      type: 'relation',
      id: 1,
      tags: { name: 'R', route: 'bus', colour: '#ABCDEF' },
      members: [
        { type: 'node', ref: 1, role: 'stop' },
        { type: 'node', ref: 2, role: 'stop' },
      ],
    };

    const colorTag: OsmRouteRelation = {
      type: 'relation',
      id: 2,
      tags: { name: 'R', route: 'bus', color: '#123456' },
      members: [
        { type: 'node', ref: 1, role: 'stop' },
        { type: 'node', ref: 2, role: 'stop' },
      ],
    };

    expect(
      normalizer.normalize(colourTag, agencyId, transitModeId, regionId)!.route
        .color,
    ).toBe('ABCDEF');
    expect(
      normalizer.normalize(colorTag, agencyId, transitModeId, regionId)!.route
        .color,
    ).toBe('123456');
  });

  describe('osmRouteModeToTransitModeCode', () => {
    it('maps OSM modes to TransitMode codes', () => {
      expect(osmRouteModeToTransitModeCode('train')).toBe('rail');
      expect(osmRouteModeToTransitModeCode('subway')).toBe('subway');
      expect(osmRouteModeToTransitModeCode('light_rail')).toBe('light_rail');
      expect(osmRouteModeToTransitModeCode('tram')).toBe('tram');
      expect(osmRouteModeToTransitModeCode('bus')).toBe('bus');
    });

    it('returns null for unknown modes', () => {
      expect(osmRouteModeToTransitModeCode('ferry')).toBeNull();
      expect(osmRouteModeToTransitModeCode('')).toBeNull();
    });
  });

  describe('getOsmRouteModes', () => {
    it('returns all supported modes', () => {
      expect(getOsmRouteModes()).toEqual([
        'train',
        'subway',
        'light_rail',
        'tram',
        'bus',
      ]);
    });
  });
});
