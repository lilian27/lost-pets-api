import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthUser, JwtAuthGuard } from '../common/auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { PaginationQuery } from '../common/pagination.dto';
import { ParseObjectIdPipe } from '../common/parse-object-id.pipe';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOkResponse({
    description: 'Newest first. Paginated with page/limit (default 50).',
  })
  async list(@CurrentUser() user: AuthUser, @Query() query: PaginationQuery) {
    const items = await this.notifications.listMine(user.sub, query);
    return items.map(NotificationsService.toView);
  }

  @Get('unread-count')
  @ApiOkResponse({ description: '{ count }' })
  async unreadCount(@CurrentUser() user: AuthUser) {
    return { count: await this.notifications.unreadCount(user.sub) };
  }

  @Patch('read-all')
  @ApiOkResponse({ description: '{ updated }' })
  markAllRead(@CurrentUser() user: AuthUser) {
    return this.notifications.markAllRead(user.sub);
  }

  @Patch(':id/read')
  @ApiNotFoundResponse()
  async markRead(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    return NotificationsService.toView(
      await this.notifications.markRead(id, user.sub),
    );
  }
}
