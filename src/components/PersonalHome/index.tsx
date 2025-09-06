import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Avatar,
  Badge,
  Box,
  Button,
  Center,
  Divider,
  Flex,
  GridItem,
  HStack,
  Icon,
  Image as ChakraImage,
  Link as ChakraLink,
  SimpleGrid,
  Skeleton,
  SkeletonCircle,
  SkeletonText,
  Spinner,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tag,
  Text,
  Tooltip,
  useBreakpointValue,
  useColorModeValue,
  useToast,
} from "@chakra-ui/react";
import { MdEdit, MdLink, MdContentCopy } from "react-icons/md";
import { FiMapPin, FiCalendar, FiUsers, FiUserCheck } from "react-icons/fi";
import { BsGlobe } from "react-icons/bs";

import useAuth from "../../hooks/useAuth";
import usePosts from "../../hooks/usePosts";
import PostItem from "../Post/PostItem";
import { getPosts as fetchAllPosts } from "../../services/posts.service";
import nookies from "nookies";
import { getGroupsByUser, type Group } from "../../services/groups.service";
import type { Post } from "../../atoms/postsAtom";

/** ------------------------
 *  Twitter/X–inspired Profile
 *  ------------------------
 *  - Cover gradient lớn + overlay pattern
 *  - Avatar overlap viền trắng, nút Edit ở góc
 *  - Tên, handle, badge, bio, meta (location/website/joined)
 *  - Stats Following/Followers (mock từ counts)
 *  - Sticky tab bar (Posts / Communities / About)
 *  - Danh sách bài viết dùng PostItem sẵn có
 */

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
  const toast = useToast();
  const { user: currentUser } = useAuth();
  const user = currentUser as any;
  const loadingUser = false;

  // Theme tokens
  const cardBg = useColorModeValue("white", "gray.900");
  const softBg = useColorModeValue("gray.50", "gray.800");
  const border = useColorModeValue("gray.200", "gray.700");
  const subtle = useColorModeValue("gray.600", "gray.400");
  const strong = useColorModeValue("gray.900", "gray.100");
  const brand = "blue";
  const brandAlt = useColorModeValue(`${brand}.600`, `${brand}.300`);
  const coverGradient = useColorModeValue(
    "linear(to-br, blue.400, purple.500)",
    "linear(to-br, blue.600, purple.600)"
  );

  const isMdUp = useBreakpointValue({ base: false, md: true });

  // Local state
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsErr, setPostsErr] = useState<string>("");

  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsErr, setGroupsErr] = useState<string>("");

  const [roleLabel, setRoleLabel] = useState<string>("user");

  const { onVote, onDeletePost, onSelectPost } = usePosts();

  // ---------- Utils ----------
  const safeAtob = (b64: string) => {
    try {
      if (typeof window !== "undefined" && typeof window.atob === "function") return window.atob(b64);
      // eslint-disable-next-line no-undef
      return Buffer.from(b64, "base64").toString("binary");
    } catch {
      return "";
    }
  };
  const decodeJwt = (token: string) => {
    try {
      const parts = token.split(".");
      if (parts.length < 2) return null;
      const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      return JSON.parse(safeAtob(payload));
    } catch {
      return null;
    }
  };
  const parseJoinDate = (src: any): Date | null => {
    if (!src) return null;
    if (src?.seconds) return new Date(src.seconds * 1000);
    const d = new Date(src);
    return isNaN(d.getTime()) ? null : d;
  };
  const formatJoinDate = (src: any) => {
    const d = parseJoinDate(src) || new Date();
    return d.toLocaleDateString("vi-VN", { year: "numeric", month: "long" });
  };
  const handleCopy = (txt: string, label = "Đã sao chép") => {
    try {
      navigator.clipboard.writeText(txt);
      toast({ status: "success", title: label });
    } catch {
      toast({ status: "error", title: "Không thể sao chép" });
    }
  };
  const toHandle = (name?: string) =>
    (name || "user")
      .toString()
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "");

  // ---------- Fetch/Effects ----------
  useEffect(() => {
    try {
      let r = (user as any)?.role as string | undefined;
      const cookies = nookies.get(undefined);
      r = r || (cookies as any)?.role || (cookies as any)?.ROLE;

      if (!r) {
        const token = (cookies as any)?.token as string | undefined;
        if (token) {
          const payload: any = decodeJwt(token) || {};
          r =
            payload?.role ||
            (Array.isArray(payload?.roles) ? payload.roles[0] : undefined) ||
            (payload?.isAdmin ? "admin" : undefined) ||
            "user";
        }
      }
      setRoleLabel(String(r || "user").toLowerCase());
    } catch {
      setRoleLabel("user");
    }
  }, [user]);

  const fetchUserProfile = useCallback(async () => {
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
        karma: user.karma ?? 0,
        postCount: user.postCount ?? 0,
        commentCount: user.commentCount ?? 0,
        bio:
          user.bio ??
          "Xin chào! ",
        location: user.location ?? "",
        website: user.website ?? "",
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchUserPosts = useCallback(async () => {
    if (!user?.uid && !user?.displayName) return;
    setPostsLoading(true);
    setPostsErr("");
    try {
      const all = await fetchAllPosts({});
      const username = (user.displayName || "").toString().toLowerCase();
      const filtered = Array.isArray(all)
        ? all.filter((p: any) => {
            const byUid = p.userUID && user.uid && String(p.userUID) === String(user.uid);
            const byName =
              p.userDisplayText &&
              username &&
              String(p.userDisplayText).toLowerCase() === username;
            return byUid || byName;
          })
        : [];
      setUserPosts(filtered as Post[]);
    } catch (e: any) {
      setPostsErr(e?.message || "Không tải được bài viết");
      setUserPosts([]);
    } finally {
      setPostsLoading(false);
    }
  }, [user]);

  const fetchMyGroups = useCallback(async () => {
    try {
      setGroupsErr("");
      setGroupsLoading(true);
      const list = await getGroupsByUser({ ttlMs: 15000 });
      setAllGroups(list || []);
    } catch (e: any) {
      setAllGroups([]);
      setGroupsErr(e?.message || "Không tải được danh sách cộng đồng");
    } finally {
      setGroupsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && !loadingUser) {
      fetchUserProfile();
      fetchUserPosts();
      fetchMyGroups();
    } else if (!user) {
      setLoading(false);
    }
  }, [user, loadingUser, fetchUserProfile, fetchUserPosts, fetchMyGroups]);

  // ---------- Derived ----------
  const managedGroups = useMemo(
    () =>
      allGroups.filter((g) =>
        ["owner", "admin", "moderator"].includes(String(g.userRole || "").toLowerCase())
      ),
    [allGroups]
  );
  const memberGroups = useMemo(
    () =>
      allGroups.filter(
        (g) => !["owner", "admin", "moderator"].includes(String(g.userRole || "").toLowerCase())
      ),
    [allGroups]
  );

  const formatNumberShort = (n: number) => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
    return String(n);
  };
  const followersRaw = (userProfile?.karma ?? 0) + (userProfile?.commentCount ?? 0);
  const followingRaw = (userProfile?.postCount ?? userPosts.length) + managedGroups.length;
  const followers = formatNumberShort(followersRaw);
  const following = formatNumberShort(followingRaw);

  const roleColor: any =
    roleLabel === "admin" ? "purple" : roleLabel === "moderator" ? "orange" : "gray";

  // ---------- Actions ----------
  const handleDeletePost = async (post: Post) => {
    try {
      const ok = await onDeletePost(post);
      if (ok) setUserPosts((prev) => prev.filter((p) => p.id !== post.id));
      return ok;
    } finally {
      // no-op
    }
  };

  const handleEditProfile = () => {
    toast({
      status: "info",
      title: "Chỉnh sửa hồ sơ",
      description: "Tính năng chỉnh sửa sẽ sớm ra mắt!",
    });
  };

  // ---------- Early states ----------
  if (loadingUser || loading) {
    return (
      <Box maxW="920px" mx="auto">
        <Box h="220px" bgGradient={coverGradient} opacity={0.7} />
        <Box px={{ base: 4, md: 6 }} mt={-12}>
          <Flex gap={4} align="flex-end">
            <SkeletonCircle size="24" border="4px solid white" />
            <Box flex="1">
              <Skeleton height="22px" width="240px" mb={2} />
              <Skeleton height="16px" width="160px" />
            </Box>
            <Skeleton height="36px" width="120px" borderRadius="md" />
          </Flex>
          <Box mt={4}>
            <SkeletonText noOfLines={3} spacing="3" />
          </Box>
        </Box>
      </Box>
    );
  }

  if (!user) {
    return (
      <Center minH="50vh">
        <Stack align="center" spacing={4}>
          <ChakraImage src="/images/logo.png" alt="logo" boxSize="60px" borderRadius="full" />
          <Text color={subtle}>Vui lòng đăng nhập để xem hồ sơ của bạn</Text>
          <Button colorScheme={brand}>Đăng nhập</Button>
        </Stack>
      </Center>
    );
  }

  // ---------- Render ----------
  return (
    <Box>
      {/* Cover */}
      <Box position="relative">
        <Box
          h={{ base: "160px", md: "220px" }}
          bgGradient={coverGradient}
          _after={{
            content: '""',
            position: "absolute",
            inset: 0,
            bgImage:
              "radial-gradient(rgba(255,255,255,0.12) 1px, transparent 1px)",
            bgSize: "18px 18px",
            opacity: 0.3,
          }}
        />
      </Box>

      {/* Header */}
      <Box maxW="920px" mx="auto" px={{ base: 4, md: 6 }}>
        <Flex gap={4} align={{ base: "stretch", md: "flex-end" }} mt={-14} wrap="wrap">
          <Avatar
            size={isMdUp ? "2xl" : "xl"}
            src={userProfile?.photoURL}
            name={userProfile?.displayName}
            border="6px solid white"
            bg={softBg}
            boxShadow="md"
          />

          <Flex direction="column" flex="1" minW="260px">
            <HStack align="baseline" spacing={3}>
              <Text
                fontSize={{ base: "xl", md: "2xl" }}
                fontWeight="bold"
                color={strong}
              >
                {userProfile?.displayName}
              </Text>
              {/* verified style optional for admin/mod */}
              {(roleLabel === "admin" || roleLabel === "moderator") && (
                <Tooltip label="Verified">
                  <Badge colorScheme="blue" variant="solid">✔</Badge>
                </Tooltip>
              )}
            </HStack>

            <HStack spacing={2} color={subtle} fontSize="sm">
              <Text>@{toHandle(userProfile?.displayName)}</Text>
              <Tag size="sm" colorScheme={roleColor} textTransform="capitalize">{roleLabel}</Tag>
            </HStack>

            {!!userProfile?.bio && (
              <Text mt={3} color={useColorModeValue("gray.800", "gray.200")}>
                {userProfile.bio}
              </Text>
            )}

            <HStack mt={3} spacing={4} color={subtle} wrap="wrap" fontSize="sm">
              {!!userProfile?.location && (
                <HStack spacing={1}>
                  <Icon as={FiMapPin} />
                  <Text>{userProfile.location}</Text>
                </HStack>
              )}
              {!!userProfile?.website && (
                <HStack spacing={1}>
                  <Icon as={MdLink} />
                  <ChakraLink
                    isExternal
                    href={/^https?:\/\//i.test(userProfile.website) ? userProfile.website : `https://${userProfile.website}`}
                    color={brandAlt}
                  >
                    {userProfile.website}
                  </ChakraLink>
                </HStack>
              )}
              {!!userProfile?.createdAt && (
                <HStack spacing={1}>
                  <Icon as={FiCalendar} />
                  <Text>Tham gia {formatJoinDate(userProfile.createdAt)}</Text>
                </HStack>
              )}
              {!!userProfile?.uid && (
                <HStack
                  spacing={1}
                  cursor="pointer"
                  onClick={() => handleCopy(userProfile.uid!, "Đã sao chép UID")}
                >
                  <Icon as={MdContentCopy} />
                  <Text>UID</Text>
                </HStack>
              )}
            </HStack>

            {/* Stats */}
            <HStack mt={3} spacing={6} color={strong} fontSize="sm">
              <HStack spacing={1}>
                <Text fontWeight="bold">{following}</Text>
                <Text color={subtle}>Following</Text>
              </HStack>
              <HStack spacing={1}>
                <Text fontWeight="bold">{followers}</Text>
                <Text color={subtle}>Followers</Text>
              </HStack>
            </HStack>
          </Flex>

          <HStack alignSelf={{ base: "flex-start", md: "center" }}>
            <Button
              leftIcon={<MdEdit />}
              colorScheme={brand}
              variant={useColorModeValue("solid", "outline")}
              onClick={handleEditProfile}
            >
              Edit profile
            </Button>
          </HStack>
        </Flex>
      </Box>

      {/* Sticky Tabs */}
      <Box
        position="sticky"
        top="0"
        zIndex={10}
        bg={useColorModeValue("whiteAlpha.900", "blackAlpha.700")}
        backdropFilter="saturate(140%) blur(6px)"
        borderTop="1px solid"
        borderBottom="1px solid"
        borderColor={border}
        mt={4}
      >
        <Box maxW="920px" mx="auto" px={{ base: 2, md: 6 }}>
          <Tabs variant="unstyled" colorScheme={brand}>
            <TabList pt={1} pb={0} overflowX="auto" borderBottom="1px solid" borderColor={border}>
              {[{label:`Bài viết`,count:userPosts.length},{label:`Cộng đồng`,count:allGroups.length},{label:`Giới thiệu`,count:0}].map((t)=> (
                <Tab
                  key={t.label}
                  px={4}
                  py={3}
                  fontWeight={600}
                  fontSize="sm"
                  position="relative"
                  _hover={{ bg: useColorModeValue("gray.100","whiteAlpha.100") }}
                  _focusVisible={{ boxShadow: "none" }}
                  _before={{
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    bottom: 0,
                    h: '2px',
                    w: '100%',
                    bg: 'transparent',
                    transition: 'background-color .25s'
                  }}
                  _selected={{ color: brandAlt, _before: { bg: brandAlt } }}
                >
                  {t.label}{t.count?` (${t.count})`:''}
                </Tab>
              ))}
            </TabList>

            <TabPanels pb={4}>
              {/* POSTS */}
              <TabPanel px={0}>
                {postsLoading ? (
                  <Stack spacing={0} p={4}>
                    {[...Array(3)].map((_, i) => (
                      <Box key={i} p={3}>
                        <Skeleton height="18px" mb={2} />
                        <Skeleton height="12px" width="80%" />
                        {i < 2 && <Divider mt={3} />}
                      </Box>
                    ))}
                  </Stack>
                ) : postsErr ? (
                  <Center py={10}>
                    <Stack align="center" spacing={2}>
                      <Icon as={FiUserCheck} boxSize={6} color={brandAlt} />
                      <Text color={subtle}>Không tải được bài viết</Text>
                      <Button size="sm" onClick={fetchUserPosts}>Thử lại</Button>
                    </Stack>
                  </Center>
                ) : userPosts.length === 0 ? (
                  <Center py={10}>
                    <Stack align="center" spacing={3}>
                      <ChakraImage src="/images/logo.png" alt="logo" boxSize="50px" borderRadius="full" />
                      <Text color={subtle}>Chưa có bài viết</Text>
                      <Text color={useColorModeValue("gray.500","gray.500")} fontSize="sm" textAlign="center">
                        Hãy bắt đầu chia sẻ với cộng đồng!
                      </Text>
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
                          userIsCreator
                          onSelectPost={onSelectPost}
                          userVoteValue={undefined}
                        />
                        {index < userPosts.length - 1 && <Divider />}
                      </Box>
                    ))}
                  </Stack>
                )}
              </TabPanel>

              {/* COMMUNITIES */}
              <TabPanel px={0}>
                {groupsLoading ? (
                  <Center py={10}><Spinner size="lg" color={brandAlt} /></Center>
                ) : groupsErr ? (
                  <Center py={10}>
                    <Stack align="center" spacing={2}>
                      <Icon as={FiUsers} boxSize={6} color={brandAlt} />
                      <Text color={subtle}>Không tải được danh sách cộng đồng</Text>
                      <Button size="sm" onClick={fetchMyGroups}>Thử lại</Button>
                    </Stack>
                  </Center>
                ) : (
                  <Stack spacing={8} p={{ base: 2, md: 0 }}>
                    <Box>
                      <Text fontWeight="bold" mb={3}>Bạn quản lý</Text>
                      {managedGroups.length === 0 ? (
                        <Text color={subtle} fontSize="sm">Chưa quản lý cộng đồng nào.</Text>
                      ) : (
                        <Stack spacing={3}>
                          {managedGroups.map(g => (
                            <Flex key={String(g.id)} align="center" justify="space-between" p={3} bg={softBg} border="1px solid" borderColor={border} borderRadius={12}>
                              <HStack spacing={3}>
                                <Avatar size="sm" name={g.name} src={g.imageURL || undefined} />
                                <Box>
                                  <Text fontWeight="semibold">{g.name}</Text>
                                  <Text fontSize="xs" color={subtle}>ID: {String(g.id)}</Text>
                                </Box>
                              </HStack>
                              <Tag size="sm" colorScheme="orange">{String(g.userRole || "moderator")}</Tag>
                            </Flex>
                          ))}
                        </Stack>
                      )}
                    </Box>

                    <Box>
                      <Text fontWeight="bold" mb={3}>Đã tham gia</Text>
                      {memberGroups.length === 0 ? (
                        <Text color={subtle} fontSize="sm">Bạn chưa tham gia cộng đồng nào.</Text>
                      ) : (
                        <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3}>
                          {memberGroups.map(g => (
                            <GridItem key={String(g.id)}>
                              <Flex align="center" justify="space-between" p={3} bg={softBg} border="1px solid" borderColor={border} borderRadius={12}>
                                <HStack spacing={3}>
                                  <Avatar size="sm" name={g.name} src={g.imageURL || undefined} />
                                  <Box>
                                    <Text fontWeight="semibold" noOfLines={1}>{g.name}</Text>
                                    <Text fontSize="xs" color={subtle}>ID: {String(g.id)}</Text>
                                  </Box>
                                </HStack>
                                <Tag size="sm" colorScheme="blue">member</Tag>
                              </Flex>
                            </GridItem>
                          ))}
                        </SimpleGrid>
                      )}
                    </Box>
                  </Stack>
                )}
              </TabPanel>

              {/* ABOUT */}
              <TabPanel px={0}>
                <Stack spacing={4} p={{ base: 2, md: 0 }}>
                  <Box>
                    <Text fontWeight="bold" mb={2}>About</Text>
                    <Text color={subtle}>
                      {userProfile?.bio ||
                        "Đây là trang hồ sơ nơi bạn xem bài viết, cộng đồng đã tham gia và thông tin tài khoản."}
                    </Text>
                  </Box>
                  <Divider />
                  <Box>
                    <Text fontWeight="bold" mb={2}>Account Details</Text>
                    <Stack spacing={2} fontSize="sm">
                      <Flex>
                        <Text w="120px" color={subtle}>Email</Text>
                        <Text>{userProfile?.email}</Text>
                      </Flex>
                      <Flex align="center" gap={2}>
                        <Text w="120px" color={subtle}>User ID</Text>
                        <HStack>
                          <Text fontSize="xs">{userProfile?.uid}</Text>
                          {!!userProfile?.uid && (
                            <Tooltip label="Copy UID">
                              <Button size="xs" variant="ghost" onClick={() => handleCopy(userProfile.uid!, "Đã sao chép UID")}>
                                <MdContentCopy />
                              </Button>
                            </Tooltip>
                          )}
                        </HStack>
                      </Flex>
                      {!!userProfile?.location && (
                        <Flex>
                          <Text w="120px" color={subtle}>Location</Text>
                          <Text>{userProfile.location}</Text>
                        </Flex>
                      )}
                      {!!userProfile?.website && (
                        <Flex>
                          <Text w="120px" color={subtle}>Website</Text>
                          <ChakraLink
                            isExternal
                            href={/^https?:\/\//i.test(userProfile.website) ? userProfile.website : `https://${userProfile.website}`}
                            color={brandAlt}
                          >
                            {userProfile.website}
                          </ChakraLink>
                        </Flex>
                      )}
                      {!!userProfile?.createdAt && (
                        <Flex>
                          <Text w="120px" color={subtle}>Joined</Text>
                          <Text>{formatJoinDate(userProfile.createdAt)}</Text>
                        </Flex>
                      )}
                    </Stack>
                  </Box>
                </Stack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>
      </Box>
    </Box>
  );
};

export default PersonalHome;
