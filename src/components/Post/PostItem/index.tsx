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
import { FiArrowUp, FiArrowDown, FiShare2 } from "react-icons/fi";
import { ChatIcon } from "@chakra-ui/icons";
import { Post } from "../../../atoms/postsAtom";
import Link from "next/link";
import { normalizeTimestamp, formatTimeAgo } from "../../../helpers/timestampHelpers";
import dynamic from "next/dynamic";
import PostModeration from "../PostModeration";
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { firestore } from "../../../firebase/clientApp";
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
  const singlePostView = !onSelectPost; // function not passed to [pid]
  
  const communityStateValue = useRecoilValue(communityState);
  const setCommunityStateValue = useSetRecoilState(communityState);
  const toast = useToast();
  const communityData = communityStateValue.currentCommunity;

  // Color mode values for dark theme
  const cardBg = useColorModeValue("gray.800", "gray.800");
  const metaColor = useColorModeValue("gray.300", "gray.300");
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
      const communityRef = doc(firestore, "communities", post.communityId);
      const isPinned = communityData?.pinnedPosts?.includes(post.id);
      
      if (isPinned) {
        // Unpin post
        await updateDoc(communityRef, {
          pinnedPosts: arrayRemove(post.id)
        });
        
        // Update local state
        const updatedPinnedPosts = communityData.pinnedPosts?.filter(id => id !== post.id) || [];
        setCommunityStateValue(prev => ({
          ...prev,
          currentCommunity: {
            ...prev.currentCommunity,
            pinnedPosts: updatedPinnedPosts
          }
        }));
        
        toast({
          title: "Post unpinned successfully",
          status: "success",
          duration: 3000,
        });
      } else {
        // Pin post
        await updateDoc(communityRef, {
          pinnedPosts: arrayUnion(post.id)
        });
        
        // Update local state
        const updatedPinnedPosts = [...(communityData.pinnedPosts || []), post.id];
        setCommunityStateValue(prev => ({
          ...prev,
          currentCommunity: {
            ...prev.currentCommunity,
            pinnedPosts: updatedPinnedPosts
          }
        }));
        
        toast({
          title: "Post pinned successfully",
          status: "success",
          duration: 3000,
        });
      }
      
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
      onClick={() => onSelectPost && post && onSelectPost(post, postIdx!)}
    >
      {/* Header meta - Reddit Style */}
      <HStack spacing={2} mb={2} color={metaColor} fontSize="sm">
        <Avatar size="xs" name={post.communityId} src={post.communityImageURL} />
        <Text fontWeight="semibold">r/{post.communityId}</Text>
        <Text>• {formatTimeAgo(normalizeTimestamp(post.createdAt))}</Text>
        <Text>• posted by {post.userDisplayText}</Text>
        {post.imageURL && (
          <Badge colorScheme="whiteAlpha" variant="subtle">SPOILER</Badge>
        )}
        <Button size="xs" colorScheme="blue" ml="auto" variant="solid">
          Join
        </Button>
      </HStack>

      {/* Title */}
      <Text fontSize="xl" fontWeight="bold" mb={3} color="white">
        {post.title}
      </Text>

      {/* Content */}
      {post.body && (
        <Text fontSize="md" color="gray.300" mb={3}>
          {post.body}
        </Text>
      )}

      {/* Media box with spoiler overlay */}
      {post.imageURL && (
        <Box
          position="relative"
          overflow="hidden"
          rounded="2xl"
          border="1px solid"
          borderColor="whiteAlpha.300"
          bg="black"
          mb={3}
        >
          {/* Ảnh */}
          <Box
            as="img"
            src={post.imageURL}
            alt={post.title}
            w="100%"
            maxH="600px"
            objectFit="cover"
            filter={hidden ? "blur(24px) grayscale(40%) brightness(0.7)" : "none"}
            transform={hidden ? "scale(1.02)" : "scale(1)"}
            transition="all .25s ease"
            onLoad={() => setLoadingImage(false)}
          />

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
                bg="blackAlpha.700"
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
        bg="gray.800"
        transition="all 0.2s ease"
        cursor="pointer"
        onClick={(e) => e.stopPropagation()}
        spacing={3}
      >
        <IconButton
          aria-label="Upvote"
          icon={<FiArrowUp />}
          size="sm"
          variant="ghost"
          bg={userVoteValue === 1 ? "orange.400" : "gray.300"}
          borderRadius="full"
          border="1px solid"
          borderColor={userVoteValue === 1 ? "orange.400" : "transparent"}
          _hover={{
            bg: "gray.700",
            borderColor: "orange.500",
            transform: "scale(1.1)"
          }}
          transition="all 0.2s ease"
          onClick={(event) => onVote(event, post, 1, post.communityId)}
        />
        
        <Text fontWeight="semibold" color="white">
          {post.voteStatus.toLocaleString()}
        </Text>
        
        <IconButton
          aria-label="Downvote"
          icon={<FiArrowDown />}
          size="sm"
          variant="ghost"
          bg={userVoteValue === -1 ? "blue.400" : "gray.300"}
          borderRadius="full"
          border="1px solid"
          borderColor={userVoteValue === -1 ? "blue.400" : "transparent"}
          _hover={{
            bg: "gray.700",
            borderColor: "blue.500",
            transform: "scale(1.1)"
          }}
          transition="all 0.2s ease"
          onClick={(event) => onVote(event, post, -1, post.communityId)}
        />
      </HStack>


        <HStack
          px={3}
          py={2}
          rounded="full"
          border="1px solid"
          borderColor="gray.800"
          bg="gray.700"
          _hover={{ 
            bg: "gray.700", 
            borderColor: "gray.600",
            transform: "scale(1.05)"
          }}
        >
          <ChatIcon color="gray.400" />
          <Text color="gray.400">{post.numberOfComments}</Text>
        </HStack>

        <HStack
          px={3}
          py={2}
          rounded="full"
          border="1px solid"
          borderColor="gray.800"
          bg="gray.700"
          _hover={{ 
            bg: "gray.600", 
            borderColor: "gray.600",
            transform: "scale(1.05)"
          }}
          transition="all 0.2s ease"
          cursor="pointer"
          onClick={(e) => e.stopPropagation()}
        >
          <FiShare2 color="white" />
          <Text color="white" fontSize="sm" fontWeight="medium">
            Share
          </Text>
        </HStack>

        {/* Moderation buttons */}
        {canModerate && (
          <HStack
            px={3}
            py={2}
            rounded="full"
            border="1px solid"
            borderColor="gray.800"
            bg="gray.700"
            _hover={{ 
              bg: "gray.600", 
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
              <Spinner size="sm" color="white" />
            ) : (
              <Icon as={MdPushPin} color="white" />
            )}
            <Text color="white" fontSize="sm" fontWeight="medium">
              {loadingPin ? "Processing..." : (isPinned ? "Unpin" : "Pin")}
            </Text>
          </HStack>
        )}

        {userIsCreator && (
          <HStack
            px={3}
            py={2}
            rounded="full"
            border="1px solid"
            borderColor="gray.800"
            bg="gray.700"
            _hover={{ 
              bg: "gray.600", 
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
                <Icon as={AiOutlineDelete} color="white" />
                <Text color="white" fontSize="sm" fontWeight="medium">
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
