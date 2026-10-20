import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { CommentType } from '../common/enums';

@Schema({ timestamps: true })
export class Notification {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  recipient: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Publication', required: true })
  publication: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Comment', required: true })
  comment: Types.ObjectId;

  @Prop({ required: true, enum: CommentType })
  type: CommentType;

  @Prop({ required: true })
  message: string;

  @Prop({ default: false, index: true })
  read: boolean;

  createdAt?: Date;
}

export type NotificationDocument = HydratedDocument<Notification>;
export const NotificationSchema = SchemaFactory.createForClass(Notification);
