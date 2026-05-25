import { Injectable, Logger } from '@nestjs/common';

const ENDPOINT_CONNECT_TOLERANCE_METERS = 50;

@Injectable()
export class OsmRouteGeometryService {
  private readonly logger = new Logger(OsmRouteGeometryService.name);

  buildGeometry(
    wayRefs: number[],
    wayGeometries: Map<number, number[][]>,
  ): number[][] | null {
    if (wayRefs.length === 0) return null;

    const collected: Array<{ wayId: number; coords: number[][] }> = [];
    for (const wayId of wayRefs) {
      const coords = wayGeometries.get(wayId);
      if (coords && coords.length >= 2) {
        collected.push({ wayId, coords });
      }
    }

    if (collected.length === 0) return null;

    if (collected.length === 1) {
      return collected[0].coords;
    }

    return this.stitchWays(collected);
  }

  private stitchWays(
    ways: Array<{ wayId: number; coords: number[][] }>,
  ): number[][] | null {
    const processed = [ways[0].coords];

    for (let i = 1; i < ways.length; i++) {
      const prev = processed[processed.length - 1];
      let next = ways[i].coords;

      const prevLast = prev[prev.length - 1];
      const prevFirst = prev[0];

      const distances: Array<{
        label: string;
        distance: number;
        reverseNext: boolean;
        reversePrev: boolean;
      }> = [
        {
          label: 'tail→head',
          distance: haversineMeters(
            prevLast[1],
            prevLast[0],
            next[0][1],
            next[0][0],
          ),
          reverseNext: false,
          reversePrev: false,
        },
        {
          label: 'tail→tail',
          distance: haversineMeters(
            prevLast[1],
            prevLast[0],
            next[next.length - 1][1],
            next[next.length - 1][0],
          ),
          reverseNext: true,
          reversePrev: false,
        },
        {
          label: 'head→head',
          distance: haversineMeters(
            prevFirst[1],
            prevFirst[0],
            next[0][1],
            next[0][0],
          ),
          reverseNext: false,
          reversePrev: true,
        },
        {
          label: 'head→tail',
          distance: haversineMeters(
            prevFirst[1],
            prevFirst[0],
            next[next.length - 1][1],
            next[next.length - 1][0],
          ),
          reverseNext: true,
          reversePrev: true,
        },
      ];

      const best = distances.reduce((a, b) =>
        a.distance < b.distance ? a : b,
      );

      if (best.distance > ENDPOINT_CONNECT_TOLERANCE_METERS) {
        this.logger.warn(
          `Way discontinuity at way[${i - 1}]→way[${i}]: min distance=${best.distance.toFixed(1)}m > ${ENDPOINT_CONNECT_TOLERANCE_METERS}m tolerance`,
        );
        processed.push(next);
        continue;
      }

      if (best.reversePrev) {
        const reversed = [...processed[processed.length - 1]].reverse();
        processed[processed.length - 1] = reversed;
      }

      if (best.reverseNext) {
        next = [...next].reverse();
      }

      const prevEnd = processed[processed.length - 1];
      const lastOfPrev = prevEnd[prevEnd.length - 1];
      const firstOfNext = next[0];

      if (
        lastOfPrev[0] === firstOfNext[0] &&
        lastOfPrev[1] === firstOfNext[1]
      ) {
        processed.push(next.slice(1));
      } else {
        processed.push(next);
      }
    }

    const result = processed.flat();
    return result.length >= 2 ? result : null;
  }

  buildFromStopCoords(
    stopCoords: Array<{ lat: number; lng: number }>,
  ): number[][] | null {
    if (stopCoords.length < 2) return null;
    return stopCoords.map((s) => [s.lng, s.lat]);
  }
}

function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
