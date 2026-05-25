import { Inject, Injectable } from '@nestjs/common';
import type { OperatorEntity } from '../../domain/entities/operator.entity';
import { OPERATOR_REPOSITORY } from '../../domain/repositories/operator.repository.interface';
import type {
  CreateOperatorInput,
  OperatorRepository,
} from '../../domain/repositories/operator.repository.interface';

@Injectable()
export class OperatorService {
  constructor(
    @Inject(OPERATOR_REPOSITORY)
    private readonly operatorRepository: OperatorRepository,
  ) {}

  create(input: CreateOperatorInput): Promise<OperatorEntity> {
    return this.operatorRepository.create(input);
  }

  findAll(): Promise<OperatorEntity[]> {
    return this.operatorRepository.findAll();
  }
}
