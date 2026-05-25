import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../../infrastructure/database/prisma.service';
import {
  RouteRepository,
  RouteFilters,
  CreateRouteInput,
  CreateRouteStopInput,
  PaginationParams,
  PaginatedRoutes,
} from '../../domain/repositories/route.repository.interface';
import { RouteEntity } from '../../domain/entities/route.entity';

@Injectable()
export class PrismaRouteRepository implements RouteRepository {
  constructor(private readonly prismaService: PrismaService) {}

  create(input: CreateRouteInput): Promise<RouteEntity> {
    return this.prismaService.route.create({
      data: input as any,
    });
  }

  upsertByOsm(input: CreateRouteInput): Promise<RouteEntity> {
    const { osmId, osmType, ...data } = input;
    return this.prismaService.route.upsert({
      where: {
        osmId_osmType: {
          osmId: osmId!,
          osmType: osmType!,
        },
      },
      update: data as any,
      create: input as any,
    });
  }

  async replaceRouteStops(
    routeId: string,
    stops: CreateRouteStopInput[],
  ): Promise<void> {
    await this.prismaService.$transaction(async (tx) => {
      await tx.routeStop.deleteMany({ where: { routeId } });

      if (stops.length > 0) {
        await tx.routeStop.createMany({
          data: stops,
        });
      }
    });
  }

  async findAll(filters?: RouteFilters): Promise<RouteEntity[]> {
    const where = this.buildWhere(filters);
    return await this.prismaService.route.findMany({
      where,
      orderBy: { shortName: 'asc' },
    });
  }

  async findAllPaginated(
    filters?: RouteFilters,
    pagination?: PaginationParams,
  ): Promise<PaginatedRoutes> {
    const where = this.buildWhere(filters);
    const limit = pagination?.limit ?? 20;
    const page = pagination?.page ?? 1;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prismaService.route.findMany({
        where,
        orderBy: { shortName: 'asc' },
        skip,
        take: limit,
      }),
      this.prismaService.route.count({ where }),
    ]);

    return {
      data: data as unknown as RouteEntity[],
      meta: { count: total, limit, page },
    };
  }

  findById(id: string): Promise<RouteEntity | null> {
    return this.prismaService.route.findUnique({
      where: { id },
    });
  }

  private buildWhere(filters?: RouteFilters): Record<string, unknown> {
    const where: Record<string, unknown> = {};
    if (filters?.agencyId) where.agencyId = filters.agencyId;
    if (filters?.transitModeId) where.transitModeId = filters.transitModeId;
    if (filters?.operatorId) {
      where.agency = { operatorId: filters.operatorId };
    }
    if (filters?.mode) {
      where.transitModeId = filters.transitModeId ?? undefined;
    }
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;
    return where;
  }
}
