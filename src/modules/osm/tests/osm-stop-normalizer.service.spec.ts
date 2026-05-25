import { OsmStopNormalizerService } from '../services/osm-stop-normalizer.service';
import { OsmStopElement } from '../services/overpass-client.service';

describe('OsmStopNormalizerService', () => {
  let normalizer: OsmStopNormalizerService;

  beforeEach(() => {
    normalizer = new OsmStopNormalizerService();
  });

  it('normalizes a railway station node', () => {
    const element: OsmStopElement = {
      type: 'node',
      id: 12345678,
      lat: -6.209,
      lon: 106.847,
      tags: {
        name: 'Stasiun Manggarai',
        railway: 'station',
        'addr:street': 'Jl. Manggarai',
        'addr:city': 'Jakarta',
      },
    };

    const result = normalizer.normalize(element, 'region-jakarta');

    expect(result).not.toBeNull();
    expect(result!.name).toBe('Stasiun Manggarai');
    expect(result!.slug).toBe('stasiun-manggarai-osm-node-12345678');
    expect(result!.latitude).toBe(-6.209);
    expect(result!.longitude).toBe(106.847);
    expect(result!.isStation).toBe(true);
    expect(result!.mode).toBe('rail');
    expect(result!.osmId).toBe('12345678');
    expect(result!.osmType).toBe('node');
    expect(result!.source).toBe('osm');
    expect(result!.regionId).toBe('region-jakarta');
    expect(result!.address).toBe('Jl. Manggarai, Jakarta');
    expect(result!.feedSourceId).toBeNull();
    expect(result!.externalStopId).toBeNull();
  });

  it('normalizes a tram stop', () => {
    const element: OsmStopElement = {
      type: 'node',
      id: 99999,
      lat: -6.22,
      lon: 106.83,
      tags: {
        name: 'Tram Stop Tebet',
        railway: 'tram_stop',
      },
    };

    const result = normalizer.normalize(element, 'region-jakarta');

    expect(result).not.toBeNull();
    expect(result!.mode).toBe('tram');
    expect(result!.isStation).toBe(true);
  });

  it('normalizes a bus stop', () => {
    const element: OsmStopElement = {
      type: 'node',
      id: 55555,
      lat: -6.175,
      lon: 106.827,
      tags: {
        name: 'Halte Monas',
        highway: 'bus_stop',
        ref: 'MN-01',
      },
    };

    const result = normalizer.normalize(element, 'region-jakarta');

    expect(result).not.toBeNull();
    expect(result!.mode).toBe('bus');
    expect(result!.isStation).toBe(false);
    expect(result!.code).toBe('MN-01');
  });

  it('normalizes a public_transport station', () => {
    const element: OsmStopElement = {
      type: 'node',
      id: 77777,
      lat: -6.18,
      lon: 106.82,
      tags: {
        name: 'Terminal Blok M',
        public_transport: 'station',
      },
    };

    const result = normalizer.normalize(element, 'region-jakarta');

    expect(result).not.toBeNull();
    expect(result!.mode).toBe('public_transport');
    expect(result!.isStation).toBe(true);
  });

  it('returns null when name is missing', () => {
    const element: OsmStopElement = {
      type: 'node',
      id: 11111,
      lat: -6.2,
      lon: 106.8,
      tags: {
        highway: 'bus_stop',
      },
    };

    const result = normalizer.normalize(element, 'region-jakarta');
    expect(result).toBeNull();
  });

  it('returns null when name is empty', () => {
    const element: OsmStopElement = {
      type: 'node',
      id: 11111,
      lat: -6.2,
      lon: 106.8,
      tags: {
        name: '   ',
        highway: 'bus_stop',
      },
    };

    const result = normalizer.normalize(element, 'region-jakarta');
    expect(result).toBeNull();
  });

  it('generates unique slugs for different nodes with same name', () => {
    const element1: OsmStopElement = {
      type: 'node',
      id: 100,
      lat: -6.1,
      lon: 106.1,
      tags: { name: 'Harmoni', highway: 'bus_stop' },
    };

    const element2: OsmStopElement = {
      type: 'node',
      id: 200,
      lat: -6.2,
      lon: 106.2,
      tags: { name: 'Harmoni', highway: 'bus_stop' },
    };

    const result1 = normalizer.normalize(element1, 'region-x');
    const result2 = normalizer.normalize(element2, 'region-x');

    expect(result1!.slug).toBe('harmoni-osm-node-100');
    expect(result2!.slug).toBe('harmoni-osm-node-200');
    expect(result1!.slug).not.toBe(result2!.slug);
  });

  it('generates different slugs for same osmId with different types', () => {
    const node: OsmStopElement = {
      type: 'node',
      id: 123,
      lat: -6.3,
      lon: 106.3,
      tags: { name: 'Test', highway: 'bus_stop' },
    };

    const way: OsmStopElement = {
      type: 'way',
      id: 123,
      lat: -6.3,
      lon: 106.3,
      tags: { name: 'Test', railway: 'station' },
    };

    const nodeResult = normalizer.normalize(node, 'region-x');
    const wayResult = normalizer.normalize(way, 'region-x');

    expect(nodeResult!.slug).toBe('test-osm-node-123');
    expect(wayResult!.slug).toBe('test-osm-way-123');
  });

  it('resolves address from multiple addr tags', () => {
    const element: OsmStopElement = {
      type: 'node',
      id: 1,
      lat: -6.2,
      lon: 106.8,
      tags: {
        name: 'Test',
        highway: 'bus_stop',
        'addr:housenumber': '10',
        'addr:street': 'Jl. Sudirman',
        'addr:city': 'Jakarta',
        'addr:postcode': '12190',
      },
    };

    const result = normalizer.normalize(element, 'region-jakarta');

    expect(result!.address).toBe('10 Jl. Sudirman, Jakarta, 12190');
  });

  it('returns null for invalid coordinates', () => {
    const element: OsmStopElement = {
      type: 'node',
      id: 1,
      lat: NaN,
      lon: 106.8,
      tags: { name: 'Bad Stop', highway: 'bus_stop' },
    };

    const result = normalizer.normalize(element, 'region-jakarta');
    expect(result).toBeNull();
  });
});
