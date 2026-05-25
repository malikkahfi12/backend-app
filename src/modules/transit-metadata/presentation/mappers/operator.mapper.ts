import { OperatorEntity } from '../../domain/entities/operator.entity';
import { OperatorResponseDto } from '../dto/operator-response.dto';

export function toOperatorResponse(
  entity: OperatorEntity,
): OperatorResponseDto {
  return {
    id: entity.id,
    regionId: entity.regionId,
    code: entity.code,
    name: entity.name,
    type: entity.type,
    websiteUrl: entity.websiteUrl,
  };
}
