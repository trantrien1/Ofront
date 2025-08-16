import { atom } from "recoil";
import { Timestamp } from "firebase/firestore";

export interface Notification {
  id: string;
  type: "comment" | "like" | "follow" | "mention";
  message: string;
  userId: string; // ID of the user who triggered the notification
  targetUserId: string; // ID of the user who receives the notification
  postId?: string;
  commentId?: string; // ID of the specific comment for comment notifications
  postTitle?: string;
  communityName?: string;
  timestamp: Timestamp;
  read: boolean;
}

export interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
}

const defaultNotificationsState: NotificationsState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
};

export const notificationsState = atom<NotificationsState>({
  key: `atoms/notifications/notificationsState_${Date.now()}_${Math.random()}`,
  default: defaultNotificationsState,
});
