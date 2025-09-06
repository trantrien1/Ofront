import { useEffect, useState } from "react";
import { useRecoilState } from "recoil";
import { notificationsState, Notification } from "../atoms/notificationsAtom";
import useAuth from "./useAuth";
import { normalizeTimestamp } from "../helpers/timestampHelpers";

// Helper: detect if a date string lacks timezone then treat as UTC and shift to VN (UTC+7)
function normalizeServerUtc(input: any): Date {
  // If backend already sends ISO with Z or offset, let normalizeTimestamp handle timezone projection
  try {
    if (typeof input === 'string') {
      const s = input.trim();
      const hasOffset = /Z$/i.test(s) || /[+\-]\d{2}:?\d{2}$/.test(s);
      if (!hasOffset) {
        // Interpret as UTC naive then add 7h
        const d = new Date(s + 'Z'); // force treat as UTC
        if (!isNaN(d.getTime())) {
          d.setHours(d.getHours() + 7);
          return d;
        }
      }
    }
    // Fallback: just use existing normalizer (which applies Asia/Ho_Chi_Minh)
    return normalizeTimestamp(input, 'Asia/Ho_Chi_Minh');
  } catch {
    return new Date();
  }
}
// Optional param: requestInitialFetch indicates the UI has opened the dropdown for the first time
export const useNotifications = (requestInitialFetch?: boolean) => {
  const [notificationsStateValue, setNotificationsStateValue] = useRecoilState(notificationsState);
  const { currentUser } = useAuth() as any;
  const [loading, setLoading] = useState(false);
  // We fetch from DB only once on first open, then rely on realtime updates

  // Fetch notifications for current user (optional, default disabled)
  useEffect(() => {
  if (!currentUser) {
      setNotificationsStateValue(prev => ({
        ...prev,
        notifications: [],
        unreadCount: 0,
        hasFetched: false,
      }));
      return;
    }
  // Only fetch from DB once when the dropdown is first requested, then rely on realtime
  if (notificationsStateValue.hasFetched || !requestInitialFetch) {
      setNotificationsStateValue(prev => ({ ...prev, loading: false }));
      return;
    }

    setLoading(true);
    const abort = new AbortController();
  const load = async () => {
      try {
  const { NotificationsService } = await import("../services");
  const data = await NotificationsService.getUserNotifications();
        const sorted = (data || []).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const mapped = sorted.map((n: any) => {
          // First adjust naive UTC -> VN, then rely on TimeCell / relative formatting later
          const normalizedDate = normalizeServerUtc(n.createdAt);
          return {
            id: n.id?.toString?.() || n.id,
            type: n.type || "comment",
            message: n.content || n.message || n.title || "",
            userId: n.userId || n.actorId || "",
            targetUserId: n.targetUserId || n.userId,
            postId: n.postId,
            commentId: n.commentId,
            postTitle: n.postTitle,
            communityName: n.communityName,
            // Store both raw date accessor and cached normalizedDate if needed elsewhere
            timestamp: { toDate: () => normalizedDate } as any,
            read: !!n.isRead,
          } as Notification;
        }) as Notification[];

        const unreadCount = mapped.filter(n => !n.read).length;
         setNotificationsStateValue(prev => ({
          ...prev,
          notifications: mapped,
          unreadCount,
          loading: false,
          hasFetched: true,
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
  }, [currentUser, setNotificationsStateValue, notificationsStateValue.hasFetched, requestInitialFetch]);

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    if (!currentUser) return;

  try {
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
      const { NotificationsService } = await import("../services");
      const unreadNotifications = notificationsStateValue.notifications.filter(n => !n.read);
      // Backend doesn't support batch read; fall back to sequential marks
      for (const n of unreadNotifications) {
        try { await NotificationsService.markNotificationAsRead(n.id); } catch {}
      }
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
