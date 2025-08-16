import React, { useEffect, useState } from "react";
import { Box, Flex, Text, Avatar } from "@chakra-ui/react";
import { doc, getDoc } from "firebase/firestore";
import { firestore } from "../../firebase/clientApp";
import { Notification } from "../../atoms/notificationsAtom";

type NotificationItemProps = {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
};

interface UserData {
  displayName: string;
  photoURL?: string;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
}) => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

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

  const formatTimeAgo = (timestamp: any) => {
    if (!timestamp) return "Just now";
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
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
      onClick={() => onMarkAsRead(notification.id)}
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
            {formatTimeAgo(notification.timestamp)}
          </Text>
        </Box>
      </Flex>
    </Box>
  );
};

export default NotificationItem;
