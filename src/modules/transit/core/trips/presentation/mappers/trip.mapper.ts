import { TripEntity } from '../../domain/entities/trip.entity';
import { TripResponseDto } from '../dto/trip-response.dto';

export function toTripResponse(entity: TripEntity): TripResponseDto {
  return {
    id: entity.id,
    feedSourceId: entity.feedSourceId,
    externalTripId: entity.externalTripId,
    routeId: entity.routeId,
    serviceId: entity.serviceId,
    headsign: entity.headsign,
    directionId: entity.directionId,
    blockId: entity.blockId,
    isActive: entity.isActive,
  };
}
