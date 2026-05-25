import { Inject, Injectable } from '@nestjs/common';
import type { CountryEntity } from '../../domain/entities/country.entity';
import { COUNTRY_REPOSITORY } from '../../domain/repositories/country.repository.interface';
import type {
  CountryRepository,
  CreateCountryInput,
} from '../../domain/repositories/country.repository.interface';

@Injectable()
export class CountryService {
  constructor(
    @Inject(COUNTRY_REPOSITORY)
    private readonly countryRepository: CountryRepository,
  ) {}

  create(input: CreateCountryInput): Promise<CountryEntity> {
    return this.countryRepository.create(input);
  }

  findAll(): Promise<CountryEntity[]> {
    return this.countryRepository.findAll();
  }
}
