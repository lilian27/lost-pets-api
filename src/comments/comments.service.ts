import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createHash, randomBytes } from 'crypto';
import { Model } from 'mongoose';
import { AuthUser } from '../common/auth.guard';
import { CommentType } from '../common/enums';
import { NotificationsService } from '../notifications/notifications.service';
import { PublicationsService } from '../publications/publications.service';
import { UserDocument } from '../users/user.schema';
import { UsersService } from '../users/users.service';
import { Comment, CommentDocument } from './comment.schema';
import { CreateCommentDto, UpdateCommentDto } from './dto/comment.dto';

const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');

type CommentWithAuthor = Omit<CommentDocument, 'author'> & {
  author?: UserDocument | null;
};

@Injectable()
export class CommentsService {
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
    let editToken: string | undefined;
    const base = {
      publication: pub.id,
      type: dto.type ?? CommentType.COMMENT,
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

    if (!user || pub.owner.id !== user.sub) {
      await this.notifications.create({
        recipientId: pub.owner.id,
        publicationId: pub.id,
        commentId: created.id,
        type: created.type,
        actorName: user ? user.alias : (dto.authorName as string),
        petName: pub.pet.name,
      });
    }

    const populated = await this.withAuthor(created);
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
    const alreadyFlagged =
      !!user && comment.flaggedBy.some((u) => u.equals(user.sub));
    if (!alreadyFlagged) {
      if (user) comment.flaggedBy.push(user.sub as never);
      comment.flagCount += 1;
      await comment.save();
    }
    return CommentsService.toView(await this.withAuthor(comment), user);
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
