import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthUser, JwtAuthGuard } from '../common/auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { ParseObjectIdPipe } from '../common/parse-object-id.pipe';
import { CreatePetDto, UpdatePetDto } from './dto/pet.dto';
import { PetsService } from './pets.service';

@ApiTags('pets')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
@UseGuards(JwtAuthGuard)
@Controller('pets')
export class PetsController {
  constructor(private readonly pets: PetsService) {}

  @Post()
  @ApiBadRequestResponse({
    description: 'Validation error (e.g. photo > 2MB, vaccines > 200 chars)',
  })
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreatePetDto) {
    return PetsService.toView(await this.pets.create(user.sub, dto));
  }

  @Get()
  async mine(@CurrentUser() user: AuthUser) {
    return (await this.pets.findMine(user.sub)).map(PetsService.toView);
  }

  @Get(':id')
  @ApiNotFoundResponse()
  @ApiForbiddenResponse({ description: 'Not the owner' })
  async findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    return PetsService.toView(await this.pets.findOwned(id, user.sub));
  }

  @Patch(':id')
  @ApiNotFoundResponse()
  @ApiForbiddenResponse({ description: 'Not the owner' })
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdatePetDto,
  ) {
    return PetsService.toView(await this.pets.update(id, user.sub, dto));
  }
}
