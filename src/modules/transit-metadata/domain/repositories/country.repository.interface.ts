import { CountryEntity } from '../entities/country.entity';

export const COUNTRY_REPOSITORY = Symbol('COUNTRY_REPOSITORY');

export type CreateCountryInput = {
  code: string;
  name: string;
};

export interface CountryRepository {
  create(input: CreateCountryInput): Promise<CountryEntity>;
  findAll(): Promise<CountryEntity[]>;
  findById(id: string): Promise<CountryEntity | null>;
}
