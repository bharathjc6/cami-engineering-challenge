import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { REQUEST_STATUSES, RequestStatus } from './customer-request.entity';
import { CLASSIFICATION_CATEGORIES, ClassificationCategory } from './classification-provider';

export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_PAGE_SIZE = 200;
export const DEFAULT_HISTORY_LIMIT = 50;

/** Trims string input before validation; leaves other types for the validators to reject. */
const Trim = () => Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

export class CreateRequestDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_MESSAGE_LENGTH)
  message!: string;
}

export class UpdateStatusDto {
  @IsIn(REQUEST_STATUSES)
  status!: RequestStatus;
}

export class ClassifyRequestDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_MESSAGE_LENGTH)
  message!: string;

  @IsOptional()
  @IsUUID()
  requestId?: string;
}

/** Paging is optional so existing callers keep receiving the full list. */
export class ListRequestsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

export class HistoryQueryDto extends ListRequestsQueryDto {
  @IsOptional()
  @IsIn(CLASSIFICATION_CATEGORIES)
  category?: ClassificationCategory;

  @IsOptional()
  @IsUUID()
  requestId?: string;
}
