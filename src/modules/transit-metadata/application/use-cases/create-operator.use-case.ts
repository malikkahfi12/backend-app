import { Injectable } from '@nestjs/common';
import { OperatorEntity } from '../../domain/entities/operator.entity';
import { CreateOperatorInput } from '../../domain/repositories/operator.repository.interface';
import { OperatorService } from '../services/operator.service';

@Injectable()
export class CreateOperatorUseCase {
  constructor(private readonly operatorService: OperatorService) {}

  execute(input: CreateOperatorInput): Promise<OperatorEntity> {
    return this.operatorService.create(input);
  }
}
