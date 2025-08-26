import { useEffect, useState } from "react";
import { useRecoilState } from "recoil";
import { notificationsState, Notification } from "../atoms/notificationsAtom";
import useAuth from "./useAuth";

export const useNotifications = () => {
  const [notificationsStateValue, setNotificationsStateValue] = useRecoilState(notificationsState);
  const { currentUser } = useAuth() as any;
  const [loading, setLoading] = useState(false);
  const restEnabled = (process.env.NEXT_PUBLIC_NOTIFICATIONS_REST || '').toLowerCase() === 'true';

  // Fetch notifications for current user (optional, default disabled)
  useEffect(() => {
  if (!currentUser) {
      setNotificationsStateValue(prev => ({
        ...prev,
        notifications: [],
        unreadCount: 0,
      }));
      return;
    }
    // Skip REST fetch by default; rely on WebSocket STOMP updates
    if (!restEnabled) {
      setNotificationsStateValue(prev => ({ ...prev, loading: false }));
      return;
    }

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
          message: n.content || n.message || n.title || "",
          userId: n.userId || n.actorId || "",
          targetUserId: n.targetUserId || n.userId,
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

    try {
      if (!restEnabled) {
        // Local-only update
        setNotificationsStateValue(prev => {
          const updated = prev.notifications.map(n => n.id === notificationId ? { ...n, read: true } : n);
          return { ...prev, notifications: updated, unreadCount: updated.filter(n => !n.read).length };
        });
        return;
      }
      const { NotificationsService } = await import("../services");
      await NotificationsService.markNotificationAsRead(notificationId);
      setNotificationsStateValue(prev => {
        const updated = prev.notifications.map(n => n.id === notificationId ? { ...n, read: true } : n);
        return { ...prev, notifications: updated, unreadCount: updated.filter(n => !n.read).length };
      });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!currentUser) return;

    try {
      if (!restEnabled) {
        setNotificationsStateValue(prev => ({
          ...prev,
          notifications: prev.notifications.map(n => ({ ...n, read: true })),
          unreadCount: 0,
        }));
        return;
      }
      const { NotificationsService } = await import("../services");
      const unreadNotifications = notificationsStateValue.notifications.filter(n => !n.read);
      await NotificationsService.markManyNotificationsAsRead(unreadNotifications.map(n => n.id));
      setNotificationsStateValue(prev => ({
        ...prev,
        notifications: prev.notifications.map(n => ({ ...n, read: true })),
        unreadCount: 0,
      }));
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  // Create notification (called when someone comments, likes, etc.)
  const createNotification = async (notificationData: Omit<Notification, "id" | "timestamp" | "read">) => {
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
