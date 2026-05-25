import { Injectable } from '@nestjs/common';

export interface ShapeQualityResult {
  points: number;
  isGood: boolean;
  checks: {
    hasEnoughPoints: boolean;
    noLargeGaps: boolean;
    lengthIsReasonable: boolean;
  };
  details: {
    pointCount: number;
    maxGapMeters: number | null;
    shapeLengthMeters: number | null;
    straightLineLengthMeters: number | null;
  };
}

const MIN_POINTS = 3;
const MAX_GAP_METERS = 5000;
const LENGTH_RATIO_MIN = 0.3;
const LENGTH_RATIO_MAX = 5.0;

@Injectable()
export class GeometryQualityService {
  assess(
    coordinates: number[][] | null,
    straightLineDistance?: number,
  ): ShapeQualityResult | null {
    if (!coordinates || coordinates.length < 2) return null;

    const details = {
      pointCount: coordinates.length,
      maxGapMeters: this.computeMaxGap(coordinates),
      shapeLengthMeters: this.computeLength(coordinates),
      straightLineLengthMeters: straightLineDistance ?? null,
    };

    const checks = {
      hasEnoughPoints: details.pointCount >= MIN_POINTS,
      noLargeGaps:
        details.maxGapMeters === null || details.maxGapMeters <= MAX_GAP_METERS,
      lengthIsReasonable: this.isLengthReasonable(
        details.shapeLengthMeters,
        details.straightLineLengthMeters,
      ),
    };

    const isGood =
      checks.hasEnoughPoints && checks.noLargeGaps && checks.lengthIsReasonable;

    return { points: details.pointCount, isGood, checks, details };
  }

  private computeMaxGap(coordinates: number[][]): number | null {
    if (coordinates.length < 2) return null;
    let max = 0;
    for (let i = 1; i < coordinates.length; i++) {
      const gap = haversineMeters(
        coordinates[i - 1][1],
        coordinates[i - 1][0],
        coordinates[i][1],
        coordinates[i][0],
      );
      if (gap > max) max = gap;
    }
    return max;
  }

  private computeLength(coordinates: number[][]): number | null {
    if (coordinates.length < 2) return null;
    let total = 0;
    for (let i = 1; i < coordinates.length; i++) {
      total += haversineMeters(
        coordinates[i - 1][1],
        coordinates[i - 1][0],
        coordinates[i][1],
        coordinates[i][0],
      );
    }
    return total;
  }

  private isLengthReasonable(
    shapeLength: number | null,
    straightLength: number | null,
  ): boolean {
    if (
      shapeLength === null ||
      straightLength === null ||
      straightLength === 0
    ) {
      return true;
    }
    const ratio = shapeLength / straightLength;
    return ratio >= LENGTH_RATIO_MIN && ratio <= LENGTH_RATIO_MAX;
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
