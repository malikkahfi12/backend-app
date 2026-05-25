import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { SchedulesService } from './schedules.service';
import {
  SchedulesController,
  DeparturesController,
} from './schedules.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [SchedulesController, DeparturesController],
  providers: [SchedulesService],
  exports: [SchedulesService],
})
export class SchedulesModule {}
