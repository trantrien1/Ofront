import React, { useEffect } from "react";
import { MdQuiz } from "react-icons/md";//quizz
import {
  Box,
  Flex,
  Text,
  Icon,
  VStack,
  HStack,
  Button,
  Divider,
  Avatar,
  Badge,
  useColorModeValue,
  Collapse,
  useDisclosure,
  IconButton,
  Tooltip,
} from "@chakra-ui/react";
import { useRouter } from "next/router";
// import { useAuthState } from "react-firebase-hooks/auth";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { userState } from "../../atoms/userAtom";
import {
  FaHome,
  FaFire,
  FaPlus,
  FaCog,
  FaCode,
  FaChevronDown,
  FaChevronRight,
  FaBars,
  FaTimes,
} from "react-icons/fa";
import { MdGroup } from "react-icons/md";
// Firebase removed
import { communityState, createCommunityModalState } from "../../atoms/communitiesAtom";
import { useSidebar } from "./index";

const Sidebar: React.FC = () => {
  const router = useRouter();
  const user = useRecoilValue(userState) as any;
  const communityStateValue = useRecoilValue(communityState);
  const setCreateCommunityModal = useSetRecoilState(createCommunityModalState);
  const { isOpen: isCommunitiesOpen, onToggle: onCommunitiesToggle } = useDisclosure({ defaultIsOpen: true });
  const { isOpen: isAnimeOpen, onToggle: onAnimeToggle } = useDisclosure({ defaultIsOpen: true });
  const { isOpen: isCoursesOpen, onToggle: onCoursesToggle } = useDisclosure({ defaultIsOpen: true });
  
  // Use shared Sidebar context from Layout to keep state in sync with content margin
  const { isCollapsed, setIsCollapsed } = useSidebar();

  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const hoverBg = useColorModeValue("gray.50", "gray.700");
  const activeBg = useColorModeValue("blue.50", "blue.900");
  const activeColor = useColorModeValue("blue.600", "blue.300");

  const isActivePage = (path: string) => router.pathname === path;

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  const handleCreateCommunity = () => {
    setCreateCommunityModal({ open: true });
  };

  const handleManageCommunities = () => {
    router.push("/my-community");
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Auto-collapse on course watch pages to provide more space
  useEffect(() => {
    const p = router.asPath || "";
    if (p.startsWith("/courses/") && p.includes("/watch/")) {
      setIsCollapsed(true);
    }
  }, [router.asPath, setIsCollapsed]);

  const NavItem = ({ 
    icon, 
    label, 
    path, 
    onClick, 
    badge,
    isActive = false 
  }: {
    icon: any;
    label: string;
    path?: string;
    onClick?: () => void;
    badge?: string;
    isActive?: boolean;
  }) => (
    <Tooltip label={isCollapsed ? label : ""} placement="right" hasArrow>
      <Flex
        align="center"
        p={3}
        mx={2}
        borderRadius="md"
        cursor="pointer"
        bg={isActive ? activeBg : "transparent"}
        color={isActive ? activeColor : "inherit"}
        _hover={{ bg: isActive ? activeBg : hoverBg }}
        onClick={onClick || (() => path && handleNavigation(path))}
        transition="all 0.2s"
        justify={isCollapsed ? "center" : "flex-start"}
      >
        <Icon as={icon} fontSize="20px" mr={isCollapsed ? 0 : 3} />
        {!isCollapsed && (
          <>
            <Text fontWeight={isActive ? "600" : "500"} flex={1}>
              {label}
            </Text>
            {badge && (
              <Badge colorScheme="blue" size="sm">
                {badge}
              </Badge>
            )}
          </>
        )}
      </Flex>
    </Tooltip>
  );

  const CommunityItem = ({ 
    name, 
    icon, 
    memberCount,
    path 
  }: {
    name: string;
    icon?: string;
    memberCount?: number;
    path: string;
  }) => (
    <Tooltip label={isCollapsed ? `r/${name}` : ""} placement="right" hasArrow>
      <Flex
        align="center"
        p={2}
        mx={isCollapsed ? 2 : 4}
        borderRadius="md"
        cursor="pointer"
        _hover={{ bg: hoverBg }}
        onClick={() => handleNavigation(path)}
        transition="all 0.2s"
        justify={isCollapsed ? "center" : "flex-start"}
      >
        <Avatar
          size={isCollapsed ? "xs" : "sm"}
          src={icon}
          name={name}
          bg="brand.100"
          mr={isCollapsed ? 0 : 3}
        />
        {!isCollapsed && (
          <Box flex={1}>
            <Text fontWeight="500" fontSize="sm">
              r/{name}
            </Text>
            {memberCount && (
              <Text fontSize="xs" color="gray.500">
                {memberCount.toLocaleString()} members
              </Text>
            )}
          </Box>
        )}
      </Flex>
    </Tooltip>
  );

  return (
    <Box
      position="fixed"
      left={0}
      top="44px" // Start below the header
      h="calc(100vh - 44px)" // Full height minus header height
      w={isCollapsed ? "80px" : "280px"}
      bg={bgColor}
      borderRight="1px solid"
      borderColor={borderColor}
      overflowY="auto"
      overflowX="hidden"
      zIndex={1000}
      boxShadow="lg"
      transition="width 0.3s ease"
    >
      <VStack spacing={0} align="stretch" h="full">
        {/* Toggle Button */}
        <Flex justify={isCollapsed ? "center" : "flex-end"} p={3} borderBottom="1px solid" borderColor={borderColor}>
          <IconButton
            aria-label="Toggle Sidebar"
            icon={<Icon as={isCollapsed ? FaBars : FaBars} />}
            onClick={toggleSidebar}
            size="sm"
            variant="ghost"
            colorScheme="gray"
          />
        </Flex>

        {/* Main Navigation */}
  <Box p={2}>
          {!isCollapsed && (
              <Text
              fontSize="xs"
              fontWeight="bold"
                color={useColorModeValue("gray.500", "gray.400")}
              textTransform="uppercase"
              mx={3}
              mb={2}
              mt={4}
            >
              Main Navigation
            </Text>
          )}
          
          <VStack spacing={1} align="stretch">
            <NavItem
              icon={FaHome}
              label="Home"
              path="/"
              isActive={isActivePage("/")}
            />
            <NavItem
              icon={FaFire}
              label="Popular"
              path="/popular"
              isActive={isActivePage("/popular")}
            />
            <NavItem
              icon={MdGroup}
              label="My Communities"
              onClick={handleManageCommunities}
              isActive={isActivePage("/my-community")}
            />
            {/* Code manager is now part of My Courses (/courses) */}
            <NavItem
              icon={MdGroup}
              label="Trợ lí ảo Anime"
              path="/anime"
              isActive={isActivePage("/anime")}
            />
          </VStack>
        </Box>

        <Divider />

        {/* Courses Section */}
        <Box p={2}>
          {!isCollapsed && (
            <Flex
              align="center"
              justify="space-between"
              mx={3}
              mb={2}
              mt={4}
              cursor="pointer"
              onClick={onCoursesToggle}
            >
              <Text
                fontSize="xs"
                fontWeight="bold"
                color={useColorModeValue("gray.500", "gray.400")}
                textTransform="uppercase"
              >
                Khóa học
              </Text>
              <Icon
                as={isCoursesOpen ? FaChevronDown : FaChevronRight}
                fontSize="12px"
                color="gray.500"
              />
            </Flex>
          )}

          <Collapse in={isCollapsed || isCoursesOpen}>
            <VStack spacing={1} align="stretch">
              <NavItem
                icon={FaHome}
                label="My Courses"
                path="/courses"
                isActive={isActivePage("/courses")}
              />
              <NavItem
                icon={MdQuiz}
                label="Trắc nghiệm kiểm tra tâm lí"
                path="/courses/quizz"
                isActive={isActivePage("/courses/quizz")}
              />
            </VStack>
          </Collapse>
        </Box>

        {/* Communities Section */}
        <Box p={2} flex={1}>
          {!isCollapsed && (
            <Flex
              align="center"
              justify="space-between"
              mx={3}
              mb={2}
              mt={4}
              cursor="pointer"
              onClick={onCommunitiesToggle}
            >
              <Text
                fontSize="xs"
                fontWeight="bold"
                color={useColorModeValue("gray.500", "gray.400")}
                textTransform="uppercase"
              >
                Communities
              </Text>
              <Icon
                as={isCommunitiesOpen ? FaChevronDown : FaChevronRight}
                fontSize="12px"
                color="gray.500"
              />
            </Flex>
          )}

          <Collapse in={isCollapsed || isCommunitiesOpen}>
            <VStack spacing={1} align="stretch" mb={4}>
              {user && (
                <>
                  <NavItem
                    icon={FaPlus}
                    label="Create Community"
                    onClick={handleCreateCommunity}
                  />
                  
                  <NavItem
                    icon={FaCog}
                    label="Manage Communities"
                    onClick={handleManageCommunities}
                  />
                </>
              )}
            </VStack>

            {/* User's Communities */}
            {user && communityStateValue.mySnippets.length > 0 && (
              <VStack spacing={1} align="stretch">
                {!isCollapsed && (
                  <Text
                    fontSize="xs"
                    fontWeight="semibold"
                    color={useColorModeValue("gray.600", "gray.300")}
                    mx={3}
                    mb={2}
                  >
                    Your Communities
                  </Text>
                )}
                {communityStateValue.mySnippets.map((snippet) => (
                  <CommunityItem
                    key={snippet.communityId}
                    name={snippet.communityId}
                    icon={snippet.imageURL}
                    memberCount={undefined}
                    path={`/r/${snippet.communityId}`}
                  />
                ))}
              </VStack>
            )}

            {/* Example Community - VietNamNation */}
            <VStack spacing={1} align="stretch" mt={4}>
              {!isCollapsed && (
                <Text
                  fontSize="xs"
                  fontWeight="semibold"
                  color={useColorModeValue("gray.600", "gray.300")}
                  mx={3}
                  mb={2}
                >
                  Featured Communities
                </Text>
              )}
              <CommunityItem
                name="VietNamNation"
                icon="/images/logo.png"
                memberCount={15420}
                path="/r/VietNamNation"
              />
            </VStack> 
          </Collapse>
        </Box>

        

        {/* User Profile Section (if logged in) */}
        {user && (
          <>
            <Divider />
            <Box p={3}>
              <Tooltip label={isCollapsed ? "View Profile" : ""} placement="right" hasArrow>
                <Flex
                  align="center"
                  p={3}
                  borderRadius="md"
                  cursor="pointer"
                  _hover={{ bg: hoverBg }}
                  onClick={() => handleNavigation("/profile")}
                  justify={isCollapsed ? "center" : "flex-start"}
                >
                  <Avatar
                    size={isCollapsed ? "xs" : "sm"}
                    src={user.photoURL || undefined}
                    name={user.displayName || user.email || "User"}
                    mr={isCollapsed ? 0 : 3}
                  />
                  {!isCollapsed && (
                    <Box flex={1}>
                          <Text fontWeight="500" fontSize="sm">
                            {user.displayName || user.uid || "User"}
                          </Text>
                      <Text fontSize="xs" color="gray.500">
                        View Profile
                      </Text>
                    </Box>
                  )}
                </Flex>
              </Tooltip>
            </Box>
          </>
        )}
      </VStack>
    </Box>
  );
};

export default Sidebar;
