import React, { useRef } from "react";
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
import { useNotifications } from "../../hooks/useNotifications";
import NotificationItem from "./NotificationItem";
import dynamic from "next/dynamic";

// Disable SSR for this component to prevent hydration issues
const NotificationDropdown = dynamic(() => Promise.resolve(NotificationDropdownComponent), {
  ssr: false,
  loading: () => <NotificationDropdownSkeleton />
});

const NotificationDropdownSkeleton = () => (
  <Box position="relative">
    <Flex
      mr={1.5}
      ml={1.5}
      padding={1}
      cursor="pointer"
      borderRadius={4}
      _hover={{ bg: "gray.200" }}
      position="relative"
    >
      <IoNotificationsOutline fontSize={20} />
    </Flex>
  </Box>
);

type NotificationDropdownProps = {
  isOpen: boolean;
  onToggle: () => void;
};

const NotificationDropdownComponent: React.FC<NotificationDropdownProps> = ({
  isOpen,
  onToggle,
}) => {
  // Trigger initial DB fetch only the first time the menu opens
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications(isOpen && !false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useOutsideClick({
    ref: dropdownRef,
    handler: () => {
      if (isOpen) onToggle();
    },
  });

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
                onClick={markAllAsRead}
              >
                Mark all as read
              </Button>
            )}
          </Flex>

          <Box maxH="400px" overflowY="auto">
            {loading ? (
              <Flex
                p={6}
                justify="center"
                align="center"
                direction="column"
                color="gray.500"
              >
                <Text fontSize="sm">Loading notifications...</Text>
              </Flex>
            ) : notifications.length === 0 ? (
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
                  onMarkAsRead={markAsRead}
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
