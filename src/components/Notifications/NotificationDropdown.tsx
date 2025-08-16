import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Flex,
  Text,
  Button,
  Badge,
  Divider,
  useOutsideClick,
} from "@chakra-ui/react";
import { IoNotificationsOutline } from "react-icons/io5";
import { NotificationData } from "./NotificationItem";
import NotificationItem from "./NotificationItem";

type NotificationDropdownProps = {
  isOpen: boolean;
  onToggle: () => void;
};

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  isOpen,
  onToggle,
}) => {
  const [notifications, setNotifications] = useState<NotificationData[]>([
    {
      id: "1",
      type: "comment",
      message: "commented on your post",
      user: {
        displayName: "John Doe",
        photoURL: "https://bit.ly/dan-abramov",
      },
      postTitle: "My first Reddit post",
      communityName: "programming",
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      read: false,
    },
    {
      id: "2",
      type: "like",
      message: "liked your comment",
      user: {
        displayName: "Jane Smith",
      },
      postTitle: "React vs Vue discussion",
      communityName: "webdev",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      read: false,
    },
    {
      id: "3",
      type: "follow",
      message: "started following you",
      user: {
        displayName: "Mike Johnson",
        photoURL: "https://bit.ly/ryan-florence",
      },
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      read: true,
    },
    {
      id: "4",
      type: "mention",
      message: "mentioned you in a comment",
      user: {
        displayName: "Sarah Wilson",
      },
      postTitle: "Best practices for TypeScript",
      communityName: "typescript",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
      read: true,
    },
  ]);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useOutsideClick({
    ref: dropdownRef,
    handler: () => {
      if (isOpen) onToggle();
    },
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((notification) => ({ ...notification, read: true }))
    );
  };

  return (
    <Box position="relative" ref={dropdownRef}>
      <Flex
        mr={1.5}
        ml={1.5}
        padding={1}
        cursor="pointer"
        borderRadius={4}
        _hover={{ bg: "gray.200" }}
        onClick={onToggle}
        position="relative"
      >
        <IoNotificationsOutline fontSize={20} />
        {unreadCount > 0 && (
          <Badge
            position="absolute"
            top="-2px"
            right="-2px"
            colorScheme="red"
            borderRadius="full"
            fontSize="xs"
            minW="18px"
            h="18px"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
        )}
      </Flex>

      {isOpen && (
        <Box
          position="absolute"
          top="100%"
          right={0}
          mt={2}
          w="400px"
          maxH="500px"
          bg="white"
          border="1px solid"
          borderColor="gray.200"
          borderRadius="md"
          boxShadow="lg"
          zIndex={1000}
          overflow="hidden"
        >
          <Flex
            p={3}
            borderBottom="1px solid"
            borderColor="gray.200"
            justify="space-between"
            align="center"
          >
            <Text fontWeight="bold" fontSize="sm">
              Notifications
            </Text>
            {unreadCount > 0 && (
              <Button
                size="xs"
                variant="ghost"
                colorScheme="blue"
                onClick={handleMarkAllAsRead}
              >
                Mark all as read
              </Button>
            )}
          </Flex>

          <Box maxH="400px" overflowY="auto">
            {notifications.length === 0 ? (
              <Flex
                p={6}
                justify="center"
                align="center"
                direction="column"
                color="gray.500"
              >
                <IoNotificationsOutline fontSize={40} />
                <Text mt={2} fontSize="sm">
                  No notifications yet
                </Text>
              </Flex>
            ) : (
              notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                />
              ))
            )}
          </Box>

          {notifications.length > 0 && (
            <>
              <Divider />
              <Flex p={3} justify="center">
                <Button size="sm" variant="ghost" colorScheme="blue">
                  View all notifications
                </Button>
              </Flex>
            </>
          )}
        </Box>
      )}
    </Box>
  );
};

export default NotificationDropdown;
