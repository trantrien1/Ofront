import React, { useState } from "react";
import { Flex, Icon, useColorModeValue } from "@chakra-ui/react";
import { BsChatDots } from "react-icons/bs";
import { GrAdd } from "react-icons/gr";
import { MdAdminPanelSettings } from "react-icons/md";
import { useRouter } from "next/router";
import { useRecoilValue } from "recoil";
import { userState, UserData } from "../../../atoms/userAtom";
import NotificationDropdown from "../../Notifications/NotificationDropdown";
import CreatePostModal from "../../Modal/CreatePost";

type ActionIconsProps = { onOpenChat?: () => void };

const ActionIcons: React.FC<ActionIconsProps> = ({ onOpenChat }) => {
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const router = useRouter();
  const user = useRecoilValue(userState) as UserData | null;

  // Check if user is admin
  const ADMIN_EMAILS = [
    'admin@example.com',
    'administrator@example.com',
    'admin@rehearten.com',
  ];
  const isAdmin = user && user.email && ADMIN_EMAILS.includes(user.email);
  const hoverBg = useColorModeValue("gray.200", "whiteAlpha.200");
  const iconMuted = useColorModeValue("gray.600", "gray.300");
  const adminIcon = useColorModeValue("red.500", "red.300");

  // Navigation after creating a post is handled inside the CreatePost modal.
  // Avoid redirecting to home here to prevent jumping away from community pages.
  const handlePostCreated = () => {};

  const goToAdminDashboard = () => {
    router.push('/admin');
  };

  return (
    <Flex alignItems="center" flexGrow={1}>
      {/** Use softer icon colors to make outlines lighter in dark mode */}
      {/** Shared colors */}
      {(() => null)()}
      <>
        <Flex
          mr={1.5}
          ml={1.5}
          padding={1}
          cursor="pointer"
          borderRadius={4}
          _hover={{ bg: hoverBg }}
          onClick={onOpenChat}
        >
          <Icon as={BsChatDots} fontSize={20} color={iconMuted} />
        </Flex>
        <NotificationDropdown
          isOpen={isNotificationOpen}
          onToggle={() => setIsNotificationOpen(!isNotificationOpen)}
        />
        {/* Admin Dashboard Icon - only show for admin users */}
  {isAdmin && (
          <Flex
            mr={1.5}
            ml={1.5}
            padding={1}
            cursor="pointer"
            borderRadius={4}
            _hover={{ bg: hoverBg }}
            onClick={goToAdminDashboard}
            title="Admin Dashboard"
          >
            <Icon as={MdAdminPanelSettings} fontSize={20} color={adminIcon} />
          </Flex>
        )}
        <Flex
          display={{ base: "none", md: "flex" }}
          mr={3}
          ml={1.5}
          padding={1}
          cursor="pointer"
          borderRadius={4}
          _hover={{ bg: hoverBg }}
          onClick={() => setIsCreatePostOpen(true)}
        >
          <Icon as={GrAdd} fontSize={20} color={iconMuted} />
        </Flex>
      </>
      
      {/* Create Post Modal */}
      <CreatePostModal 
        isOpen={isCreatePostOpen}
        onClose={() => setIsCreatePostOpen(false)}
        onPostCreated={handlePostCreated}
      />
    </Flex>
  );
};
export default ActionIcons;
