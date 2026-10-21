import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { MAX_COMMENT_LENGTH } from '../common/constants';
import { CommentType } from '../common/enums';

@Schema({ timestamps: true })
export class Comment {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Publication',
    required: true,
    index: true,
  })
  publication: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  author?: Types.ObjectId;

  @Prop({ trim: true })
  authorName?: string;

  @Prop({ trim: true, lowercase: true, select: false })
  authorEmail?: string;

  @Prop({ required: true, enum: CommentType, default: CommentType.COMMENT })
  type: CommentType;

  @Prop({ required: true, trim: true, maxlength: MAX_COMMENT_LENGTH })
  text: string;

  @Prop()
  photo?: string;

  @Prop({ select: false })
  editTokenHash?: string;

  @Prop({ type: [{ type: SchemaTypes.ObjectId, ref: 'User' }], default: [] })
  flaggedBy: Types.ObjectId[];

  @Prop({ default: 0 })
  flagCount: number;

  @Prop()
  editedAt?: Date;

  createdAt?: Date;
}

export type CommentDocument = HydratedDocument<Comment>;
export const CommentSchema = SchemaFactory.createForClass(Comment);
