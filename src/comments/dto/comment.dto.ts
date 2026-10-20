import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { MAX_COMMENT_LENGTH } from '../../common/constants';
import { CommentType } from '../../common/enums';
import { IsBase64Image } from '../../common/is-base64-image.validator';

export class CreateCommentDto {
  @ApiProperty({ maxLength: MAX_COMMENT_LENGTH })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_COMMENT_LENGTH)
  text: string;

  @ApiPropertyOptional({ enum: CommentType, default: CommentType.COMMENT })
  @IsOptional()
  @IsEnum(CommentType)
  type?: CommentType;

  @ApiPropertyOptional({ description: 'Base64 data URL image, max 2MB' })
  @IsOptional()
  @IsBase64Image()
  photo?: string;

  @ApiPropertyOptional({
    description: 'Required for anonymous comments. Shown publicly.',
    maxLength: 60,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  authorName?: string;

  @ApiPropertyOptional({
    description: 'Required for anonymous comments. Never exposed.',
  })
  @IsOptional()
  @IsEmail()
  authorEmail?: string;
}

export class UpdateCommentDto {
  @ApiProperty({ maxLength: MAX_COMMENT_LENGTH })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_COMMENT_LENGTH)
  text: string;
}
