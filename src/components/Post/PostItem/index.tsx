import React, { useState } from "react";
import {
  Flex,
  Icon,
  Image,
  Skeleton,
  Spinner,
  Stack,
  Text,
  Box,
  IconButton,
  Avatar,
  Badge,
  HStack,
  Button,
  useColorModeValue,
} from "@chakra-ui/react";
import { NextRouter } from "next/router";
import { AiOutlineDelete } from "react-icons/ai";
import { BsChat, BsDot, BsGlobe } from "react-icons/bs";
import { FaReddit, FaThumbsUp, FaShare } from "react-icons/fa";
import {
  IoArrowRedoOutline,
  IoBookmarkOutline,
} from "react-icons/io5";
import { MdPushPin } from "react-icons/md";
import { FiShare2 } from "react-icons/fi";
import { ChatIcon } from "@chakra-ui/icons";
import { Post } from "../../../atoms/postsAtom";
import Link from "next/link";
import { normalizeTimestamp, formatTimeAgo } from "../../../helpers/timestampHelpers";
import dynamic from "next/dynamic";
import PostModeration from "../PostModeration";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { communityState } from "../../../atoms/communitiesAtom";
import { useToast } from "@chakra-ui/react";

// Disable SSR for this component to prevent hydration issues
const PostItem = dynamic(() => Promise.resolve(PostItemComponent), {
  ssr: false,
  loading: () => <PostItemSkeleton />
});

const PostItemSkeleton = () => (
  <Flex
    border="1px solid"
    bg="white"
    borderColor="gray.300"
    borderRadius={4}
    p={4}
  >
    <Box height="200px" width="100%" />
  </Flex>
);

export type PostItemContentProps = {
  post: Post;
  onVote: (
    event: React.MouseEvent<HTMLButtonElement | SVGElement, MouseEvent>,
    post: Post,
    vote: number,
    communityId: string,
    postIdx?: number
  ) => void;
  onDeletePost: (post: Post) => Promise<boolean>;
  userIsCreator: boolean;
  onSelectPost?: (value: Post, postIdx: number) => void;
  router?: NextRouter;
  postIdx?: number;
  userVoteValue?: number;
  homePage?: boolean;
  canModerate?: boolean; // New prop for moderation permissions
};

