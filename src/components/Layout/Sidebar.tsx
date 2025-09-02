import React, { useEffect, useMemo, useState } from "react";
import { MdQuiz } from "react-icons/md";//quizz
import { GiFox } from "react-icons/gi";//icon anime
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
import NextLink from "next/link";
import { Link as ChakraLink } from "@chakra-ui/react";
// import { useAuthState } from "react-firebase-hooks/auth";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { userState } from "../../atoms/userAtom";
import { postState } from "../../atoms/postsAtom";
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
import { communityState, createCommunityModalState } from "../../atoms/communitiesAtom";
import { getGroupsByUser, type Group } from "../../services/groups.service";
import { useSidebar } from "./SidebarContext";

const Sidebar: React.FC = () => {
  const router = useRouter();
  const user = useRecoilValue(userState) as any;
  const communityStateValue = useRecoilValue(communityState);
  const setCreateCommunityModal = useSetRecoilState(createCommunityModalState);
  const setPostState = useSetRecoilState(postState);
  const { isOpen: isCommunitiesOpen, onToggle: onCommunitiesToggle } = useDisclosure({ defaultIsOpen: true });
  const { isOpen: isAnimeOpen, onToggle: onAnimeToggle } = useDisclosure({ defaultIsOpen: true });
  const { isOpen: isCoursesOpen, onToggle: onCoursesToggle } = useDisclosure({ defaultIsOpen: true });
  const { isOpen: isYourCommsOpen, onToggle: onYourCommsToggle } = useDisclosure({ defaultIsOpen: true });
  
  // Use shared Sidebar context from Layout to keep state in sync with content margin
  const { isCollapsed, setIsCollapsed } = useSidebar();

  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const hoverBg = useColorModeValue("gray.50", "gray.700");
  const activeBg = useColorModeValue("blue.50", "blue.900");
  const activeColor = useColorModeValue("blue.600", "blue.300");
  const labelMuted = useColorModeValue("gray.500", "gray.400");
  const sectionMuted = useColorModeValue("gray.600", "gray.300");

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
  const handleFindCommunities = () => {
    router.push("/community/find");
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
    // Prefetch quiz page to avoid first-click blank
  router.prefetch && router.prefetch("/quiz");
  }, [router.asPath, setIsCollapsed]);

  // Load groups to resolve display names for user's communities
  const [groups, setGroups] = useState<Group[]>([]);
  useEffect(() => {
    let mounted = true;
  const load = async () => {
      try {
        if (!user) { setGroups([]); return; }
    const list = await getGroupsByUser({ ttlMs: 30000 });
        if (mounted) setGroups(Array.isArray(list) ? list : []);
      } catch {
        if (mounted) setGroups([]);
      }
    };
    load();
    return () => { mounted = false; };
  }, [user]);


  const groupMap = useMemo(() => {
    const m = new Map<string, Group>();
    for (const g of groups) m.set(String(g.id), g);
    return m;
  }, [groups]);
  
  const handleHomeClick = async () => {
    // Clear any community-scoped posts and force a refresh fetch on Home
  setPostState((prev) => ({ ...prev, posts: [], postUpdateRequired: true }));
    const href = "?refresh=1";
  router.push(`/${href}`);
  };



  // no sidebar-wide search state; search lives on its own page

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
  }) => {
    const content = (
      <Flex
        align="center"
        p={3}
        mx={2}
        borderRadius="md"
        cursor="pointer"
        bg={isActive ? activeBg : "transparent"}
        color={isActive ? activeColor : "inherit"}
        _hover={{ bg: isActive ? activeBg : hoverBg }}
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
    );

    return (
      <Tooltip label={isCollapsed ? label : ""} placement="right" hasArrow>
        {path ? (
          <NextLink href={path} passHref prefetch>
            <ChakraLink _hover={{ textDecoration: "none" }}>
              {content}
            </ChakraLink>
          </NextLink>
        ) : (
          <Box onClick={onClick}>{content}</Box>
        )}
      </Tooltip>
    );
  };

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
  <Tooltip label={isCollapsed ? `${name}` : ""} placement="right" hasArrow>
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
              {name}
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
              color={labelMuted}
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
              label="Trang chủ"
              onClick={handleHomeClick}
              isActive={isActivePage("/")}
            />
            
            <NavItem
              icon={MdGroup}
              label="Cộng đồng của tôi"
              onClick={handleManageCommunities}
              isActive={isActivePage("/my-community")}
            />
            {/* Code manager is now part of My Courses (/courses) */}
            <NavItem
              icon={GiFox}
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
                color={labelMuted}
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
                label="Khóa học của tôi"
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
                color={labelMuted}
                textTransform="uppercase"
              >
                Cộng đồng
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
                    label="Tạo cộng đồng"
                    onClick={handleCreateCommunity}
                  />
                  
                  <NavItem
                    icon={FaCog}
                    label="Quản lí cộng đồng"
                    onClick={handleManageCommunities}
                  />
                  <NavItem
                    icon={FaCog}
                    label="Tìm cộng đồng"
                    onClick={handleFindCommunities}
                  />
                </>
              )}
            </VStack>

            {/* User's Communities */}
            {user && communityStateValue.mySnippets.length > 0 && (
              <VStack spacing={1} align="stretch">
                {!isCollapsed && (
                  <Flex
                    align="center"
                    justify="space-between"
                    mx={3}
                    mb={1}
                    cursor="pointer"
                    onClick={onYourCommsToggle}
                  >
                    <Text
                      fontSize="xs"
                      fontWeight="semibold"
                      color={sectionMuted}
                      textTransform="uppercase"
                    >
                      Your Communities
                    </Text>
                    <Icon as={isYourCommsOpen ? FaChevronDown : FaChevronRight} fontSize="12px" color="gray.500" />
                  </Flex>
                )}
                <Collapse in={isCollapsed || isYourCommsOpen}>
                  {communityStateValue.mySnippets.map((snippet) => {
                    const id = String(snippet.communityId);
                    const g = groupMap.get(id);
                    const name = g?.name || id; // fall back to id if name unknown
                    const icon = snippet.imageURL || g?.imageURL || undefined;
                    return (
                      <CommunityItem
                        key={id}
                        name={name}
                        icon={icon}
                        memberCount={undefined}
                        path={`/community/${id}`}
                      />
                    );
                  })}
                </Collapse>
              </VStack>
            )}
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
