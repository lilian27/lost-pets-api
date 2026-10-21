import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createHash, randomBytes } from 'crypto';
import { Model } from 'mongoose';
import { AuthUser } from '../common/auth.guard';
import { CommentType, PublicationStatus } from '../common/enums';
import { NotificationsService } from '../notifications/notifications.service';
import { PublicationsService } from '../publications/publications.service';
import { UserDocument } from '../users/user.schema';
import { UsersService } from '../users/users.service';
import { Comment, CommentDocument } from './comment.schema';
import { CreateCommentDto, UpdateCommentDto } from './dto/comment.dto';

export const PUBLICATION_CLOSED =
  'This publication is closed and no longer accepts comments';
export const POSSIBLE_FINDING_REQUIRES_ACCOUNT =
  'Only registered users can report a possible finding';

const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');

type CommentWithAuthor = Omit<CommentDocument, 'author'> & {
  author?: UserDocument | null;
};

@Injectable()
export class CommentsService {
  private readonly logger = new Logger(CommentsService.name);

  constructor(
    @InjectModel(Comment.name) private readonly comments: Model<Comment>,
    private readonly publications: PublicationsService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(
    publicationId: string,
    dto: CreateCommentDto,
    user: AuthUser | null,
  ) {
    const pub = await this.publications.findVisible(publicationId, user);
    if (pub.status !== PublicationStatus.ACTIVE) {
      throw new ConflictException(PUBLICATION_CLOSED);
    }
    const type = dto.type ?? CommentType.COMMENT;
    if (!user && type === CommentType.POSSIBLE_FINDING) {
      throw new ForbiddenException(POSSIBLE_FINDING_REQUIRES_ACCOUNT);
    }
    let editToken: string | undefined;
    const base = {
      publication: pub.id,
      type,
      text: dto.text,
      photo: dto.photo,
    };
    let created: CommentDocument;
    if (user) {
      created = await this.comments.create({ ...base, author: user.sub });
    } else {
      if (!dto.authorName || !dto.authorEmail) {
        throw new BadRequestException(
          'authorName and authorEmail are required for anonymous comments',
        );
      }
      editToken = randomBytes(24).toString('hex');
      created = await this.comments.create({
        ...base,
        authorName: dto.authorName,
        authorEmail: dto.authorEmail,
        editTokenHash: hashToken(editToken),
      });
    }

    const populated = await this.withAuthor(created);
    if (!user || pub.owner.id !== user.sub) {
      try {
        await this.notifications.create({
          recipientId: pub.owner.id,
          publicationId: pub.id,
          commentId: created.id,
          type: created.type,
          actorName: populated.author?.alias ?? (dto.authorName as string),
          petName: pub.pet.name,
        });
      } catch (err) {
        this.logger.error(
          `Could not notify owner about comment ${created.id}`,
          (err as Error).stack,
        );
      }
    }

    return {
      ...CommentsService.toView(populated, user),
      ...(editToken ? { editToken } : {}),
    };
  }

  async list(publicationId: string, user: AuthUser | null) {
    const pub = await this.publications.findVisible(publicationId, user);
    const comments = await this.comments
      .find({ publication: pub.id })
      .sort({ createdAt: 1, _id: 1 })
      .populate<{ author?: UserDocument | null }>('author')
      .exec();
    return comments.map((c) =>
      CommentsService.toView(c as unknown as CommentWithAuthor, user),
    );
  }

  async update(
    id: string,
    dto: UpdateCommentDto,
    user: AuthUser | null,
    editToken?: string,
  ) {
    const comment = await this.comments
      .findById(id)
      .select('+editTokenHash')
      .exec();
    if (!comment) throw new NotFoundException('Comment not found');
    await this.publications.findVisible(comment.publication.toString(), user);
    const isAuthor = !!user && !!comment.author?.equals(user.sub);
    const hasToken =
      !comment.author &&
      !!editToken &&
      hashToken(editToken) === comment.editTokenHash;
    if (!isAuthor && !hasToken) {
      throw new ForbiddenException('Only the author can edit this comment');
    }
    comment.text = dto.text;
    comment.editedAt = new Date();
    await comment.save();
    return CommentsService.toView(await this.withAuthor(comment), user);
  }

  async flag(id: string, user: AuthUser | null) {
    const comment = await this.comments.findById(id).exec();
    if (!comment) throw new NotFoundException('Comment not found');
    await this.publications.findVisible(comment.publication.toString(), user);
    // Atomic so concurrent flags are neither lost nor double-counted.
    const updated = await this.comments
      .findOneAndUpdate(
        user ? { _id: id, flaggedBy: { $ne: user.sub } } : { _id: id },
        {
          $inc: { flagCount: 1 },
          ...(user ? { $addToSet: { flaggedBy: user.sub } } : {}),
        },
        { new: true },
      )
      .exec();
    return CommentsService.toView(
      await this.withAuthor(updated ?? comment),
      user,
    );
  }

  private async withAuthor(c: CommentDocument) {
    return (await c.populate('author')) as unknown as CommentWithAuthor;
  }

  static toView(c: CommentWithAuthor, viewer: AuthUser | null) {
    const author = c.author ?? null;
    return {
      id: c.id as string,
      publicationId: c.publication.toString(),
      type: c.type,
      text: c.text,
      photo: c.photo ?? null,
      isAnonymous: !author,
      authorName: author ? author.alias : (c.authorName as string),
      author: author ? UsersService.toPublic(author) : null,
      flagCount: c.flagCount,
      flagged: c.flagCount > 0,
      flaggedByMe:
        !!viewer && c.flaggedBy.some((u) => u.toString() === viewer.sub),
      edited: !!c.editedAt,
      editedAt: c.editedAt ?? null,
      createdAt: c.createdAt,
      canEdit: !!viewer && !!author && author.id === viewer.sub,
    };
  }
}
