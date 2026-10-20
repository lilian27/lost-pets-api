import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { PublicationStatus, Species } from '../common/enums';

@Schema({ timestamps: true })
export class Publication {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  owner: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Pet', required: true })
  pet: Types.ObjectId;

  @Prop({ required: true, enum: Species, index: true })
  species: Species;

  @Prop({ required: true, trim: true, index: true })
  commune: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ trim: true })
  lastSeenAddress?: string;

  @Prop({ required: true })
  lostAt: Date;

  @Prop({
    required: true,
    enum: PublicationStatus,
    default: PublicationStatus.ACTIVE,
    index: true,
  })
  status: PublicationStatus;

  @Prop()
  foundAt?: Date;

  createdAt?: Date;
}

export type PublicationDocument = HydratedDocument<Publication>;
export const PublicationSchema = SchemaFactory.createForClass(Publication);
PublicationSchema.index(
  { pet: 1 },
  {
    unique: true,
    partialFilterExpression: { status: PublicationStatus.ACTIVE },
  },
);
