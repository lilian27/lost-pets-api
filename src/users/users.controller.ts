import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthUser, JwtAuthGuard } from '../common/auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { UpdateUserDto } from './dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  @ApiOkResponse({ description: 'Private profile of the authenticated user' })
  async me(@CurrentUser() user: AuthUser) {
    return UsersService.toPrivate(await this.users.findById(user.sub));
  }

  @Patch('me')
  @ApiOkResponse({ description: 'Updated private profile' })
  async update(@CurrentUser() user: AuthUser, @Body() dto: UpdateUserDto) {
    return UsersService.toPrivate(await this.users.update(user.sub, dto));
  }
}
