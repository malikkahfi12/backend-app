import { Injectable } from '@nestjs/common';
import { TransitModeEntity } from '../../domain/entities/transit-mode.entity';
import { CreateTransitModeInput } from '../../domain/repositories/transit-mode.repository.interface';
import { TransitModeService } from '../services/transit-mode.service';

@Injectable()
export class CreateTransitModeUseCase {
  constructor(private readonly transitModeService: TransitModeService) {}

  execute(input: CreateTransitModeInput): Promise<TransitModeEntity> {
    return this.transitModeService.create(input);
  }
}
