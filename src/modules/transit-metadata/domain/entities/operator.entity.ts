import { OperatorType } from '../enums/operator-type.enum';

export type OperatorEntity = {
  id: string;
  regionId: string;
  code: string;
  name: string;
  type: OperatorType;
  websiteUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};
