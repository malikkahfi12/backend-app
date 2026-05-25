import { TransitModeEntity } from '../../domain/entities/transit-mode.entity';
import { TransitModeResponseDto } from '../dto/transit-mode-response.dto';

export function toTransitModeResponse(
  entity: TransitModeEntity,
): TransitModeResponseDto {
  return {
    id: entity.id,
    code: entity.code,
    name: entity.name,
  };
}
