import { StopTimeEntity } from '../../domain/entities/stop-time.entity';
import { StopTimeResponseDto } from '../dto/stop-time-response.dto';

export function toStopTimeResponse(
  entity: StopTimeEntity,
): StopTimeResponseDto {
  return {
    id: entity.id,
    tripId: entity.tripId,
    stopId: entity.stopId,
    stopSequence: entity.stopSequence,
    arrivalTime: entity.arrivalTime,
    departureTime: entity.departureTime,
    arrivalSeconds: entity.arrivalSeconds,
    departureSeconds: entity.departureSeconds,
    pickupType: entity.pickupType,
    dropOffType: entity.dropOffType,
  };
}
