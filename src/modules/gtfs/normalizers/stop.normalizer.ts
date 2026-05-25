import { Injectable } from '@nestjs/common';
import { ParsedStop } from '../types/gtfs-stop.type';

@Injectable()
export class StopNormalizer {
  normalize(
    stops: ParsedStop[],
    countryCode: string,
    regionCode: string,
  ): ParsedStop[] {
    return stops.map((stop) => ({
      ...stop,
      countryCode,
      regionCode,
    }));
  }
}
