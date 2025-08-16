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
} from "@chakra-ui/react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../../firebase/clientApp";
import { useRouter } from "next/router";
import { BsCalendar3, BsGeoAlt, BsLink45Deg } from "react-icons/bs";
import { MdEdit } from "react-icons/md";

const PersonalHome: React.FC = () => {
  const [user] = useAuthState(auth);
  const router = useRouter();
  const toast = useToast();
  const [isEditing, setIsEditing] = useState(false);

  // Mock data - trong thực tế sẽ lấy từ database
  const [profileData, setProfileData] = useState({
    displayName: user?.displayName || "User",
    email: user?.email || "",
    photoURL: user?.photoURL || "",
    bio: "This is my personal bio. I love sharing and discussing interesting topics!",
    location: "Vietnam",
    website: "https://example.com",
    joinDate: new Date(user?.metadata.creationTime || Date.now()),
    karma: 1234,
    posts: 45,
    comments: 156,
    communities: 12,
  });

  useEffect(() => {
    if (!user) {
      router.push("/");
    }
  }, [user, router]);

  if (!user) {
    return null;
  }

  const formatJoinDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

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
      {/* Profile Info Card (không phải header nữa) */}
      <Box
        bg="white"
        borderRadius="lg"
        boxShadow="sm"
        p={6}
        mb={6}
      >
        <Flex direction={{ base: "column", md: "row" }} align="start" gap={6}>
          <Avatar
            size="2xl"
            src={profileData.photoURL}
            name={profileData.displayName}
            boxShadow="lg"
          />

          <Box flex={1}>
            <Flex justify="space-between" align="start" mb={4}>
              <Box>
                <Text fontSize="2xl" fontWeight="bold" mb={2}>
                  {profileData.displayName}
                </Text>
                <Text color="gray.600" mb={2}>
                  u/{profileData.displayName?.toLowerCase()}
                </Text>
                <Text color="gray.500" fontSize="sm" mb={3}>
                  {profileData.bio}
                </Text>

                <HStack spacing={4} mb={4}>
                  <HStack spacing={1}>
                    <BsCalendar3 />
                    <Text fontSize="sm" color="gray.600">
                      Joined {formatJoinDate(profileData.joinDate)}
                    </Text>
                  </HStack>
                  {profileData.location && (
                    <HStack spacing={1}>
                      <BsGeoAlt />
                      <Text fontSize="sm" color="gray.600">
                        {profileData.location}
                      </Text>
                    </HStack>
                  )}
                  {profileData.website && (
                    <HStack spacing={1}>
                      <BsLink45Deg />
                      <Text fontSize="sm" color="blue.500" cursor="pointer">
                        {profileData.website}
                      </Text>
                    </HStack>
                  )}
                </HStack>
              </Box>

              <Button
                leftIcon={<MdEdit />}
                colorScheme="blue"
                variant="outline"
                size="sm"
                onClick={handleEditProfile}
              >
                Edit Profile
              </Button>
            </Flex>

            {/* Stats */}
            <HStack spacing={6}>
              <VStack spacing={1}>
                <Text fontSize="lg" fontWeight="bold">
                  {profileData.karma.toLocaleString()}
                </Text>
                <Text fontSize="sm" color="gray.600">
                  Karma
                </Text>
              </VStack>
              <VStack spacing={1}>
                <Text fontSize="lg" fontWeight="bold">
                  {profileData.posts}
                </Text>
                <Text fontSize="sm" color="gray.600">
                  Posts
                </Text>
              </VStack>
              <VStack spacing={1}>
                <Text fontSize="lg" fontWeight="bold">
                  {profileData.comments}
                </Text>
                <Text fontSize="sm" color="gray.600">
                  Comments
                </Text>
              </VStack>
              <VStack spacing={1}>
                <Text fontSize="lg" fontWeight="bold">
                  {profileData.communities}
                </Text>
                <Text fontSize="sm" color="gray.600">
                  Communities
                </Text>
              </VStack>
            </HStack>
          </Box>
        </Flex>
      </Box>

      {/* Content Tabs */}
      <Box bg="white" borderRadius="lg" boxShadow="sm">
        <Tabs variant="enclosed">
          <TabList>
            <Tab>Posts</Tab>
            <Tab>Comments</Tab>
            <Tab>Upvoted</Tab>
            <Tab>Downvoted</Tab>
            <Tab>Communities</Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              <VStack spacing={4} align="stretch">
                <Text fontSize="lg" fontWeight="bold" mb={4}>
                  Your Posts
                </Text>
                <Box p={4} border="1px solid" borderColor="gray.200" borderRadius="md">
                  <Text color="gray.500" textAlign="center">
                    No posts yet. Start sharing your thoughts!
                  </Text>
                </Box>
              </VStack>
            </TabPanel>

            <TabPanel>
              <VStack spacing={4} align="stretch">
                <Text fontSize="lg" fontWeight="bold" mb={4}>
                  Your Comments
                </Text>
                <Box p={4} border="1px solid" borderColor="gray.200" borderRadius="md">
                  <Text color="gray.500" textAlign="center">
                    No comments yet. Join the conversation!
                  </Text>
                </Box>
              </VStack>
            </TabPanel>

            <TabPanel>
              <VStack spacing={4} align="stretch">
                <Text fontSize="lg" fontWeight="bold" mb={4}>
                  Upvoted Posts
                </Text>
                <Box p={4} border="1px solid" borderColor="gray.200" borderRadius="md">
                  <Text color="gray.500" textAlign="center">
                    No upvoted posts yet.
                  </Text>
                </Box>
              </VStack>
            </TabPanel>

            <TabPanel>
              <VStack spacing={4} align="stretch">
                <Text fontSize="lg" fontWeight="bold" mb={4}>
                  Downvoted Posts
                </Text>
                <Box p={4} border="1px solid" borderColor="gray.200" borderRadius="md">
                  <Text color="gray.500" textAlign="center">
                    No downvoted posts yet.
                  </Text>
                </Box>
              </VStack>
            </TabPanel>

            <TabPanel>
              <VStack spacing={4} align="stretch">
                <Text fontSize="lg" fontWeight="bold" mb={4}>
                  Your Communities
                </Text>
                <Box p={4} border="1px solid" borderColor="gray.200" borderRadius="md">
                  <Text color="gray.500" textAlign="center">
                    No communities joined yet. Discover communities!
                  </Text>
                </Box>
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </Box>
  );
};

export default PersonalHome;
