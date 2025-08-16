import React from "react";
import { Box, Flex, Text, Avatar } from "@chakra-ui/react";

export interface NotificationData {
  id: string;
  type: "comment" | "like" | "follow" | "mention";
  message: string;
  user: {
    displayName: string;
    photoURL?: string;
  };
  postTitle?: string;
  communityName?: string;
  timestamp: Date;
  read: boolean;
}

type NotificationItemProps = {
  notification: NotificationData;
  onMarkAsRead: (id: string) => void;
};

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
}) => {
  const formatTimeAgo = (date: Date) => {
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
          src={notification.user.photoURL}
          name={notification.user.displayName}
        />
        <Box flex={1}>
          <Flex align="center" gap={2} mb={1}>
            <Text fontSize="16px">{getTypeEmoji()}</Text>
            <Text fontSize="sm" fontWeight="medium">
              {notification.user.displayName}
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
