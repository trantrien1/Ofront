import { useEffect, useState } from "react";
import { useRecoilState } from "recoil";
import { notificationsState, Notification } from "../atoms/notificationsAtom";
import useAuth from "./useAuth";

export const useNotifications = () => {
  const [notificationsStateValue, setNotificationsStateValue] = useRecoilState(notificationsState);
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Fetch notifications for current user
  useEffect(() => {
    if (!user) {
      setNotificationsStateValue(prev => ({
        ...prev,
        notifications: [],
        unreadCount: 0,
      }));
      return;
    }

    setLoading(true);
    const abort = new AbortController();
    const load = async () => {
      try {
        const resp = await fetch(`/api/notifications?userId=${user.uid}`, { signal: abort.signal });
        const data = await resp.json();
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
  }, [user, setNotificationsStateValue]);

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    if (!user) return;

    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: notificationId, read: true })
      });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const unreadNotifications = notificationsStateValue.notifications.filter(n => !n.read);
      await Promise.all(
        unreadNotifications.map(n => fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: n.id, read: true })
        }))
      );
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  // Create notification (called when someone comments, likes, etc.)
  const createNotification = async (notificationData: Omit<Notification, "id" | "timestamp" | "read">) => {
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: notificationData.targetUserId,
          content: `${notificationData.message}`
        })
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