const PostItemComponent: React.FC<PostItemContentProps> = ({
  post,
  postIdx,
  onVote,
  onSelectPost,
  router,
  onDeletePost,
  userVoteValue,
  userIsCreator,
  homePage,
  canModerate = false,
}) => {
  const [loadingImage, setLoadingImage] = useState(true);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [loadingPin, setLoadingPin] = useState(false);
  const [hidden, setHidden] = useState(false); // For spoiler functionality
  const [isPortrait, setIsPortrait] = useState(false);
  const singlePostView = !onSelectPost; // function not passed to [pid]
  
  const communityStateValue = useRecoilValue(communityState);
  const setCommunityStateValue = useSetRecoilState(communityState);
  const toast = useToast();
  const communityData = communityStateValue.currentCommunity;

  // Color mode values for dark theme
  const cardBg = useColorModeValue("white.800", "white.800");
  const metaColor = useColorModeValue("gray.500", "gray.500");
  const borderCol = useColorModeValue("whiteAlpha.300", "whiteAlpha.300");

  const handleDelete = async (
    event: React.MouseEvent<HTMLButtonElement | HTMLDivElement, MouseEvent>
  ) => {
    event.stopPropagation();
    setLoadingDelete(true);
    try {
      const success = await onDeletePost(post);
      if (!success) throw new Error("Failed to delete post");

      console.log("Post successfully deleted");

      // Could proably move this logic to onDeletePost function
      if (router) router.back();
    } catch (error: any) {
      console.log("Error deleting post", error.message);
      /**
       * Don't need to setLoading false if no error
       * as item will be removed from DOM
       */
      setLoadingDelete(false);
      // setError
    }
  };

  const handlePinPost = async () => {
    setLoadingPin(true);
    try {
      const isPinned = communityData?.pinnedPosts?.includes(post.id);
      const updatedPinnedPosts = isPinned
        ? (communityData.pinnedPosts || []).filter((id) => id !== post.id)
        : [...(communityData.pinnedPosts || []), post.id];

      // Optimistic local update; TODO: call API to persist
      setCommunityStateValue((prev) => ({
        ...prev,
        currentCommunity: {
          ...prev.currentCommunity,
          pinnedPosts: updatedPinnedPosts,
        },
      }));

      toast({
        title: isPinned ? "Post unpinned successfully" : "Post pinned successfully",
        status: "success",
        duration: 3000,
      });
      
    } catch (error) {
      toast({
        title: "Error pinning/unpinning post",
        status: "error",
        duration: 3000,
      });
    } finally {
      setLoadingPin(false);
    }
  };

  const isPinned = communityData?.pinnedPosts?.includes(post.id) || false;

  return (
    <Box
      bg={cardBg}
      rounded="xl"
      p={4}
      border="1px solid"
      borderColor={borderCol}
      shadow="md"
      cursor={singlePostView ? "unset" : "pointer"}
      _hover={{
        bg: "gray.100",
        
      }}
      onClick={() => onSelectPost && post && onSelectPost(post, postIdx!)}
    >
      {/* Header meta - Reddit Style */}
      <HStack spacing={2} mb={2} color={metaColor} fontSize="sm">
        <Avatar size="xs" name={post.communityId} src={post.communityImageURL} />
        <Text fontWeight="semibold">r/{post.communityId}</Text>
        <Text>• {formatTimeAgo(normalizeTimestamp(post.createdAt))}</Text>
        <Text>• posted by {post.userDisplayText}</Text>
        {post.imageURL && (
          <Badge colorScheme="black" variant="subtle">SPOILER</Badge>
        )}
        <Button size="xs" colorScheme="blue" ml="auto" variant="solid">
          Join
        </Button>
      </HStack>

      {/* Title */}
      <Text fontSize="xl" fontWeight="bold" mb={3} color="gray.350">
        {post.title}
      </Text>

      {/* Content */}
      {post.body && (
        <Text fontSize="md" color="black.300" mb={3}>
          {post.body}
        </Text>
      )}

      {/* Media box with spoiler overlay */}
      {post.imageURL && (
        <Box
          position="relative"
          overflow="hidden"
          rounded="2xl"
          mb={3}
        >
          {/* Ảnh */}
          <Box
            position="relative"
            w="100%"
            maxH="80vh" // giới hạn tối đa chiều cao
            overflow="hidden"
            rounded="2xl"
          >
            {/* Background mờ */}
            <Box
              as="img"
              src={post.imageURL}
              alt={post.title}
              position="absolute"
              inset={0}
              w="100%"
              h="80%"
              objectFit="cover"
              filter="blur(20px) brightness(0.7)"
              transform="scale(1.1)" // phóng to để tránh viền rỗ
            />

            {/* Ảnh chính */}
            <Box
              as="img"
              src={post.imageURL}
              alt={post.title}
              position="relative"
              zIndex={1}
              maxW="100%"
              maxH="80vh"
              m="auto"
              objectFit="contain"
            />
          </Box>


          {/* Overlay + nút View spoiler */}
          {hidden && (
            <>
              <Box
                position="absolute"
                inset={0}
                bgGradient="radial(blackAlpha.700, transparent 70%)"
              />
              <Button
                position="absolute"
                top="50%"
                left="50%"
                transform="translate(-50%, -50%)"
                onClick={() => setHidden(false)}
                rounded="full"
                px={5}
                size="sm"
                bg="black.700"
                _hover={{ bg: "blackAlpha.600" }}
              >
                View spoiler
              </Button>
            </>
          )}
        </Box>
      )}

      {/* Actions - Reddit Style */}
      <Flex mt={3} gap={3} align="center" wrap="wrap">
      <HStack
        px={3}
        py={1}
        rounded="full"
        border="1px solid"
        borderColor="whiteAlpha.300"
        bg="gray.300"
        transition="all 0.2s ease"
        cursor="pointer"
        onClick={(e) => e.stopPropagation()}
        spacing={3}
      >
        <IconButton
          aria-label="Like"
          icon={<FaThumbsUp />}
          size="sm"
          variant="ghost"
          bg={userVoteValue === 1 ? "blue.400" : "gray.300"}
          color={userVoteValue === 1 ? "white" : "gray.800"}
          borderRadius="full"
          borderColor={userVoteValue === 1 ? "blue.400" : "transparent"}
          _hover={{
            bg: "gray.200",
            transform: "scale(1.1)"
          }}
          transition="all 0.2s ease"
          onClick={(event) => onVote(event, post, 1, post.communityId)}
        />
        <Text fontWeight="semibold" color="black">
          {post.voteStatus.toLocaleString()}
        </Text>
      </HStack>


        <HStack
          px={3}
          py={2}
          rounded="full"
          borderColor="gray.800"
          bg="gray.300"
          _hover={{ 
            bg: "gray.350", 
            borderColor: "gray.600",
            transform: "scale(1.05)"
          }}
        >
          <ChatIcon color="gray.350" />
          <Text color="gray.350">{post.numberOfComments}</Text>
        </HStack>

        <HStack
          px={3}
          py={2}
          rounded="full"
          borderColor="gray.800"
          bg="gray.300"
          _hover={{ 
            bg: "gray.350", 
            borderColor: "gray.600",
            transform: "scale(1.05)"
          }}
          transition="all 0.2s ease"
          cursor="pointer"
          onClick={(e) => e.stopPropagation()}
        >
          <FiShare2 color="gray.350" />
          <Text color="gray.350" fontSize="sm" fontWeight="medium">
            Share
          </Text>
        </HStack>

        {/* Moderation buttons */}
        {canModerate && (
          <HStack
            px={3}
            py={2}
            rounded="full"
            borderColor="gray.800"
            bg="gray.300"
            _hover={{ 
              bg: "gray.350", 
              borderColor: "gray.600",
              transform: "scale(1.05)"
            }}
            transition="all 0.2s ease"
            cursor={loadingPin ? "not-allowed" : "pointer"}
            opacity={loadingPin ? 0.6 : 1}
            onClick={(e) => {
              e.stopPropagation();
              if (!loadingPin) {
                handlePinPost();
              }
            }}
          >
            {loadingPin ? (
              <Spinner size="sm" color="gray.350" />
            ) : (
              <Icon as={MdPushPin} color="gray.350" />
            )}
            <Text color="gray.350" fontSize="sm" fontWeight="medium">
              {loadingPin ? "Processing..." : (isPinned ? "Unpin" : "Pin")}
            </Text>
          </HStack>
        )}

        {userIsCreator && (
          <HStack
            px={3}
            py={2}
            rounded="full"
            borderColor="gray.800"
            bg="gray.300"
            _hover={{ 
              bg: "gray.350", 
              borderColor: "gray.600",
              transform: "scale(1.05)"
            }}
            transition="all 0.2s ease"
            cursor="pointer"
            onClick={handleDelete}
          >
            {loadingDelete ? (
              <Spinner size="sm" color="white" />
            ) : (
              <>
                <Icon as={AiOutlineDelete} color="gray.350" />
                <Text color="gray.350" fontSize="sm" fontWeight="medium">
                  Delete
                </Text>
              </>
            )}
          </HStack>
        )}
      </Flex>
    </Box>
  );
};

export default PostItem;
