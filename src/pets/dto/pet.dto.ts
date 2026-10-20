import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { MAX_VACCINES_LENGTH } from '../../common/constants';
import { Sex, Size, Species } from '../../common/enums';
import { IsBase64Image } from '../../common/is-base64-image.validator';

export class CreatePetDto {
  @ApiProperty({ example: 'Luna', maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;

  @ApiProperty({ enum: Species })
  @IsEnum(Species)
  species: Species;

  @ApiProperty({ enum: Sex })
  @IsEnum(Sex)
  sex: Sex;

  @ApiProperty({ enum: Size })
  @IsEnum(Size)
  size: Size;

  @ApiPropertyOptional({ example: 'Brown with white paws', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  color?: string;

  @ApiPropertyOptional({
    example: 'Rabies 2025, Octuple 2025',
    maxLength: MAX_VACCINES_LENGTH,
  })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_VACCINES_LENGTH)
  vaccines?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    description:
      'Base64 data URL (data:image/png|jpeg|gif|webp;base64,...). Max 2MB decoded.',
  })
  @IsBase64Image()
  photo: string;
}

export class UpdatePetDto extends PartialType(CreatePetDto) {}
