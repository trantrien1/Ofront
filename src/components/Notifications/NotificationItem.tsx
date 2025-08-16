import React, { useEffect, useState } from "react";
import {
  Avatar,
  Box,
  Flex,
  Text,
} from "@chakra-ui/react";
import { doc, getDoc } from "firebase/firestore";
import { firestore } from "../../firebase/clientApp";
import { Notification } from "../../atoms/notificationsAtom";
import { normalizeTimestamp, formatTimeAgo } from "../../helpers/timestampHelpers";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";

// Disable SSR for this component to prevent hydration issues
const NotificationItem = dynamic(() => Promise.resolve(NotificationItemComponent), {
  ssr: false,
  loading: () => <NotificationItemSkeleton />
});

const NotificationItemSkeleton = () => (
  <Box p={3} borderBottom="1px solid" borderColor="gray.100">
    <Flex align="start" gap={3}>
      <Avatar size="sm" />
      <Box flex={1}>
        <Text fontSize="sm" color="gray.500">Loading...</Text>
      </Box>
    </Flex>
  </Box>
);

type NotificationItemProps = {
  notification: Notification;
  onMarkAsRead: (notificationId: string) => void;
};

type UserData = {
  displayName: string;
  photoURL: string;
};

const NotificationItemComponent: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
}) => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Fetch user data for the notification
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userDoc = await getDoc(doc(firestore, "users", notification.userId));
        if (userDoc.exists()) {
          setUserData(userDoc.data() as UserData);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [notification.userId]);

  const formatTimeAgoLocal = (timestamp: any) => {
    if (!timestamp) return "Just now";
    
    try {
      return formatTimeAgo(normalizeTimestamp(timestamp));
    } catch (error) {
      console.error("Error formatting timestamp:", error);
      return "Just now";
    }
  };

  const getTypeEmoji = () => {
    switch (notification.type) {
      case "comment":
        return "💬";
      case "like":
        return "❤️";
      case "follow":
        return "👥";
      case "mention":
        return "📢";
      default:
        return "📌";
    }
  };

  const handleNotificationClick = () => {
    // Mark notification as read
    onMarkAsRead(notification.id);

    // Navigate to the relevant page
    if (notification.type === "comment" && notification.postId && notification.communityName) {
      const url = `/r/${notification.communityName}/comments/${notification.postId}`;
      // If we have a commentId, add it as a hash to highlight the specific comment
      const fullUrl = notification.commentId ? `${url}#comment-${notification.commentId}` : url;
      router.push(fullUrl);
    }
    // Add other notification types navigation here if needed
  };

  if (loading) {
    return (
      <Box p={3} borderBottom="1px solid" borderColor="gray.100">
        <Text fontSize="sm" color="gray.500">Loading...</Text>
      </Box>
    );
  }

  return (
    <Box
      p={3}
      borderBottom="1px solid"
      borderColor="gray.100"
      bg={notification.read ? "white" : "blue.50"}
      cursor="pointer"
      _hover={{ bg: "gray.50" }}
      onClick={handleNotificationClick}
    >
      <Flex align="start" gap={3}>
        <Avatar
          size="sm"
          src={userData?.photoURL}
          name={userData?.displayName || "Unknown User"}
        />
        <Box flex={1}>
          <Flex align="center" gap={2} mb={1}>
            <Text fontSize="16px">{getTypeEmoji()}</Text>
            <Text fontSize="sm" fontWeight="medium">
              {userData?.displayName || "Unknown User"}
            </Text>
          </Flex>
          <Text fontSize="sm" color="gray.600" mb={1}>
            {notification.message}
          </Text>
          {notification.postTitle && (
            <Text fontSize="xs" color="gray.500" fontStyle="italic">
              "{notification.postTitle}"
            </Text>
          )}
          {notification.communityName && (
            <Text fontSize="xs" color="blue.500">
              r/{notification.communityName}
            </Text>
          )}
          <Text fontSize="xs" color="gray.400" mt={1}>
            {formatTimeAgoLocal(notification.timestamp)}
          </Text>
        </Box>
      </Flex>
    </Box>
  );
};

export default NotificationItem;
