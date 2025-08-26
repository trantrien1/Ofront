import { atom } from "recoil";
type Timestamp = any;

export interface Notification {
  id: string;
  type: "comment" | "like" | "follow" | "mention" | "post" | "moderation";
  message: string;
  userId: string; // ID of the user who triggered the notification
  targetUserId: string; // ID of the user who receives the notification
  postId?: string;
  commentId?: string; // ID of the specific comment for comment notifications
  postTitle?: string;
  communityName?: string;
  timestamp: Timestamp;
  read: boolean;
  pending?: boolean; // whether the related item needs approval
}

export interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  hasFetched?: boolean; // fetched from DB at least once in this session
}

const defaultNotificationsState: NotificationsState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  hasFetched: false,
};

export const notificationsState = atom<NotificationsState>({
  key: `atoms/notifications/notificationsState_${Date.now()}_${Math.random()}`,
  default: defaultNotificationsState,
});
