import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PublicationStatus, Species } from '../../common/enums';

export class CreatePublicationDto {
  @ApiProperty({ description: 'Id of a pet owned by the caller' })
  @IsMongoId()
  petId: string;

  @ApiProperty({ example: 'Providencia', description: 'Commune where lost' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  commune: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ maxLength: 200, example: 'Near Plaza Italia' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  lastSeenAddress?: string;
}

export class ListPublicationsQuery {
  @ApiPropertyOptional({ example: 'Providencia' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  commune?: string;

  @ApiPropertyOptional({ enum: Species })
  @IsOptional()
  @IsEnum(Species)
  species?: Species;
}

export class UpdatePublicationStatusDto {
  @ApiProperty({ enum: PublicationStatus })
  @IsEnum(PublicationStatus)
  status: PublicationStatus;
}
