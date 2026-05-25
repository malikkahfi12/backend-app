import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

export interface IntegrityCheckResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
}

@Injectable()
export class ImportIntegrityService {
  private readonly logger = new Logger(ImportIntegrityService.name);

  constructor(private readonly prismaService: PrismaService) {}

  async checkReferentialIntegrity(rawData: {
    routeIds?: string[];
    tripIds?: string[];
    stopIds?: string[];
  }): Promise<IntegrityCheckResult> {
    const warnings: string[] = [];
    const errors: string[] = [];
    const db = this.prismaService as any;

    if (rawData.routeIds && rawData.routeIds.length > 0) {
      const uniqueIds = [...new Set(rawData.routeIds)];
      const existingRoutes = await db.route.findMany({
        where: { externalRouteId: { in: uniqueIds } },
        select: { externalRouteId: true },
      });
      const existingSet = new Set(
        existingRoutes.map((r: any) => r.externalRouteId),
      );
      const missing = uniqueIds.filter((id) => !existingSet.has(id));
      if (missing.length > 0) {
        errors.push(
          `Routes not found in DB: ${missing.slice(0, 10).join(', ')}${missing.length > 10 ? ` and ${missing.length - 10} more` : ''}`,
        );
      }
    }

    if (rawData.stopIds && rawData.stopIds.length > 0) {
      const uniqueIds = [...new Set(rawData.stopIds)];
      const existingStops = await db.stop.findMany({
        where: { externalStopId: { in: uniqueIds } },
        select: { externalStopId: true },
      });
      const existingSet = new Set(
        existingStops.map((s: any) => s.externalStopId),
      );
      const missing = uniqueIds.filter((id) => !existingSet.has(id));
      if (missing.length > 0) {
        warnings.push(
          `Stops not found in DB: ${missing.slice(0, 10).join(', ')}${missing.length > 10 ? ` and ${missing.length - 10} more` : ''}. They will be created.`,
        );
      }
    }

    if (rawData.tripIds && rawData.tripIds.length > 0) {
      const uniqueIds = [...new Set(rawData.tripIds)];
      const existingTrips = await db.trip.findMany({
        where: { externalTripId: { in: uniqueIds } },
        select: { externalTripId: true },
      });
      const existingSet = new Set(
        existingTrips.map((t: any) => t.externalTripId),
      );
      const missing = uniqueIds.filter((id) => !existingSet.has(id));
      if (missing.length > 0) {
        warnings.push(
          `Trips not found in DB: ${missing.slice(0, 10).join(', ')}${missing.length > 10 ? ` and ${missing.length - 10} more` : ''}. They will be created.`,
        );
      }
    }

    return { valid: errors.length === 0, warnings, errors };
  }
}
