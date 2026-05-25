import { Injectable } from '@nestjs/common';
import { ParsedStopTime } from '../types/gtfs-stop-time.type';
import { parseGtfsTimeToSeconds } from '../utils/gtfs-time.util';

@Injectable()
export class StopTimeNormalizer {
  normalize(stopTimes: ParsedStopTime[]): {
    stopTimes: ParsedStopTime[];
    arrivalSeconds: Map<number, number | null>;
    departureSeconds: Map<number, number | null>;
  } {
    const arrivalSeconds = new Map<number, number | null>();
    const departureSeconds = new Map<number, number | null>();

    const normalized = stopTimes.map((st, index) => {
      const arrSec = st.arrivalTime
        ? parseGtfsTimeToSeconds(st.arrivalTime)
        : null;
      const depSec = st.departureTime
        ? parseGtfsTimeToSeconds(st.departureTime)
        : null;

      arrivalSeconds.set(index, arrSec);
      departureSeconds.set(index, depSec);

      return st;
    });

    return { stopTimes: normalized, arrivalSeconds, departureSeconds };
  }
}
