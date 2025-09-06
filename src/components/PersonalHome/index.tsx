import React, { useState, useEffect } from "react";
import {
  Box,
  Flex,
  Text,
  Avatar,
  Button,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  HStack,
  useToast,
  Stack,
  Divider,
  Icon,
  Spinner,
  Center,
  Tag,
  useColorModeValue,
  Image as ChakraImage,
} from "@chakra-ui/react";
import { MdEdit, MdDateRange } from "react-icons/md";
import { FaBirthdayCake } from "react-icons/fa";
import { BsGeoAlt, BsLink45Deg } from "react-icons/bs";
import { IoMdTrophy } from "react-icons/io";

import { Post } from "../../atoms/postsAtom";
import PostItem from "../Post/PostItem";
import usePosts from "../../hooks/usePosts";
import { } from "../../helpers/timestampHelpers";
import useAuth from "../../hooks/useAuth";
import { getPosts as fetchAllPosts } from "../../services/posts.service";
import nookies from "nookies";
import { getGroupsByUser, type Group } from "../../services/groups.service";

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt?: any;
  karma?: number;
  postCount?: number;
  commentCount?: number;
  bio?: string;
  location?: string;
  website?: string;
}

const PersonalHome: React.FC = () => {
  const { user: currentUser } = useAuth();
  const user = currentUser as any;
  const loadingUser = false;
  const toast = useToast();

  // Theme tokens (must be declared before any early returns)
  const cardBg = useColorModeValue("white", "gray.800");
  const borderCol = useColorModeValue("gray.300", "gray.700");
  const subText = useColorModeValue("gray.500", "gray.400");
  const mutedText = useColorModeValue("gray.600", "gray.300");
  const softBg = useColorModeValue("gray.50", "gray.700");
  const brandAlt = useColorModeValue("brand.100", "blue.300");
  const coverGradient = useColorModeValue("linear(to-r, blue.400, blue.600)", "linear(to-r, blue.600, blue.700)");
  const avatarBg = useColorModeValue("brand.100", "gray.700");
  const editVariant = useColorModeValue("outline", "solid");
  const emptyMuted = useColorModeValue("gray.400", "gray.500");
  const loginPromptColor = useColorModeValue("gray.600", "gray.300");

  const [isEditing, setIsEditing] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const { onVote, onDeletePost, onSelectPost } = usePosts();
  // Wrap delete to manage local loading & remove from local list
  const handleDeletePost = async (post: Post) => {
    setPostsLoading(true);
    try {
      const ok = await onDeletePost(post);
      if (ok) {
        setUserPosts(prev => prev.filter(p => p.id !== post.id));
      }
      return ok;
    } finally {
      setPostsLoading(false);
    }
  };

  const [roleLabel, setRoleLabel] = useState<string>("undefined");
  const roleColor: any = roleLabel === "admin" ? "purple" : roleLabel === "moderator" ? "orange" : "gray";

  // Communities joined/managed
  const [groupsLoading, setGroupsLoading] = useState<boolean>(false);
  const [allGroups, setAllGroups] = useState<Group[]>([]);

  // Derive role from cookies/JWT best-effort
  useEffect(() => {
    const decodeJwt = (token: string) => {
      try {
        const parts = token.split(".");
        if (parts.length < 2) return null;
        const payload = parts[1];
        const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
        const decoded = typeof window !== "undefined" && typeof window.atob === "function" ? window.atob(b64) : Buffer.from(b64, "base64").toString("binary");
        return JSON.parse(decoded);
      } catch {
        return null;
      }
    };
    try {
      let r = (user as any)?.role as string | undefined;
      const cookies = nookies.get(undefined);
      if (!r) r = (cookies as any)?.role || (cookies as any)?.ROLE || r;
      if (!r) {
        const token = (cookies as any)?.token as string | undefined;
        if (token) {
          const payload: any = decodeJwt(token);
          r = payload?.role || (Array.isArray(payload?.roles) ? payload.roles[0] : undefined) || (payload?.isAdmin ? "admin" : undefined);
        }
      }
      setRoleLabel(r ? String(r).toLowerCase() : "undefined");
    } catch {
      setRoleLabel("undefined");
    }
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    try {
      setUserProfile({
        uid: user.uid,
        email: user.email ?? "",
        displayName: user.displayName ?? user.uid,
        photoURL: user.photoURL ?? undefined,
        createdAt: user.createdAt ?? new Date(),
        karma: 0,
        postCount: 0,
        commentCount: 0,
        bio: user.bio ?? "",
        location: user.location ?? "",
        website: user.website ?? "",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPosts = async () => {
    if (!user?.uid && !user?.displayName) return;
    setPostsLoading(true);
    try {
      const all = await fetchAllPosts({});
      const username = (user.displayName || "").toString().toLowerCase();
      const filtered = Array.isArray(all)
        ? all.filter((p: any) => {
            const byUid = p.userUID && user.uid && String(p.userUID) === String(user.uid);
            const byName = p.userDisplayText && username && String(p.userDisplayText).toLowerCase() === username;
            return byUid || byName;
          })
        : [];
      setUserPosts(filtered as Post[]);
    } catch (error) {
      console.error("Error fetching user posts:", error);
      setUserPosts([]);
    } finally {
      setPostsLoading(false);
    }
  };

  useEffect(() => {
    if (user && !loadingUser) {
      fetchUserProfile();
      fetchUserPosts();
      fetchMyGroups();
    } else if (!user) {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loadingUser]);

  const fetchMyGroups = async () => {
    try {
      setGroupsLoading(true);
      const list = await getGroupsByUser({ ttlMs: 15000 });
      setAllGroups(list || []);
    } catch (e) {
      setAllGroups([]);
    } finally {
      setGroupsLoading(false);
    }
  };

  const formatJoinDate = (date: Date) => {
    return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  };

  if (loadingUser || loading) {
    return (
      <Center minH="50vh">
        <Spinner size="xl" color="brand.100" />
      </Center>
    );
  }

  if (!user) {
    return (
      <Center minH="50vh">
        <Stack align="center" spacing={4}>
          <ChakraImage src="/images/logo.png" alt="logo" boxSize="60px" borderRadius="full" />
          <Text fontSize="lg" color={loginPromptColor}>
            Vui lòng đăng nhập để xem hồ sơ của bạn
          </Text>
          <Button colorScheme="brand">Đăng nhập</Button>
        </Stack>
      </Center>
    );
  }

  const handleEditProfile = () => {
    setIsEditing(true);
    toast({ title: "Chỉnh sửa hồ sơ", description: "Tính năng chỉnh sửa hồ sơ sẽ sớm ra mắt!", status: "info", duration: 3000, isClosable: true });
  };

  // tokens already declared above

  return (
    <Box maxW="1200px" mx="auto" p={4}>
      {/* Profile Header with Cover Image */}
      <Box bg={cardBg} borderRadius={4} border="1px solid" borderColor={borderCol} mb={4}>
  <Box h="100px" bgGradient={coverGradient} borderRadius="4px 4px 0 0" />
        <Flex p={6} mt={-12} direction="column">
          <Flex align="flex-end" mb={4}>
            <Avatar size="xl" src={userProfile?.photoURL} name={userProfile?.displayName} border="4px solid white" bg={avatarBg} />
            <Flex ml={4} direction="column" flex={1}>
              <Text fontSize="2xl" fontWeight="bold">{userProfile?.displayName}</Text>
              <HStack mt={1}><Tag size="sm" colorScheme={roleColor}>{roleLabel}</Tag></HStack>
              {userProfile?.createdAt && (
                <Flex align="center" mt={1} color={subText} fontSize="sm">
                  <Icon as={FaBirthdayCake} mr={1} />
                  {/* <Text>Joined {new Date(timestampToISO(userProfile.createdAt)).toLocaleDateString()}</Text> */}
                </Flex>
              )}
            </Flex>
            <HStack>
              <Button leftIcon={<MdEdit />} colorScheme="blue" variant={editVariant} size="sm" onClick={handleEditProfile}>Edit Profile</Button>
            </HStack>
          </Flex>

          {/* Stats */}
          <Flex gap={6} wrap="wrap">
            <Flex align="center" bg={softBg} p={3} borderRadius={6}>
              <Icon as={MdDateRange} color={brandAlt} mr={2} />
              <Box>
                <Text fontWeight="bold" fontSize="lg">{userPosts.length}</Text>
                <Text fontSize="xs" color={subText}>Posts</Text>
              </Box>
            </Flex>
          </Flex>

          {/* Bio & Links */}
          <Box mt={4}>
            <Text color={mutedText} mb={2}>{userProfile?.bio}</Text>
            <HStack spacing={4} mb={2}>
              {userProfile?.location && (
                <HStack spacing={1}>
                  <BsGeoAlt />
                  <Text fontSize="sm" color={mutedText}>{userProfile.location}</Text>
                </HStack>
              )}
              {userProfile?.website && (
                <HStack spacing={1}>
                  <BsLink45Deg />
                  <Text fontSize="sm" color={brandAlt} cursor="pointer">{userProfile.website}</Text>
                </HStack>
              )}
            </HStack>
          </Box>
        </Flex>
      </Box>

      {/* Tabs */}
      <Box bg={cardBg} borderRadius={4} border="1px solid" borderColor={borderCol}>
        <Tabs variant="enclosed">
          <TabList>
            <Tab _selected={{ color: brandAlt, borderBottomColor: brandAlt }}>Posts ({userPosts.length})</Tab>
            <Tab _selected={{ color: brandAlt, borderBottomColor: brandAlt }}>Comments</Tab>
            <Tab _selected={{ color: brandAlt, borderBottomColor: brandAlt }}>About</Tab>
            <Tab _selected={{ color: brandAlt, borderBottomColor: brandAlt }}>Communities</Tab>
          </TabList>
          <TabPanels>
            <TabPanel p={0}>
              {postsLoading ? (
                <Center py={10}><Spinner size="lg" color={brandAlt} /></Center>
              ) : userPosts.length === 0 ? (
                <Center py={10}>
                  <Stack align="center" spacing={3}>
                    <ChakraImage src="/images/logo.png" alt="logo" boxSize="50px" borderRadius="full" />
                    <Text color={subText} fontSize="lg">No posts yet</Text>
                    <Text color={emptyMuted} fontSize="sm" textAlign="center">Start sharing your thoughts with the community!</Text>
                  </Stack>
                </Center>
              ) : (
                <Stack spacing={0}>
                  {userPosts.map((post, index) => (
                    <Box key={post.id}>
                      <PostItem
                        post={post}
                        onVote={onVote}
                        onDeletePost={handleDeletePost}
                        userIsCreator={true}
                        onSelectPost={onSelectPost}
                        userVoteValue={undefined}
                      />
                      {index < userPosts.length - 1 && <Divider />}
                    </Box>
                  ))}
                </Stack>
              )}
            </TabPanel>
            <TabPanel>
              <Center py={10}>
                <Stack align="center" spacing={3}>
                  <ChakraImage src="/images/logo.png" alt="logo" boxSize="50px" borderRadius="full" />
                  <Text color={subText} fontSize="lg">Comments coming soon</Text>
                  <Text color={emptyMuted} fontSize="sm" textAlign="center">Your comments will be displayed here</Text>
                </Stack>
              </Center>
            </TabPanel>
            <TabPanel>
              <Stack spacing={4} p={4}>
                <Box>
                  <Text fontWeight="bold" mb={2}>About</Text>
                  <Text color={mutedText} mb={2}>{userProfile?.bio || "Welcome to your profile! Here you can view your posts, comments, and activity."}</Text>
                </Box>
                <Divider />
                <Box>
                  <Text fontWeight="bold" mb={2}>Account Details</Text>
                  <Stack spacing={2} fontSize="sm">
                    <Flex>
                      <Text fontWeight="semibold" w="100px">Email:</Text>
                      <Text color={mutedText}>{userProfile?.email}</Text>
                    </Flex>
                    <Flex>
                      <Text fontWeight="semibold" w="100px">User ID:</Text>
                      <Text color={mutedText} fontSize="xs">{userProfile?.uid}</Text>
                    </Flex>
                    {userProfile?.location && (
                      <Flex>
                        <Text fontWeight="semibold" w="100px">Location:</Text>
                        <Text color={mutedText}>{userProfile.location}</Text>
                      </Flex>
                    )}
                    {userProfile?.website && (
                      <Flex>
                        <Text fontWeight="semibold" w="100px">Website:</Text>
                        <Text color={brandAlt} cursor="pointer">{userProfile.website}</Text>
                      </Flex>
                    )}
                  </Stack>
                </Box>
              </Stack>
            </TabPanel>
            <TabPanel>
              {/* Communities joined & managed */}
              {groupsLoading ? (
                <Center py={10}><Spinner size="lg" color={brandAlt} /></Center>
              ) : (
                <Stack spacing={6} p={2}>
                  {/* Managed communities */}
                  <Box>
                    <Text fontWeight="bold" mb={3}>Managed communities</Text>
                    {allGroups.filter(g => {
                      const r = String(g.userRole || "").toLowerCase();
                      return r === "owner" || r === "admin" || r === "moderator";
                    }).length === 0 ? (
                      <Text color={subText} fontSize="sm">You don&#39;t manage any communities yet.</Text>
                    ) : (
                      <Stack spacing={3}>
                        {allGroups.filter(g => {
                          const r = String(g.userRole || "").toLowerCase();
                          return r === "owner" || r === "admin" || r === "moderator";
                        }).map(g => (
                          <Flex key={String(g.id)} align="center" justify="space-between" p={3} bg={softBg} borderRadius={8}>
                            <HStack spacing={3}>
                              <Avatar size="sm" name={g.name} src={g.imageURL || undefined} />
                              <Box>
                                <Text fontWeight="semibold">{g.name}</Text>
                                <Text fontSize="xs" color={subText}>ID: {String(g.id)}</Text>
                              </Box>
                            </HStack>
                            <Tag size="sm" colorScheme="orange">{String(g.userRole || "moderator")}</Tag>
                          </Flex>
                        ))}
                      </Stack>
                    )}
                  </Box>

                  <Divider />

                  {/* Joined communities */}
                  <Box>
                    <Text fontWeight="bold" mb={3}>Các cộng đồng đã tham gia</Text>
                    {allGroups.filter(g => {
                      const r = String(g.userRole || "").toLowerCase();
                      return !(r === "owner" || r === "admin" || r === "moderator");
                    }).length === 0 ? (
                      <Text color={subText} fontSize="sm">Bạn chưa tham gia cộng đồng nào.</Text>
                    ) : (
                      <Stack spacing={3}>
                        {allGroups.filter(g => {
                          const r = String(g.userRole || "").toLowerCase();
                          return !(r === "owner" || r === "admin" || r === "moderator");
                        }).map(g => (
                          <Flex key={String(g.id)} align="center" justify="space-between" p={3} bg={softBg} borderRadius={8}>
                            <HStack spacing={3}>
                              <Avatar size="sm" name={g.name} src={g.imageURL || undefined} />
                              <Box>
                                <Text fontWeight="semibold">{g.name}</Text>
                                <Text fontSize="xs" color={subText}>ID: {String(g.id)}</Text>
                              </Box>
                            </HStack>
                            <Tag size="sm" colorScheme="blue">member</Tag>
                          </Flex>
                        ))}
                      </Stack>
                    )}
                  </Box>
                </Stack>
              )}
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </Box>
  );
};

export default PersonalHome;
