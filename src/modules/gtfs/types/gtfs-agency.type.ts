export interface ParsedAgency {
  gtfsAgencyId: string | null;
  name: string;
  timezone: string;
  url?: string;
  lang?: string;
  phone?: string;
}
