import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { Trim } from './trim';
import { MAX_MESSAGE_LENGTH } from './create-request.dto';

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
