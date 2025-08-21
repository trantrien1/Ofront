import { useEffect, useState } from "react";
import { useRecoilState } from "recoil";
import { notificationsState, Notification } from "../atoms/notificationsAtom";
import useAuth from "./useAuth";

export const useNotifications = () => {
  const [notificationsStateValue, setNotificationsStateValue] = useRecoilState(notificationsState);
  const { currentUser } = useAuth() as any;
  const [loading, setLoading] = useState(false);

  // Fetch notifications for current user
  useEffect(() => {
  if (!currentUser) {
      setNotificationsStateValue(prev => ({
        ...prev,
        notifications: [],
        unreadCount: 0,
      }));
      return;
    }

    // Disable notifications fetching for now to avoid 500 errors
    console.log("Notifications disabled - skipping fetch for user:", (currentUser as any).uid);
    setNotificationsStateValue(prev => ({
      ...prev,
      notifications: [],
      unreadCount: 0,
      loading: false,
    }));
    return;

    setLoading(true);
    const abort = new AbortController();
  const load = async () => {
      try {
        const { NotificationsService } = await import("../services");
  const data = await NotificationsService.getUserNotifications((currentUser as any).uid);
        const sorted = (data || []).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const mapped = sorted.map((n: any) => ({
          id: n.id?.toString?.() || n.id,
          type: n.type || "comment",
          message: n.content,
          userId: n.userId || "",
          targetUserId: n.userId,
          postId: n.postId,
          commentId: n.commentId,
          postTitle: n.postTitle,
          communityName: n.communityName,
          timestamp: { toDate: () => new Date(n.createdAt) } as any,
          read: !!n.isRead,
        })) as Notification[];

        const unreadCount = mapped.filter(n => !n.read).length;
        setNotificationsStateValue(prev => ({
          ...prev,
          notifications: mapped,
          unreadCount,
          loading: false,
        }));
      } catch (e) {
        if (!(e as any).name?.includes("Abort")) {
          console.error("Error fetching notifications:", e);
          setLoading(false);
        }
      }
    };
    load();

    return () => abort.abort();
  }, [currentUser, setNotificationsStateValue]);

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    if (!currentUser) return;

    // Disabled for now
    console.log("markAsRead disabled for notificationId:", notificationId);
    return;

    try {
      const { NotificationsService } = await import("../services");
      await NotificationsService.markNotificationAsRead(notificationId);
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!currentUser) return;

    // Disabled for now
    console.log("markAllAsRead disabled");
    return;

    try {
      const { NotificationsService } = await import("../services");
      const unreadNotifications = notificationsStateValue.notifications.filter(n => !n.read);
      await NotificationsService.markManyNotificationsAsRead(unreadNotifications.map(n => n.id));
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  // Create notification (called when someone comments, likes, etc.)
  const createNotification = async (notificationData: Omit<Notification, "id" | "timestamp" | "read">) => {
    // Disabled for now
    console.log("createNotification disabled for:", notificationData);
    return;

    try {
      const { NotificationsService } = await import("../services");
      await NotificationsService.createNotification({
        userId: notificationData.targetUserId,
        content: `${notificationData.message}`,
      });
    } catch (error) {
      console.error("Error creating notification:", error);
    }
  };

  return {
    notifications: notificationsStateValue.notifications,
    unreadCount: notificationsStateValue.unreadCount,
    loading: notificationsStateValue.loading,
    markAsRead,
    markAllAsRead,
    createNotification,
  };
};
