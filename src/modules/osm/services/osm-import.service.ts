import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { OverpassClientService } from './overpass-client.service';
import { OsmStopNormalizerService } from './osm-stop-normalizer.service';

export interface OsmImportResponse {
  totalFetched: number;
  imported: number;
  skipped: number;
  errors: string[];
}

@Injectable()
export class OsmImportService {
  private readonly logger = new Logger(OsmImportService.name);

  constructor(
    private readonly overpassClient: OverpassClientService,
    private readonly normalizer: OsmStopNormalizerService,
    private readonly prismaService: PrismaService,
  ) {}

  async importStops(
    regionId: string,
    bbox: string,
  ): Promise<OsmImportResponse> {
    const result: OsmImportResponse = {
      totalFetched: 0,
      imported: 0,
      skipped: 0,
      errors: [],
    };

    let elements;
    try {
      elements = await this.overpassClient.queryStops(bbox);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`Failed to fetch from Overpass: ${message}`);
      return result;
    }

    result.totalFetched = elements.length;

    for (const element of elements) {
      try {
        const input = this.normalizer.normalize(element, regionId);
        if (!input) {
          result.skipped++;
          continue;
        }

        const { osmId, osmType, ...data } = input;
        await this.prismaService.stop.upsert({
          where: {
            osmId_osmType: {
              osmId: osmId!,
              osmType: osmType!,
            },
          },
          update: data as any,
          create: input as any,
        });
        result.imported++;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        const osmRef = `${element.type}/${element.id}`;
        result.errors.push(`Failed to upsert ${osmRef}: ${message}`);
      }
    }

    this.logger.log(
      `OSM import complete: fetched=${result.totalFetched} imported=${result.imported} skipped=${result.skipped}`,
    );

    return result;
  }
}
