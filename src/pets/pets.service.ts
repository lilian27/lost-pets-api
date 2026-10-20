import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreatePetDto, UpdatePetDto } from './dto/pet.dto';
import { Pet, PetDocument } from './pet.schema';

@Injectable()
export class PetsService {
  constructor(@InjectModel(Pet.name) private readonly pets: Model<Pet>) {}

  create(ownerId: string, dto: CreatePetDto): Promise<PetDocument> {
    return this.pets.create({ ...dto, owner: ownerId });
  }

  findMine(ownerId: string): Promise<PetDocument[]> {
    return this.pets.find({ owner: ownerId }).sort({ createdAt: -1 }).exec();
  }

  async findOwned(id: string, ownerId: string): Promise<PetDocument> {
    const pet = await this.pets.findById(id).exec();
    if (!pet) throw new NotFoundException('Pet not found');
    if (!pet.owner.equals(ownerId)) {
      throw new ForbiddenException('You do not own this pet');
    }
    return pet;
  }

  async update(
    id: string,
    ownerId: string,
    dto: UpdatePetDto,
  ): Promise<PetDocument> {
    const pet = await this.findOwned(id, ownerId);
    pet.set(dto);
    return pet.save();
  }

  static toView(pet: PetDocument) {
    return {
      id: pet.id,
      name: pet.name,
      species: pet.species,
      sex: pet.sex,
      size: pet.size,
      color: pet.color ?? null,
      vaccines: pet.vaccines ?? null,
      description: pet.description ?? null,
      photo: pet.photo,
      createdAt: pet.createdAt,
    };
  }
}
