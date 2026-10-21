import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CommentType } from '../common/enums';
import { PaginationQuery, toPaging } from '../common/pagination.dto';
import { Notification, NotificationDocument } from './notification.schema';

const TYPE_LABEL: Record<CommentType, string> = {
  [CommentType.COMMENT]: 'comment',
  [CommentType.SIGHTING]: 'sighting',
  [CommentType.POSSIBLE_FINDING]: 'possible finding',
};

export const DEFAULT_NOTIFICATIONS_PAGE_SIZE = 50;

export interface NewNotification {
  recipientId: string;
  publicationId: string;
  commentId: string;
  type: CommentType;
  actorName: string;
  petName: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notifications: Model<Notification>,
  ) {}

  create(n: NewNotification): Promise<NotificationDocument> {
    return this.notifications.create({
      recipient: n.recipientId,
      publication: n.publicationId,
      comment: n.commentId,
      type: n.type,
      message: `${n.actorName} reported a ${TYPE_LABEL[n.type]} on your publication for ${n.petName}`,
    });
  }

  listMine(
    userId: string,
    query: PaginationQuery,
  ): Promise<NotificationDocument[]> {
    const { skip, limit } = toPaging(query, DEFAULT_NOTIFICATIONS_PAGE_SIZE);
    return this.notifications
      .find({ recipient: userId })
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  unreadCount(userId: string): Promise<number> {
    return this.notifications
      .countDocuments({ recipient: userId, read: false })
      .exec();
  }

  async markRead(id: string, userId: string): Promise<NotificationDocument> {
    const n = await this.notifications
      .findOneAndUpdate(
        { _id: id, recipient: userId },
        { read: true },
        { new: true },
      )
      .exec();
    if (!n) throw new NotFoundException('Notification not found');
    return n;
  }

  async markAllRead(userId: string): Promise<{ updated: number }> {
    const res = await this.notifications
      .updateMany({ recipient: userId, read: false }, { read: true })
      .exec();
    return { updated: res.modifiedCount };
  }

  static toView(n: NotificationDocument) {
    return {
      id: n.id as string,
      type: n.type,
      message: n.message,
      read: n.read,
      publicationId: n.publication.toString(),
      commentId: n.comment.toString(),
      createdAt: n.createdAt,
    };
  }
}
