import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import {
  CLASSIFICATION_CATEGORIES,
  ClassificationCategory,
} from '../classification-provider';
import { MAX_PAGE_SIZE } from './list-requests-query.dto';

export const DEFAULT_HISTORY_LIMIT = 50;

export class HistoryQueryDto {
  @IsOptional()
  @IsIn(CLASSIFICATION_CATEGORIES)
  category?: ClassificationCategory;

  @IsOptional()
  @IsUUID()
  requestId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  limit?: number;
}
