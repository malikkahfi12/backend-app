import { Injectable } from '@nestjs/common';
import { CountryEntity } from '../../domain/entities/country.entity';
import { CreateCountryInput } from '../../domain/repositories/country.repository.interface';
import { CountryService } from '../services/country.service';

@Injectable()
export class CreateCountryUseCase {
  constructor(private readonly countryService: CountryService) {}

  execute(input: CreateCountryInput): Promise<CountryEntity> {
    return this.countryService.create(input);
  }
}
