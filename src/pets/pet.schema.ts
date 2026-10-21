import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { MAX_VACCINES_LENGTH } from '../common/constants';
import { Sex, Size, Species } from '../common/enums';

@Schema({ timestamps: true })
export class Pet {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  owner: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, enum: Species })
  species: Species;

  @Prop({ required: true, enum: Sex })
  sex: Sex;

  @Prop({ required: true, enum: Size })
  size: Size;

  @Prop({ trim: true })
  color?: string;

  @Prop({ trim: true, maxlength: MAX_VACCINES_LENGTH })
  vaccines?: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ required: true })
  photo: string;

  createdAt?: Date;
}

export type PetDocument = HydratedDocument<Pet>;
export const PetSchema = SchemaFactory.createForClass(Pet);
