import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { STRICT_THROTTLE } from '../common/throttle';
import { AuthUser, OptionalJwtAuthGuard } from '../common/auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { ParseObjectIdPipe } from '../common/parse-object-id.pipe';
import { CommentsService } from './comments.service';
import { CreateCommentDto, UpdateCommentDto } from './dto/comment.dto';

@ApiTags('comments')
@ApiBearerAuth()
@UseGuards(OptionalJwtAuthGuard)
@Controller()
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Post('publications/:id/comments')
  @ApiCreatedResponse({
    description:
      'Created comment. Anonymous comments also return a one-time `editToken` to send as X-Edit-Token when editing.',
  })
  @ApiBadRequestResponse({
    description:
      'Validation error (text > 300 chars, photo > 2MB, anonymous without authorName/authorEmail)',
  })
  @ApiNotFoundResponse({ description: 'Publication not found or not active' })
  @ApiForbiddenResponse({
    description: 'Anonymous users cannot post type possible_finding',
  })
  @ApiConflictResponse({ description: 'Publication is closed (found)' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
  @Throttle(STRICT_THROTTLE)
  create(
    @CurrentUser() user: AuthUser | null,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.comments.create(id, dto, user);
  }

  @Get('publications/:id/comments')
  list(
    @CurrentUser() user: AuthUser | null,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    return this.comments.list(id, user);
  }

  @Patch('comments/:id')
  @ApiHeader({
    name: 'X-Edit-Token',
    required: false,
    description: 'Edit token returned when an anonymous comment was created',
  })
  @ApiForbiddenResponse({ description: 'Caller is not the author' })
  @ApiNotFoundResponse({
    description: 'Comment not found or its publication is not visible',
  })
  update(
    @CurrentUser() user: AuthUser | null,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateCommentDto,
    @Headers('x-edit-token') editToken?: string,
  ) {
    return this.comments.update(id, dto, user, editToken);
  }

  @Post('comments/:id/flag')
  @HttpCode(200)
  @ApiNotFoundResponse({
    description: 'Comment not found or its publication is not visible',
  })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
  @Throttle(STRICT_THROTTLE)
  flag(
    @CurrentUser() user: AuthUser | null,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    return this.comments.flag(id, user);
  }

  @Delete('comments/:id')
  @ApiResponse({
    status: HttpStatus.METHOD_NOT_ALLOWED,
    description: 'Comments cannot be deleted',
  })
  remove(): never {
    throw new HttpException(
      'Comments cannot be deleted',
      HttpStatus.METHOD_NOT_ALLOWED,
    );
  }
}
