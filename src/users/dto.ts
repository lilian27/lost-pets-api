import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

export const ALIAS_RE = /^[\w.-]+$/;
export const PHONE_RE = /^\+?[0-9\s-]{7,20}$/;

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'luna_owner' })
  @IsOptional()
  @IsString()
  @Length(3, 30)
  @Matches(ALIAS_RE, {
    message:
      'alias may only contain letters, numbers, dots, dashes and underscores',
  })
  alias?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional({ example: '+56 9 1234 5678' })
  @IsOptional()
  @Matches(PHONE_RE, { message: 'phone must be a valid phone number' })
  phone?: string;

  @ApiPropertyOptional({ example: 'Providencia' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  commune?: string;
}

export interface PrivateUserView {
  id: string;
  alias: string;
  name: string;
  email: string;
  phone: string;
  commune: string;
  createdAt?: Date;
}

export interface PublicUserView {
  id: string;
  alias: string;
}
