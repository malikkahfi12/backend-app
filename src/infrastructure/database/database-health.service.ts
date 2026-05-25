import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma.service';
import { DatabaseHealth } from './types/database-health.type';

@Injectable()
export class DatabaseHealthService {
  constructor(private readonly prismaService: PrismaService) {}

  async check(): Promise<DatabaseHealth> {
    try {
      await this.prismaService.$queryRaw(Prisma.sql`SELECT PostGIS_Version();`);

      return {
        status: 'ok',
        postgis: 'enabled',
      };
    } catch {
      return {
        status: 'down',
        postgis: 'unknown',
      };
    }
  }
}
