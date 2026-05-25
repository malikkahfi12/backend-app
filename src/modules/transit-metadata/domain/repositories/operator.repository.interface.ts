import { OperatorEntity } from '../entities/operator.entity';
import { OperatorType } from '../enums/operator-type.enum';

export const OPERATOR_REPOSITORY = Symbol('OPERATOR_REPOSITORY');

export type CreateOperatorInput = {
  regionId: string;
  code: string;
  name: string;
  type: OperatorType;
  websiteUrl?: string | null;
};

export interface OperatorRepository {
  create(input: CreateOperatorInput): Promise<OperatorEntity>;
  findAll(): Promise<OperatorEntity[]>;
  findById(id: string): Promise<OperatorEntity | null>;
}
