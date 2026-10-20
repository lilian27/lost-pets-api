import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { AuthUser } from '../common/auth.guard';
import { PublicationStatus } from '../common/enums';
import { PetDocument } from '../pets/pet.schema';
import { PetsService } from '../pets/pets.service';
import { UserDocument } from '../users/user.schema';
import { UsersService } from '../users/users.service';
import {
  CreatePublicationDto,
  ListPublicationsQuery,
} from './dto/publication.dto';
import { Publication, PublicationDocument } from './publication.schema';

export const ACTIVE_PUBLICATION_EXISTS =
  'This pet already has an active publication';

export type PopulatedPublication = Omit<
  PublicationDocument,
  'pet' | 'owner'
> & {
  pet: PetDocument;
  owner: UserDocument;
};

@Injectable()
export class PublicationsService {
  constructor(
    @InjectModel(Publication.name)
    private readonly publications: Model<Publication>,
    private readonly pets: PetsService,
  ) {}

  async create(ownerId: string, dto: CreatePublicationDto) {
    const pet = await this.pets.findOwned(dto.petId, ownerId);
    await this.assertNoActive(pet.id);
    try {
      const created = await this.publications.create({
        owner: ownerId,
        pet: pet.id,
        species: pet.species,
        commune: dto.commune,
        description: dto.description,
        lastSeenAddress: dto.lastSeenAddress,
        lostAt: new Date(),
        status: PublicationStatus.ACTIVE,
      });
      return this.populate(created);
    } catch (err) {
      if ((err as { code?: number }).code === 11000) {
        throw new ConflictException(ACTIVE_PUBLICATION_EXISTS);
      }
      throw err;
    }
  }

  findActive(query: ListPublicationsQuery): Promise<PopulatedPublication[]> {
    const filter: FilterQuery<Publication> = {
      status: PublicationStatus.ACTIVE,
    };
    if (query.commune) filter.commune = query.commune;
    if (query.species) filter.species = query.species;
    return this.findPopulated(filter);
  }

  findMine(ownerId: string): Promise<PopulatedPublication[]> {
    return this.findPopulated({ owner: ownerId });
  }

  async findVisible(
    id: string,
    viewer: AuthUser | null,
  ): Promise<PopulatedPublication> {
    const pub = await this.publications
      .findById(id)
      .populate<{ pet: PetDocument; owner: UserDocument }>(['pet', 'owner'])
      .exec();
    if (!pub) throw new NotFoundException('Publication not found');
    const isOwner = !!viewer && pub.owner.id === viewer.sub;
    if (pub.status !== PublicationStatus.ACTIVE && !isOwner) {
      throw new NotFoundException('Publication not found');
    }
    return pub as unknown as PopulatedPublication;
  }

  async updateStatus(id: string, user: AuthUser, status: PublicationStatus) {
    const pub = await this.publications.findById(id).exec();
    if (!pub) throw new NotFoundException('Publication not found');
    if (!pub.owner.equals(user.sub)) {
      throw new ForbiddenException(
        'Only the owner can change the publication status',
      );
    }
    if (status === PublicationStatus.ACTIVE && pub.status !== status) {
      await this.assertNoActive(pub.pet.toString());
    }
    pub.status = status;
    pub.foundAt = status === PublicationStatus.FOUND ? new Date() : undefined;
    await pub.save();
    return this.populate(pub);
  }

  private async assertNoActive(petId: string) {
    const exists = await this.publications.exists({
      pet: petId,
      status: PublicationStatus.ACTIVE,
    });
    if (exists) throw new ConflictException(ACTIVE_PUBLICATION_EXISTS);
  }

  private async populate(pub: PublicationDocument) {
    return (await pub.populate([
      'pet',
      'owner',
    ])) as unknown as PopulatedPublication;
  }

  private async findPopulated(filter: FilterQuery<Publication>) {
    const pubs = await this.publications
      .find(filter)
      .sort({ lostAt: -1 })
      .populate<{ pet: PetDocument; owner: UserDocument }>(['pet', 'owner'])
      .exec();
    return pubs as unknown as PopulatedPublication[];
  }

  static toView(pub: PopulatedPublication, viewer: AuthUser | null = null) {
    return {
      id: pub.id as string,
      status: pub.status,
      commune: pub.commune,
      description: pub.description ?? null,
      lastSeenAddress: pub.lastSeenAddress ?? null,
      lostAt: pub.lostAt,
      foundAt: pub.foundAt ?? null,
      createdAt: pub.createdAt,
      owner: UsersService.toPublic(pub.owner),
      pet: PetsService.toView(pub.pet),
      isOwner: !!viewer && pub.owner.id === viewer.sub,
    };
  }
}
