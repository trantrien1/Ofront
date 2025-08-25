import React, { useState } from "react";
import { AddIcon } from "@chakra-ui/icons";
import { Box, Flex, Icon } from "@chakra-ui/react";
import { BsArrowUpRightCircle, BsChatDots } from "react-icons/bs";
import { GrAdd } from "react-icons/gr";
import { MdAdminPanelSettings } from "react-icons/md";
import {
  IoFilterCircleOutline,
  IoVideocamOutline,
} from "react-icons/io5";
import { useRouter } from "next/router";
import { useRecoilValue } from "recoil";
import { userState, UserData } from "../../../atoms/userAtom";
import useDirectory from "../../../hooks/useDirectory";
import NotificationDropdown from "../../Notifications/NotificationDropdown";
import CreatePostModal from "../../Modal/CreatePost";

type ActionIconsProps = { onOpenChat?: () => void };

const ActionIcons: React.FC<ActionIconsProps> = ({ onOpenChat }) => {
  const { toggleMenuOpen } = useDirectory();
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

  const handlePostCreated = async () => {
    try { await router.push('/?refreshDelay=2000'); } catch {}
  };

  const goToAdminDashboard = () => {
    router.push('/admin');
  };

  return (
    <Flex alignItems="center" flexGrow={1}>
      <Box
        display={{ base: "none", md: "flex" }}
        alignItems="center"
        borderRight="1px solid"
        borderColor="gray.200"
      >
        <Flex
          mr={1.5}
          ml={1.5}
          padding={1}
          cursor="pointer"
          borderRadius={4}
          _hover={{ bg: "gray.200" }}
        >
          <Icon as={BsArrowUpRightCircle} fontSize={20} />
        </Flex>
        <Flex
          mr={1.5}
          ml={1.5}
          padding={1}
          cursor="pointer"
          borderRadius={4}
          _hover={{ bg: "gray.200" }}
        >
          <Icon as={IoFilterCircleOutline} fontSize={22} />
        </Flex>
        <Flex
          mr={1.5}
          ml={1.5}
          padding={1}
          cursor="pointer"
          borderRadius={4}
          _hover={{ bg: "gray.200" }}
        >
          <Icon as={IoVideocamOutline} fontSize={22} />
        </Flex>
      </Box>
      <>
        <Flex
          mr={1.5}
          ml={1.5}
          padding={1}
          cursor="pointer"
          borderRadius={4}
          _hover={{ bg: "gray.200" }}
          onClick={onOpenChat}
        >
          <Icon as={BsChatDots} fontSize={20} />
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
            _hover={{ bg: "gray.200" }}
            onClick={goToAdminDashboard}
            title="Admin Dashboard"
          >
            <Icon as={MdAdminPanelSettings} fontSize={20} color="red.500" />
          </Flex>
        )}
        <Flex
          display={{ base: "none", md: "flex" }}
          mr={3}
          ml={1.5}
          padding={1}
          cursor="pointer"
          borderRadius={4}
          _hover={{ bg: "gray.200" }}
          onClick={() => setIsCreatePostOpen(true)}
        >
          <Icon as={GrAdd} fontSize={20} />
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
