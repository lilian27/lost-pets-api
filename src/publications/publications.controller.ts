import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  AuthUser,
  JwtAuthGuard,
  OptionalJwtAuthGuard,
} from '../common/auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { ParseObjectIdPipe } from '../common/parse-object-id.pipe';
import {
  CreatePublicationDto,
  ListPublicationsQuery,
  UpdatePublicationStatusDto,
} from './dto/publication.dto';
import { PublicationsService } from './publications.service';

@ApiTags('publications')
@Controller('publications')
export class PublicationsController {
  constructor(private readonly publications: PublicationsService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiConflictResponse({
    description: 'The pet already has an active publication',
  })
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreatePublicationDto,
  ) {
    const pub = await this.publications.create(user.sub, dto);
    return PublicationsService.toView(pub, user);
  }

  @Get()
  @ApiOkResponse({
    description:
      'Public list of active publications, newest first, paginated with page/limit (default 24). Owner is exposed only as { id, alias }.',
  })
  async list(@Query() query: ListPublicationsQuery) {
    const pubs = await this.publications.findActive(query);
    return pubs.map((p) => PublicationsService.toView(p));
  }

  @Get('mine')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ description: 'History of the caller (all statuses)' })
  async mine(@CurrentUser() user: AuthUser) {
    const pubs = await this.publications.findMine(user.sub);
    return pubs.map((p) => PublicationsService.toView(p, user));
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiNotFoundResponse({
    description: 'Not found, or not active and caller is not the owner',
  })
  async findOne(
    @CurrentUser() user: AuthUser | null,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    const pub = await this.publications.findVisible(id, user);
    return PublicationsService.toView(pub, user);
  }

  @Patch(':id/status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiForbiddenResponse({ description: 'Caller is not the owner' })
  @ApiConflictResponse({
    description: 'Re-activating while another active publication exists',
  })
  async updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdatePublicationStatusDto,
  ) {
    const pub = await this.publications.updateStatus(id, user, dto.status);
    return PublicationsService.toView(pub, user);
  }
}
