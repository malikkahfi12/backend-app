import { CountryEntity } from '../../domain/entities/country.entity';
import { CountryResponseDto } from '../dto/country-response.dto';

export function toCountryResponse(entity: CountryEntity): CountryResponseDto {
  return {
    id: entity.id,
    code: entity.code,
    name: entity.name,
  };
}
