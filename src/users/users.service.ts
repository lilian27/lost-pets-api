import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { isDuplicateKey } from '../common/mongo-errors';
import { PrivateUserView, PublicUserView, UpdateUserDto } from './dto';
import { User, UserDocument } from './user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly users: Model<User>) {}

  async create(data: User): Promise<UserDocument> {
    await this.assertUnique({ alias: data.alias, email: data.email });
    try {
      return await this.users.create(data);
    } catch (err) {
      throw UsersService.mapDuplicate(err);
    }
  }

  findByEmailWithPassword(email: string) {
    return this.users
      .findOne({ email: email.toLowerCase().trim() })
      .select('+passwordHash')
      .exec();
  }

  async findById(id: string): Promise<UserDocument> {
    const user = await this.users.findById(id).exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserDocument> {
    if (dto.alias) await this.assertUnique({ alias: dto.alias }, id);
    const user = await this.findById(id);
    user.set(dto);
    try {
      return await user.save();
    } catch (err) {
      throw UsersService.mapDuplicate(err);
    }
  }

  private async assertUnique(
    fields: { alias?: string; email?: string },
    excludeId?: string,
  ) {
    const or: Record<string, string>[] = [];
    if (fields.alias) or.push({ alias: fields.alias });
    if (fields.email) or.push({ email: fields.email.toLowerCase().trim() });
    const query = this.users.findOne({ $or: or });
    if (excludeId) query.where('_id').ne(excludeId);
    const existing = await query.exec();
    if (existing) {
      throw new ConflictException(
        existing.alias === fields.alias
          ? 'Alias is already taken'
          : 'Email is already registered',
      );
    }
  }

  private static mapDuplicate(err: unknown): unknown {
    if (!isDuplicateKey(err)) return err;
    return new ConflictException(
      err.keyPattern?.alias
        ? 'Alias is already taken'
        : 'Email is already registered',
    );
  }

  static toPrivate(user: UserDocument): PrivateUserView {
    return {
      id: user.id,
      alias: user.alias,
      name: user.name,
      email: user.email,
      phone: user.phone,
      commune: user.commune,
      createdAt: user.createdAt,
    };
  }

  static toPublic(user: UserDocument): PublicUserView {
    return { id: user.id, alias: user.alias };
  }
}
