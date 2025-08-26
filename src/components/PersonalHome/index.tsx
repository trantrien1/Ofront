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
  VStack,
  HStack,
  useToast,
  Stack,
  Divider,
  Icon,
  Spinner,
  Center,
} from "@chakra-ui/react";
// Firebase removed
// Firebase removed
import { useRouter } from "next/router";
import { BsCalendar3, BsGeoAlt, BsLink45Deg } from "react-icons/bs";
import { MdEdit } from "react-icons/md";
import { FaBirthdayCake } from "react-icons/fa";
import { Image as ChakraImage } from "@chakra-ui/react";
import { MdDateRange } from "react-icons/md";
import { IoMdTrophy } from "react-icons/io";
import { Post } from "../../atoms/postsAtom";
import PostItem from "../Post/PostItem";
import usePosts from "../../hooks/usePosts";
import { timestampToISO } from "../../helpers/timestampHelpers";
import useAuth from "../../hooks/useAuth";
import { getPosts as fetchAllPosts } from "../../services/posts.service";

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
  const router = useRouter();
  const toast = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const { onVote, onDeletePost, onSelectPost } = usePosts();
  const roleLabel = (user as any)?.role ? String((user as any).role).toUpperCase() : "USER";
  const roleColor: any = roleLabel === "ADMIN" ? "purple" : roleLabel === "MODERATOR" ? "orange" : "gray";

  // Fetch user profile data from database
  const fetchUserProfile = async () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    try {
      // Derive basic profile from auth for now
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

  // Fetch user's posts from database
  const fetchUserPosts = async () => {
    if (!user?.uid && !user?.displayName) return;
    setPostsLoading(true);
    try {
      // Load all posts then filter by author (best-effort)
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

  // Stay on page; show login prompt instead of redirecting

  useEffect(() => {
    if (user && !loadingUser) {
      fetchUserProfile();
      fetchUserPosts();
    } else if (!user) {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loadingUser]);

  const formatJoinDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
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
          <Text fontSize="lg" color="gray.500">
            Please login to view your profile
          </Text>
          <Button colorScheme="brand">
            Login
          </Button>
        </Stack>
      </Center>
    );
  }

  const handleEditProfile = () => {
    setIsEditing(true);
    toast({
      title: "Edit Profile",
      description: "Profile editing feature coming soon!",
      status: "info",
      duration: 3000,
      isClosable: true,
    });
  };

  return (
    <Box maxW="1200px" mx="auto" p={4}>
      {/* Profile Header with Cover Image */}
      <Box bg="white" borderRadius={4} border="1px solid" borderColor="gray.300" mb={4}>
        <Box
          h="100px"
          bg="blue.500"
          bgGradient="linear(to-r, blue.400, blue.600)"
          borderRadius="4px 4px 0 0"
        />
        <Flex p={6} mt={-12} direction="column">
          <Flex align="flex-end" mb={4}>
            <Avatar
              size="xl"
              src={userProfile?.photoURL}
              name={userProfile?.displayName}
              border="4px solid white"
              bg="brand.100"
            />
            <Flex ml={4} direction="column" flex={1}>
              <Text fontSize="2xl" fontWeight="bold">
                {userProfile?.displayName}
              </Text>
              <Text color="gray.500" fontSize="sm">
                u/{userProfile?.displayName?.toLowerCase().replace(/\s+/g, '') || 'user'}
              </Text>
              {userProfile?.createdAt && (
                <Flex align="center" mt={1} color="gray.500" fontSize="sm">
                  <Icon as={FaBirthdayCake} mr={1} />
                  <Text>
                    Joined {new Date(timestampToISO(userProfile.createdAt)).toLocaleDateString()}
                  </Text>
                </Flex>
              )}
            </Flex>
            <HStack>
              <Button
                size="sm"
                colorScheme={roleColor}
                variant="solid"
                onClick={() => toast({ title: "Your role", description: roleLabel, status: "info", duration: 2000 })}
              >
                {roleLabel}
              </Button>
              <Button
                leftIcon={<MdEdit />}
                colorScheme="blue"
                variant="outline"
                size="sm"
                onClick={handleEditProfile}
              >
                Edit Profile
              </Button>
            </HStack>
          </Flex>

          {/* Enhanced User Stats */}
          <Flex gap={6} wrap="wrap">
            <Flex align="center" bg="gray.50" p={3} borderRadius={6}>
              <Icon as={IoMdTrophy} color="orange.400" mr={2} />
              <Box>
                <Text fontWeight="bold" fontSize="lg">
                  {userProfile?.karma || 0}
                </Text>
                <Text fontSize="xs" color="gray.500">
                  Karma
                </Text>
              </Box>
            </Flex>
            
            <Flex align="center" bg="gray.50" p={3} borderRadius={6}>
              <Icon as={MdDateRange} color="brand.100" mr={2} />
              <Box>
                <Text fontWeight="bold" fontSize="lg">
                  {userPosts.length}
                </Text>
                <Text fontSize="xs" color="gray.500">
                  Posts
                </Text>
              </Box>
            </Flex>

            <Flex align="center" bg="gray.50" p={3} borderRadius={6}>
              <ChakraImage src="/images/logo.png" alt="logo" boxSize="24px" borderRadius="full" mr={2} />
              <Box>
                <Text fontWeight="bold" fontSize="lg">
                  {userProfile?.commentCount || 0}
                </Text>
                <Text fontSize="xs" color="gray.500">
                  Comments
                </Text>
              </Box>
            </Flex>
          </Flex>
          
          {/* Bio and additional info */}
          <Box mt={4}>
            <Text color="gray.600" mb={2}>
              {userProfile?.bio}
            </Text>
            <HStack spacing={4} mb={2}>
              {userProfile?.location && (
                <HStack spacing={1}>
                  <BsGeoAlt />
                  <Text fontSize="sm" color="gray.600">
                    {userProfile.location}
                  </Text>
                </HStack>
              )}
              {userProfile?.website && (
                <HStack spacing={1}>
                  <BsLink45Deg />
                  <Text fontSize="sm" color="blue.500" cursor="pointer">
                    {userProfile.website}
                  </Text>
                </HStack>
              )}
            </HStack>
          </Box>
        </Flex>
      </Box>

      {/* Enhanced Content Tabs with Real Data */}
      <Box bg="white" borderRadius={4} border="1px solid" borderColor="gray.300">
        <Tabs variant="enclosed">
          <TabList>
            <Tab _selected={{ color: "brand.100", borderBottomColor: "brand.100" }}>
              Posts ({userPosts.length})
            </Tab>
            <Tab _selected={{ color: "brand.100", borderBottomColor: "brand.100" }}>
              Comments
            </Tab>
            <Tab _selected={{ color: "brand.100", borderBottomColor: "brand.100" }}>
              About
            </Tab>
            <Tab _selected={{ color: "brand.100", borderBottomColor: "brand.100" }}>
              Communities
            </Tab>
          </TabList>

          <TabPanels>
            {/* Posts Tab with Real Data */}
            <TabPanel p={0}>
              {postsLoading ? (
                <Center py={10}>
                  <Spinner size="lg" color="brand.100" />
                </Center>
              ) : userPosts.length === 0 ? (
                <Center py={10}>
                  <Stack align="center" spacing={3}>
                    <ChakraImage src="/images/logo.png" alt="logo" boxSize="50px" borderRadius="full" />
                    <Text color="gray.500" fontSize="lg">
                      No posts yet
                    </Text>
                    <Text color="gray.400" fontSize="sm" textAlign="center">
                      Start sharing your thoughts with the community!
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
                        onDeletePost={onDeletePost}
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

            {/* Comments Tab */}
            <TabPanel>
              <Center py={10}>
                <Stack align="center" spacing={3}>
                  <ChakraImage src="/images/logo.png" alt="logo" boxSize="50px" borderRadius="full" />
                  <Text color="gray.500" fontSize="lg">
                    Comments coming soon
                  </Text>
                  <Text color="gray.400" fontSize="sm" textAlign="center">
                    Your comments will be displayed here
                  </Text>
                </Stack>
              </Center>
            </TabPanel>

            {/* About Tab */}
            <TabPanel>
              <Stack spacing={4} p={4}>
                <Box>
                  <Text fontWeight="bold" mb={2}>About</Text>
                  <Text color="gray.600">
                    {userProfile?.bio || "Welcome to your profile! Here you can view your posts, comments, and activity."}
                  </Text>
                </Box>
                
                <Divider />
                
                <Box>
                  <Text fontWeight="bold" mb={2}>Account Details</Text>
                  <Stack spacing={2} fontSize="sm">
                    <Flex>
                      <Text fontWeight="semibold" w="100px">Email:</Text>
                      <Text color="gray.600">{userProfile?.email}</Text>
                    </Flex>
                    <Flex>
                      <Text fontWeight="semibold" w="100px">User ID:</Text>
                      <Text color="gray.600" fontSize="xs">{userProfile?.uid}</Text>
                    </Flex>
                    {userProfile?.location && (
                      <Flex>
                        <Text fontWeight="semibold" w="100px">Location:</Text>
                        <Text color="gray.600">{userProfile.location}</Text>
                      </Flex>
                    )}
                    {userProfile?.website && (
                      <Flex>
                        <Text fontWeight="semibold" w="100px">Website:</Text>
                        <Text color="blue.500" cursor="pointer">{userProfile.website}</Text>
                      </Flex>
                    )}
                  </Stack>
                </Box>
              </Stack>
            </TabPanel>

            {/* Communities Tab */}
            <TabPanel>
              <Center py={10}>
                <Stack align="center" spacing={3}>
                  <ChakraImage src="/images/logo.png" alt="logo" boxSize="50px" borderRadius="full" />
                  <Text color="gray.500" fontSize="lg">
                    Communities coming soon
                  </Text>
                  <Text color="gray.400" fontSize="sm" textAlign="center">
                    Your joined communities will be displayed here
                  </Text>
                </Stack>
              </Center>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </Box>
  );
};

export default PersonalHome;
