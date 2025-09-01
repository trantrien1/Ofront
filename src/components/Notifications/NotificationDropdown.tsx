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
import { useColorModeValue } from "@chakra-ui/react";
import { IoNotificationsOutline } from "react-icons/io5";
import { useNotifications } from "../../hooks/useNotifications";
import NotificationItem from "./NotificationItem";
import dynamic from "next/dynamic";

// Disable SSR for this component to prevent hydration issues
const NotificationDropdown = dynamic(() => Promise.resolve(NotificationDropdownComponent), {
  ssr: false,
  loading: () => <NotificationDropdownSkeleton />
});

const NotificationDropdownSkeleton = () => {
  const hoverBg = useColorModeValue("gray.200", "whiteAlpha.200");
  const iconCol = useColorModeValue("gray.600", "gray.300");
  return (
    <Box position="relative">
      <Flex
        mr={1.5}
        ml={1.5}
        padding={1}
        cursor="pointer"
        borderRadius={4}
        _hover={{ bg: hoverBg }}
        position="relative"
      >
        <IoNotificationsOutline fontSize={20} color={iconCol} />
      </Flex>
    </Box>
  );
};

type NotificationDropdownProps = {
  isOpen: boolean;
  onToggle: () => void;
};

const NotificationDropdownComponent: React.FC<NotificationDropdownProps> = ({
  isOpen,
  onToggle,
}) => {
  const hoverBg = useColorModeValue("gray.200", "whiteAlpha.200");
  const iconCol = useColorModeValue("gray.600", "gray.300");
  const sheetBg = useColorModeValue("white", "gray.800");
  const sheetBorder = useColorModeValue("gray.200", "gray.700");
  const headerTitle = useColorModeValue("gray.800", "gray.100");
  const muted = useColorModeValue("gray.500", "gray.400");
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
        _hover={{ bg: hoverBg }}
        onClick={onToggle}
        position="relative"
      >
        <IoNotificationsOutline fontSize={20} color={iconCol} />
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
          bg={sheetBg}
          border="1px solid"
          borderColor={sheetBorder}
          borderRadius="md"
          boxShadow="lg"
          zIndex={1000}
          overflow="hidden"
        >
          <Flex
            p={3}
            borderBottom="1px solid"
            borderColor={sheetBorder}
            justify="space-between"
            align="center"
          >
            <Text fontWeight="bold" fontSize="sm" color={headerTitle}>
              Thông báo
            </Text>
            {unreadCount > 0 && (
              <Button
                size="xs"
                variant="ghost"
                colorScheme="blue"
                onClick={markAllAsRead}
              >
                Đánh dấu tất cả là đã đọc
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
        color={muted}
              >
                <Text fontSize="sm">Đang tải thông báo...</Text>
              </Flex>
            ) : notifications.length === 0 ? (
              <Flex
                p={6}
                justify="center"
                align="center"
                direction="column"
        color={muted}
              >
        <IoNotificationsOutline fontSize={40} color={muted as any} />
                <Text mt={2} fontSize="sm">
                  Chưa có thông báo nào
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
        <Divider borderColor={sheetBorder} />
              <Flex p={3} justify="center">
                <Button size="sm" variant="ghost" colorScheme="blue">
                  Xem tất cả thông báo
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
