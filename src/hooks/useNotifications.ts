import { useEffect, useState } from "react";
import { useRecoilState } from "recoil";
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { firestore } from "../firebase/clientApp";
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
    
    const notificationsQuery = query(
      collection(firestore, "notifications"),
      where("targetUserId", "==", user.uid)
      // Temporarily remove orderBy to avoid composite index requirement
      // orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Notification[];

      // Sort notifications by timestamp in descending order on client side
      const sortedNotifications = notifications.sort((a, b) => {
        const aTime = a.timestamp?.toDate?.() || new Date();
        const bTime = b.timestamp?.toDate?.() || new Date();
        return bTime.getTime() - aTime.getTime();
      });

      const unreadCount = sortedNotifications.filter(n => !n.read).length;

      setNotificationsStateValue(prev => ({
        ...prev,
        notifications: sortedNotifications,
        unreadCount,
        loading: false,
      }));
    }, (error) => {
      console.error("Error fetching notifications:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, setNotificationsStateValue]);

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    if (!user) return;

    try {
      const notificationRef = doc(firestore, "notifications", notificationId);
      await updateDoc(notificationRef, {
        read: true,
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
      
      const updatePromises = unreadNotifications.map(notification => {
        const notificationRef = doc(firestore, "notifications", notification.id);
        return updateDoc(notificationRef, { read: true });
      });

      await Promise.all(updatePromises);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  // Create notification (called when someone comments, likes, etc.)
  const createNotification = async (notificationData: Omit<Notification, "id" | "timestamp" | "read">) => {
    try {
      await addDoc(collection(firestore, "notifications"), {
        ...notificationData,
        timestamp: serverTimestamp(),
        read: false,
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
