import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { GtfsMapperService } from './gtfs-mapper.service';

export interface JakartaImportContext {
  feedSourceId: string;
  regionId: string;
  operatorId: string;
  transitModeByCode: Map<string, string>;
}

@Injectable()
export class JakartaImportService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly gtfsMapperService: GtfsMapperService,
  ) {}

  async buildContext(feedSourceId: string): Promise<JakartaImportContext> {
    const feedSource = await this.prismaService.feedSource.findUnique({
      where: { id: feedSourceId },
    });

    if (!feedSource) {
      throw new NotFoundException(
        `FeedSource with id '${feedSourceId}' not found`,
      );
    }

    const operator = await this.prismaService.operator.findUnique({
      where: { id: feedSource.operatorId },
    });

    if (!operator) {
      throw new NotFoundException('Operator not found for feed source');
    }

    const regionId = operator.regionId;
    const modes = await this.prismaService.transitMode.findMany();

    const transitModeByCode = new Map<string, string>();
    for (const mode of modes) {
      transitModeByCode.set(mode.code, mode.id);
    }

    return {
      feedSourceId,
      regionId,
      operatorId: operator.id,
      transitModeByCode,
    };
  }
}
