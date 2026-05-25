import { StopTimeEntity } from '../entities/stop-time.entity';

export const STOP_TIME_REPOSITORY = Symbol('STOP_TIME_REPOSITORY');

export type CreateStopTimeInput = {
  tripId: string;
  stopId: string;
  stopSequence: number;
  arrivalTime: string;
  departureTime: string;
  arrivalSeconds?: number | null;
  departureSeconds?: number | null;
  pickupType?: number;
  dropOffType?: number;
};

export interface StopTimeFilters {
  tripId?: string;
  stopId?: string;
}

export interface StopTimeRepository {
  create(input: CreateStopTimeInput): Promise<StopTimeEntity>;
  findAll(filters?: StopTimeFilters): Promise<StopTimeEntity[]>;
  findById(id: string): Promise<StopTimeEntity | null>;
}
