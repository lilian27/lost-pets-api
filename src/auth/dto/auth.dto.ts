import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ALIAS_RE, PHONE_RE } from '../../users/dto';

export class RegisterDto {
  @ApiProperty({
    example: 'luna_owner',
    description: 'Public alias. The only owner data shown publicly.',
  })
  @IsString()
  @Length(3, 30)
  @Matches(ALIAS_RE, {
    message:
      'alias may only contain letters, numbers, dots, dashes and underscores',
  })
  alias: string;

  @ApiProperty({ example: 'Ana Pérez', description: 'Real name (private)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;

  @ApiProperty({ example: 'ana@example.com', description: 'Private' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+56 9 1234 5678', description: 'Private' })
  @Matches(PHONE_RE, { message: 'phone must be a valid phone number' })
  phone: string;

  @ApiProperty({ example: 'Providencia' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  commune: string;

  @ApiProperty({ minLength: 6, maxLength: 72 })
  @IsString()
  @MinLength(6)
  @MaxLength(72)
  password: string;
}

export class LoginDto {
  @ApiProperty({ example: 'ana@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  password: string;
}
