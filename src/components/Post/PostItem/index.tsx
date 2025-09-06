import React, { useRef, useState } from "react";
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
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
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
import { normalizeTimestamp, useRelativeTime } from "../../../helpers/timestampHelpers";
import dynamic from "next/dynamic";
import PostModeration from "../PostModeration";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { communityState, CommunitySnippet } from "../../../atoms/communitiesAtom";
import { useToast } from "@chakra-ui/react";
import { joinGroup } from "../../../services/groups.service";
import { userState } from "../../../atoms/userAtom";
import * as Svc from "../../../services/posts.service";


// function normalizeTimestamp(ts: string) {
//   const d = new Date(ts)
//   // cộng thêm 7 giờ
//   d.setHours(d.getHours() + 7)
//   return d
// }

// Disable SSR for this component to prevent hydration issues
const PostItem = dynamic(() => Promise.resolve(PostItemComponent), {
  ssr: false,
  loading: () => <PostItemSkeleton />
});

const PostItemSkeleton = () => {
  const bg = useColorModeValue("white", "gray.800");
  const borderCol = useColorModeValue("gray.200", "gray.700");
  return (
    <Flex border="1px solid" bg={bg} borderColor={borderCol} borderRadius={4} p={4}>
      <Box height="200px" width="100%" />
    </Flex>
  );
};

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
  const [approving, setApproving] = useState(false);
  const [hidden, setHidden] = useState(false); // For spoiler functionality
  const [isPortrait, setIsPortrait] = useState(false);
  const singlePostView = !onSelectPost; // function not passed to [pid]
  
  const communityStateValue = useRecoilValue(communityState);
  const setCommunityStateValue = useSetRecoilState(communityState);
  const currentUser = useRecoilValue(userState) as any;
  const toast = useToast();
  const communityData = communityStateValue.currentCommunity;
  // Determine ownership (case-insensitive) with multiple fallbacks because upstream may not always provide consistent IDs
  const currentUid = currentUser?.uid ? String(currentUser.uid).toLowerCase() : null;
  const possibleOwnerIds: string[] = [];
  try {
    if ((post as any).creatorId) possibleOwnerIds.push(String((post as any).creatorId));
    if ((post as any).userUID) possibleOwnerIds.push(String((post as any).userUID));
    if (post.userDisplayText) possibleOwnerIds.push(String(post.userDisplayText));
    if ((post as any).userOfPost?.username) possibleOwnerIds.push(String((post as any).userOfPost.username));
    if ((post as any).userOfPost?.userUID) possibleOwnerIds.push(String((post as any).userOfPost.userUID));
  } catch {}
  const normalizedOwners = possibleOwnerIds
    .filter(Boolean)
    .map(v => v.trim().toLowerCase())
    .filter((v, i, arr) => arr.indexOf(v) === i);
  const isOwner = !!currentUid && normalizedOwners.includes(currentUid);
  const canDelete = !!currentUser && (currentUser?.role === 'admin' || isOwner);

  // Color mode values
  const cardBg = useColorModeValue("white", "gray.800");
  const metaColor = useColorModeValue("gray.600", "gray.400");
  const borderCol = useColorModeValue("gray.200", "gray.700");
  const hoverBg = useColorModeValue("gray.50", "gray.700");
  const titleColor = useColorModeValue("gray.800", "gray.100");
  const bodyColor = useColorModeValue("gray.700", "gray.200");
  const chipBg = useColorModeValue("gray.100", "gray.700");
  const chipHoverBg = useColorModeValue("gray.200", "gray.600");
  const chipText = useColorModeValue("gray.800", "gray.100");
  const likeBg = useColorModeValue("blue.500", "blue.400");
  const likeBgHover = useColorModeValue("blue.600", "blue.500");
  const likeBorder = useColorModeValue("blue.500", "blue.400");
  const iconMuted = useColorModeValue("gray.600", "gray.300");
  // Determine liked state from prop or post state for immediate UI feedback
  const isLiked = ((userVoteValue ?? post.currentUserVoteStatus?.voteValue) === 1);
  // Relative time label (must call hook at stable position)
  const createdAtLabel = useRelativeTime(normalizeTimestamp(post.createdAt));

  const [confirmOpen, setConfirmOpen] = useState(false);
  const cancelRef = useRef<any>();
  const requestDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canDelete) return;
    setConfirmOpen(true);
  };
  const onConfirmDelete = async () => {
    setConfirmOpen(false);
    setLoadingDelete(true);
    try {
      const success = await onDeletePost(post);
      if (!success) throw new Error("Failed to delete post");
      toast({ status: 'success', title: 'Đã xóa bài viết' });
      if (router) router.back();
    } catch (error: any) {
      console.error("Error deleting post", error?.message || error);
      setLoadingDelete(false);
    }
  };
  const onCancelDelete = () => setConfirmOpen(false);

  const handlePinPost = async () => {
    setLoadingPin(true);
    try {
      toast({ title: "Chức năng này sẽ sớm ra mắt", status: "info", duration: 2500 });
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
        bg: hoverBg,
      }}
  onClick={() => onSelectPost && post && onSelectPost(post, postIdx ?? 0)}
    >
      {/* Header meta - Reddit Style */}
      <HStack spacing={2} mb={2} color={metaColor} fontSize="sm">
  <Avatar size="xs" name={post.userDisplayText} src={(post as any).authorAvatarURL || post.communityImageURL} />
        <Text>Posted by</Text>
        <Text fontWeight="semibold">{post.userDisplayText}</Text>
  <Text>{createdAtLabel}</Text>
        
        {typeof post.status === 'number' && post.status === 0 && (
          <Badge colorScheme="yellow" variant="subtle">Pending approval</Badge>
        )}
        {/* Approved badge hidden per request */}
        {post.imageURL && (
          <Badge colorScheme="black" variant="subtle">SPOILER</Badge>
        )}
        
      </HStack>

      {/* Title */}
  <Text fontSize="xl" fontWeight="bold" mb={3} color={titleColor}>
        {post.title}
      </Text>

      {/* Content */}
      {post.body && (
        <Text fontSize="md" color={bodyColor} mb={3}>
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


        </Box>
      )}

      

      {/* Actions - Reddit Style */}
      <Flex mt={3} gap={3} align="center" wrap="wrap">
      <HStack
        px={3}
        py={1}
        rounded="full"
        border="1px solid"
        borderColor={borderCol}
        bg={chipBg}
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
          bg={isLiked ? likeBg : chipBg}
          color={isLiked ? "white" : chipText}
          borderRadius="full"
          borderColor={isLiked ? likeBorder : "transparent"}
          _hover={{
            bg: isLiked ? likeBgHover : chipHoverBg,
            transform: "scale(1.1)"
          }}
          transition="all 0.2s ease"
          aria-pressed={isLiked}
          onClick={(event) => onVote(event, post, 1, post.communityId)}
        />
        <Text fontWeight="semibold" color={chipText}>
          {post.voteStatus.toLocaleString()}
        </Text>
      </HStack>


        <HStack
          px={3}
          py={2}
          rounded="full"
          borderColor={borderCol}
          bg={chipBg}
          _hover={{ 
            bg: chipHoverBg, 
            borderColor: borderCol,
            transform: "scale(1.05)"
          }}
          cursor="pointer"
      onClick={async (e) => {
            e.stopPropagation();
            try {
        const mapped = await Svc.getPostById({ postId: post.id });
        if (onSelectPost) onSelectPost(mapped as any, postIdx ?? 0);
            } catch (err: any) {
              console.error("Error fetching post detail:", err);
              toast({ status: 'error', title: 'Không tải được bình luận', description: String(err?.message || err) });
            }
          }}
        >
          <ChatIcon color={iconMuted} />
          <Text color={chipText}>{post.numberOfComments}</Text>
        </HStack>


        <HStack
          px={3}
          py={2}
          rounded="full"
          borderColor={borderCol}
          bg={chipBg}
          _hover={{ 
            bg: chipHoverBg, 
            borderColor: borderCol,
            transform: "scale(1.05)"
          }}
          transition="all 0.2s ease"
          cursor="pointer"
          onClick={(e) => { e.stopPropagation(); toast({ title: "Chức năng này sẽ sớm ra mắt", status: "info", duration: 2500 }); }}
        >
          <FiShare2 color={iconMuted} />
          <Text color={chipText} fontSize="sm" fontWeight="medium">
            Share
          </Text>
        </HStack>

        {/* Moderation buttons */}
  {canModerate && (
          <HStack
            px={3}
            py={2}
            rounded="full"
            borderColor={borderCol}
            bg={chipBg}
            _hover={{ 
              bg: chipHoverBg, 
              borderColor: borderCol,
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
              <Spinner size="sm" color={iconMuted} />
            ) : (
              <Icon as={MdPushPin} color={iconMuted} />
            )}
            <Text color={iconMuted} fontSize="sm" fontWeight="medium">
              {loadingPin ? "Processing..." : (isPinned ? "Unpin" : "Pin")}
            </Text>
          </HStack>
        )}

    {canDelete && (
          <HStack
            px={3}
            py={2}
            rounded="full"
            borderColor={borderCol}
            bg={chipBg}
            _hover={{
              bg: chipHoverBg,
              borderColor: borderCol,
              transform: "scale(1.05)",
              color: "red.500"
            }}
            transition="all 0.2s ease"
            cursor={loadingDelete ? "not-allowed" : "pointer"}
            opacity={loadingDelete ? 0.6 : 1}
      onClick={requestDelete}
          >
            {loadingDelete ? (
              <Spinner size="sm" color={iconMuted} />
            ) : (
              <Icon as={AiOutlineDelete} color="red.400" />
            )}
            <Text color={iconMuted} fontSize="sm" fontWeight="medium">
              {loadingDelete ? "Đang xóa..." : "Xóa"}
            </Text>
          </HStack>
        )}

  {/* Approve/Delete controls removed per request */}
      </Flex>
      <AlertDialog
        isOpen={confirmOpen}
        leastDestructiveRef={cancelRef}
        onClose={onCancelDelete}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize='lg' fontWeight='bold'>Xóa bài viết</AlertDialogHeader>
            <AlertDialogBody>
              Bạn có chắc muốn xóa bài viết này? Hành động không thể hoàn tác.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onCancelDelete} variant='ghost'>Hủy</Button>
              <Button colorScheme='red' ml={3} onClick={onConfirmDelete} isLoading={loadingDelete}>Xóa</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

export default PostItem;
