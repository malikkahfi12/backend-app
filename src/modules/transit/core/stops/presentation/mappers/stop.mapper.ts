import { StopEntity } from '../../domain/entities/stop.entity';
import { StopResponseDto } from '../dto/stop-response.dto';

export function toStopResponse(entity: StopEntity): StopResponseDto {
  return {
    id: entity.id,
    feedSourceId: entity.feedSourceId,
    externalStopId: entity.externalStopId,
    regionId: entity.regionId,
    code: entity.code,
    name: entity.name,
    slug: entity.slug,
    latitude: entity.latitude,
    longitude: entity.longitude,
    address: entity.address,
    locationType: entity.locationType,
    isStation: entity.isStation,
    parentStationId: entity.parentStationId,
    isActive: entity.isActive,
    osmId: entity.osmId,
    osmType: entity.osmType,
    mode: entity.mode,
  };
}
