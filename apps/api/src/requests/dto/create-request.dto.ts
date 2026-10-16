import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Trim } from './trim';

export const MAX_MESSAGE_LENGTH = 2000;

export class CreateRequestDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_MESSAGE_LENGTH)
  message!: string;
}
