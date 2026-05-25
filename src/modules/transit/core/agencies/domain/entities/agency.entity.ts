export type AgencyEntity = {
  id: string;
  feedSourceId: string | null;
  externalAgencyId: string | null;
  regionId: string;
  operatorId: string;
  name: string;
  slug: string;
  timezone: string;
  language: string;
  phone: string | null;
  website: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};
