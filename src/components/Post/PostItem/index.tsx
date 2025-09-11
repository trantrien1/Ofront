import React, { useRef, useState, useEffect } from "react";
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
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Textarea,
  Input,
  Tooltip,
} from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import { NextRouter } from "next/router";
import { AiOutlineDelete } from "react-icons/ai";
import { BsChat, BsDot, BsGlobe } from "react-icons/bs";
import { FaReddit, FaThumbsUp, FaShare } from "react-icons/fa";
import { BsEmojiFrown, BsEmojiSunglasses, BsEmojiSmile, BsEmojiNeutral } from "react-icons/bs"; // (legacy icons maybe still used elsewhere in file)
import { REACTIONS } from '../../../constants/reactions';
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
  // New: granular like-level (1..4) but we only surface 2 states (positive=3, negative=1)
  onUpdateLikeLevel?: (post: Post, level: number) => void;
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
  onUpdateLikeLevel,
}) => {
  const [loadingImage, setLoadingImage] = useState(true);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [loadingPin, setLoadingPin] = useState(false);
  const [approving, setApproving] = useState(false);
  const [hidden, setHidden] = useState(false); // For spoiler functionality
  const [isPortrait, setIsPortrait] = useState(false);
  const singlePostView = !onSelectPost; // function not passed to [pid]
  // Local overrides after edit
  const [overrideTitle, setOverrideTitle] = useState<string | undefined>(undefined);
  const [overrideBody, setOverrideBody] = useState<string | undefined>(undefined);
  
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
  const isAdmin = !!currentUser && /admin/i.test(String((currentUser as any)?.role || ''));
  const canDelete = !!currentUser && (isAdmin || isOwner);
  const canUpdate = canDelete; // only admin or owner can update
  
  // Edit modal state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState<string>(post.title || "");
  const [editBody, setEditBody] = useState<string>(post.body || "");
  const [savingEdit, setSavingEdit] = useState(false);
  const openEdit = (e: React.MouseEvent) => { e.stopPropagation(); setEditTitle(overrideTitle ?? post.title ?? ""); setEditBody(overrideBody ?? post.body ?? ""); setIsEditOpen(true); };
  const closeEdit = () => setIsEditOpen(false);
  const handleSaveEdit = async () => {
    if (!canUpdate) return;
    const title = editTitle?.trim();
    const content = editBody?.trim();
    if (!title && !content) { closeEdit(); return; }
    setSavingEdit(true);
    try {
      await (Svc as any).updatePost({ postId: post.id, title, content });
      setOverrideTitle(title ?? overrideTitle);
      setOverrideBody(content ?? overrideBody);
      toast({ status: 'success', title: 'Đã cập nhật bài viết' });
      closeEdit();
    } catch (err: any) {
      console.error('update post failed', err);
      toast({ status: 'error', title: 'Cập nhật thất bại', description: String(err?.message || err) });
    } finally { setSavingEdit(false); }
  };

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
  const likePosBg = useColorModeValue("green.500", "green.400");
  const likePosBgHover = useColorModeValue("green.600", "green.500");
  const likeNegBg = useColorModeValue("red.500", "red.400");
  const likeNegBgHover = useColorModeValue("red.600", "red.500");
  const iconMuted = useColorModeValue("gray.600", "gray.300");
  const contentBg = useColorModeValue("gray.50", "whiteAlpha.100");
  // Determine liked state from prop or post state for immediate UI feedback
  const [localLikeLevel, setLocalLikeLevel] = useState<number | undefined>((post as any).likeLevel);
  const [pending, setPending] = useState(false);
  // Reaction bar state (Facebook-like UX)
  const [showReactions, setShowReactions] = useState(false);
  const hoverTimer = useRef<any>(null);
  const hideTimer = useRef<any>(null);
  const clearTimers = () => { if (hoverTimer.current) { clearTimeout(hoverTimer.current); hoverTimer.current = null; } if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null; } };
  const handleMainEnter = () => { clearTimers(); hoverTimer.current = setTimeout(() => setShowReactions(true), 300); };
  const handleMainLeave = () => { clearTimers(); hideTimer.current = setTimeout(() => setShowReactions(false), 150); };
  const handleBarEnter = () => { clearTimers(); setShowReactions(true); };
  const handleBarLeave = () => { clearTimers(); hideTimer.current = setTimeout(() => setShowReactions(false), 150); };

  // Unified reaction definitions
  const reactions = REACTIONS;

  const slideIn = keyframes`
    from { transform: translateX(-10px); opacity: 0.9; }
    to { transform: translateX(0); opacity: 1; }
  `;

  // Stable effect-based sync instead of render-time conditional to avoid clobbering optimistic state
  const incomingLikeLevel = (post as any).likeLevel;
  useEffect(() => {
    setLocalLikeLevel(prev => {
      if (incomingLikeLevel === prev) return prev; // no change
      // If we are in a short optimistic pending window and server echoes old value, keep optimistic one
      if (pending && prev !== undefined && (incomingLikeLevel === undefined || incomingLikeLevel === null)) return prev;
      try { console.log('[PostItem] sync localLikeLevel ->', incomingLikeLevel, 'for post', post.id); } catch {}
      return incomingLikeLevel;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingLikeLevel]);
  const currentLikeLevel: number | undefined = localLikeLevel;
  const isPositive = currentLikeLevel === undefined || [1,2,3,4].includes(currentLikeLevel); // 1..4 positive/neutral
  const isNegative = currentLikeLevel === 5; // 5: angry
  // Border color follows current reaction color when available
  const activeReaction = reactions.find(r => r.lv === currentLikeLevel);
  const postBorderColor = activeReaction ? activeReaction.color : borderCol;
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
      border="2px solid"
      borderColor={postBorderColor}
      shadow="md"
      cursor={singlePostView ? "unset" : "pointer"}
      _hover={{
        bg: hoverBg,
      }}
  onClick={() => onSelectPost && post && onSelectPost(post, postIdx ?? 0)}
      tabIndex={0}
      onKeyDown={(e)=>{ if(e.key==='Enter' && onSelectPost) { onSelectPost(post, postIdx ?? 0);} }}
    >
      {/* Header meta - Reddit Style */}
      <HStack spacing={2} mb={2} color={metaColor} fontSize="sm">
  <Avatar size="xs" name={post.anonymous ? 'anonymous' : post.userDisplayText} src={post.anonymous ? undefined : (post as any).authorAvatarURL || post.communityImageURL} />
        <Text>Posted by</Text>
  <Text fontWeight="semibold">{post.anonymous ? 'anonymous' : post.userDisplayText}</Text>
  <Text>{createdAtLabel}</Text>
        {post.anonymous && (
          <Badge colorScheme="purple" variant="subtle">anonymous</Badge>
        )}
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
        {overrideTitle ?? post.title}
      </Text>

      {/* Content */}
  {(overrideBody ?? post.body) && (
        <Box bg={contentBg} px={4} py={3} rounded="lg" mb={3}>
          <Text fontSize="lg" color={bodyColor}>
    {overrideBody ?? post.body}
          </Text>
        </Box>
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

      

      {/* Actions - grouped: user interactions on the left, admin on the right */}
      <Flex mt={3} gap={3} align="center" wrap="wrap" justify="space-between">
        {/* Left cluster: Like / Dislike / Comment / Share */}
        <HStack gap={3} align="center" position="relative">
          {/* Main Like button with delayed hover to open reaction bar */}
          {(() => {
            const current = reactions.find(r => r.lv === currentLikeLevel);
            const mainIcon = (current?.icon) || FaThumbsUp;
            const mainColor = current ? current.color : iconMuted;
            const mainLabel = current ? current.label : 'Đồng ý';
            return (
              <HStack
                px={3}
                py={2}
                rounded="full"
                border="1px solid"
                borderColor={current ? mainColor : borderCol}
                bg={chipBg}
                _hover={{ bg: chipHoverBg, transform: "scale(1.03)" }}
                cursor="pointer"
                onMouseEnter={handleMainEnter}
                onMouseLeave={handleMainLeave}
                onClick={(e) => {
                  e.stopPropagation();
                  // Toggle default Like (1)
                  if (currentLikeLevel === 1) {
                    // Unset locally (backend may not support clear)
                    setLocalLikeLevel(undefined as any);
                  } else {
                    setLocalLikeLevel(1);
                    if (onUpdateLikeLevel) onUpdateLikeLevel(post, 1);
                  }
                }}
              >
                <Icon as={mainIcon as any} color={current ? mainColor : iconMuted} />
                <Text color={chipText} fontSize="sm" fontWeight="medium">{mainLabel}</Text>
              </HStack>
            );
          })()}

          {/* Reaction bar (popover) */}
          {showReactions && (
            <HStack
              spacing={2}
              position="absolute"
              top="-56px"
              left={0}
              bg={cardBg}
              border="1px solid"
              borderColor={borderCol}
              boxShadow="lg"
              rounded="full"
              px={3}
              py={2}
              onMouseEnter={handleBarEnter}
              onMouseLeave={handleBarLeave}
              zIndex={10}
              animation={`${slideIn} 140ms ease-out`}
            >
              {reactions.map(({ lv, label, icon, color }) => {
                const active = currentLikeLevel === lv;
                return (
                  <Tooltip key={lv} label={label} hasArrow>
                    <Box
                      as="button"
                      onClick={(e: any) => {
                        e.stopPropagation();
                        if (currentLikeLevel === lv) {
                          // Unset locally when clicking same reaction
                          setLocalLikeLevel(undefined as any);
                        } else {
                          setLocalLikeLevel(lv as any);
                          if (onUpdateLikeLevel) onUpdateLikeLevel(post, lv as any);
                        }
                        setShowReactions(false);
                      }}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      w="38px"
                      h="38px"
                      rounded="full"
                      bg={active ? chipHoverBg : chipBg}
                      border="1px solid"
                      borderColor={active ? color : borderCol}
                      transition="transform 120ms ease, background 120ms ease"
                      _hover={{ transform: 'scale(1.15)' }}
                    >
                      <Icon as={icon as any} color={active ? color : iconMuted} boxSize={5} />
                    </Box>
                  </Tooltip>
                );
              })}
            </HStack>
          )}

          {/* Comment */}
          <HStack
            px={3}
            py={2}
            rounded="full"
            border="1px solid"
            borderColor={borderCol}
            bg={chipBg}
            _hover={{ bg: chipHoverBg, transform: "scale(1.05)" }}
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

          {/* Share */}
          <HStack
            px={3}
            py={2}
            rounded="full"
            border="1px solid"
            borderColor={borderCol}
            bg={chipBg}
            _hover={{ bg: chipHoverBg, transform: "scale(1.05)" }}
            transition="all 0.2s ease"
            cursor="pointer"
            onClick={(e) => { e.stopPropagation(); toast({ title: "Chức năng này sẽ sớm ra mắt", status: "info", duration: 2500 }); }}
          >
            <FiShare2 color={iconMuted} />
            <Text color={chipText} fontSize="sm" fontWeight="medium">Share</Text>
          </HStack>
        </HStack>

        {/* Right cluster: Admin/Owner */}
        <HStack gap={3} align="center">
          {canUpdate && (
            <HStack
              px={3}
              py={2}
              rounded="full"
              border="1px solid"
              borderColor={borderCol}
              bg={chipBg}
              _hover={{ bg: chipHoverBg, transform: "scale(1.05)" }}
              transition="all 0.2s ease"
              cursor={savingEdit ? "not-allowed" : "pointer"}
              opacity={savingEdit ? 0.6 : 1}
              onClick={openEdit}
            >
              {savingEdit ? (
                <Spinner size="sm" color={iconMuted} />
              ) : (
                <Icon as={FaShare} color={iconMuted} transform="rotate(180deg)" />
              )}
              <Text color={iconMuted} fontSize="sm" fontWeight="medium">
                {savingEdit ? "Đang lưu..." : "Cập nhật"}
              </Text>
            </HStack>
          )}
          {/* Admin/dev-only small debug tag */}
          {canModerate && (
            <HStack
              px={3}
              py={2}
              rounded="full"
              border="1px solid"
              borderColor={borderCol}
              bg={chipBg}
              _hover={{ bg: chipHoverBg, transform: "scale(1.05)" }}
              transition="all 0.2s ease"
              cursor={loadingPin ? "not-allowed" : "pointer"}
              opacity={loadingPin ? 0.6 : 1}
              onClick={(e) => {
                e.stopPropagation();
                if (!loadingPin) handlePinPost();
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
              border="1px solid"
              borderColor={borderCol}
              bg={chipBg}
              _hover={{ bg: chipHoverBg, transform: "scale(1.05)" }}
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
        </HStack>
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

      {/* Edit Post Modal */}
      <Modal isOpen={isEditOpen} onClose={closeEdit} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Cập nhật bài viết</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={3}>
              <Box>
                <Text fontSize="sm" fontWeight={600} mb={1}>Tiêu đề</Text>
                <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Cập nhật tiêu đề..." />
              </Box>
              <Box>
                <Text fontSize="sm" fontWeight={600} mb={1}>Nội dung</Text>
                <Textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} placeholder="Cập nhật nội dung..." minH="120px" />
              </Box>
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={closeEdit}>Hủy</Button>
            <Button colorScheme="blue" onClick={handleSaveEdit} isLoading={savingEdit}>Lưu</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default PostItem;
