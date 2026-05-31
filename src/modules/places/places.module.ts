import { Module } from '@nestjs/common';
import { PlacesController } from './presentation/controllers/places.controller';
import { PlacesService } from './services/places.service';
import { MapTilerGeocodingService } from './services/maptiler-geocoding.service';

@Module({
  controllers: [PlacesController],
  providers: [PlacesService, MapTilerGeocodingService],
  exports: [PlacesService],
})
export class PlacesModule {}
