export interface ParsedStop {
  gtfsStopId: string;
  name: string;
  lat: number;
  lng: number;
  code?: string;
  locationType?: number;
  parentStation?: string;
  stopDesc?: string;
  countryCode: string;
  regionCode: string;
}
