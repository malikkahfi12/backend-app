import { Module } from '@nestjs/common';
import { PlacesController } from './presentation/controllers/places.controller';
import { PlacesService } from './services/places.service';
import { StadiaMapsGeocodingService } from './services/stadiamaps-geocoding.service';

@Module({
  controllers: [PlacesController],
  providers: [PlacesService, StadiaMapsGeocodingService],
  exports: [PlacesService],
})
export class PlacesModule {}
