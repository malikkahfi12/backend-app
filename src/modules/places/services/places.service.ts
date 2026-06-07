import { Injectable } from '@nestjs/common';
import {
  StadiaMapsGeocodingService,
  NormalizedPlaceResult,
  NormalizedReverseResult,
} from './stadiamaps-geocoding.service';

@Injectable()
export class PlacesService {
  constructor(private readonly geocodingService: StadiaMapsGeocodingService) {}

  async search(
    query: string,
    opts?: { lat?: number; lng?: number; limit?: number; lang?: string },
  ): Promise<NormalizedPlaceResult[]> {
    return this.geocodingService.search(query, opts);
  }

  async reverse(
    lat: number,
    lng: number,
  ): Promise<NormalizedReverseResult | null> {
    return this.geocodingService.reverse(lat, lng);
  }
}
