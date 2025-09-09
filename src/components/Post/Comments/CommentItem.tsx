import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Flex,
  Icon,
  Spinner,
  Stack,
  Text,
  Button,
  useColorModeValue,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverArrow,
  PopoverBody,
  HStack,
} from "@chakra-ui/react";
type Timestamp = any;
import { FaThumbsUp, FaThumbsDown } from "react-icons/fa";
import { Image } from "@chakra-ui/react";
import { normalizeTimestamp, useRelativeTime } from "../../../helpers/timestampHelpers";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import ReplyInput from "./ReplyInput";
import CommentsService from "../../../services/comments.service";

// Disable SSR for this component to prevent hydration issues
const DynamicCommentItem = dynamic(() => Promise.resolve(CommentItemComponent), {
  ssr: false,
  loading: () => <CommentItemSkeleton />
});

const CommentItemSkeleton = () => (
  <Flex>
    <Box mr={2}>
      <Image src="/images/logo.png" alt="logo" boxSize="30px" borderRadius="full" />
    </Box>
    <Stack spacing={1} flex={1}>
      <Text fontSize="sm" color="gray.500">Loading comment...</Text>
    </Stack>
  </Flex>
);

export type Comment = {
  id?: string;
  creatorId: string;
  creatorDisplayText: string;
  creatorPhotoURL: string;
  communityId: string;
  postId: string;
  postTitle: string;
  text: string;
  createdAt?: Timestamp;
  parentId?: string; // ID of parent comment (for replies)
  replies?: Comment[]; // Nested replies
  replyCount?: number; // Number of replies
  likeCount?: number; // Number of likes
  likedByMe?: boolean; // Whether current user liked this comment
};

type CommentItemProps = {
  comment: Comment;
  onDeleteComment: (comment: Comment) => void;
  onReply: (parentComment: Comment, replyText: string) => void;
  isLoading: boolean;
  userId?: string;
  user?: any;
  level?: number; // Nesting level (0 = top level, 1 = reply, 2 = reply to reply, etc.)
};

const CommentItemComponent: React.FC<CommentItemProps> = ({
  comment,
  onDeleteComment,
  onReply,
  isLoading,
  userId,
  user,
  level = 0,
}) => {
  const router = useRouter();
  const commentRef = useRef<HTMLDivElement>(null);
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [likeLevel, setLikeLevel] = useState<number | undefined>(() => {
    const lvl = (comment as any).likeLevel;
    if (typeof lvl === 'number') return lvl;
    // Fallback: legacy likedByMe -> satisfied (3)
    if ((comment as any).likedByMe) return 3;
    return undefined;
  });
  const inflightRef = useRef<string | null>(null);

  // Theming colors
  const highlightBg = useColorModeValue("gray.100", "whiteAlpha.100");
  const highlightBorder = useColorModeValue("gray.300", "whiteAlpha.300");
  const timestampColor = useColorModeValue("gray.600", "gray.400");
  const actionsColor = useColorModeValue("gray.600", "gray.400");
  const likePosBg = useColorModeValue("green.500", "green.400");
  const likePosBgHover = useColorModeValue("green.600", "green.500");
  const likeNegBg = useColorModeValue("red.500", "red.400");
  const likeNegBgHover = useColorModeValue("red.600", "red.500");
  const hoverLinkColor = useColorModeValue("blue.600", "blue.300");
  const likeCountColor = useColorModeValue("gray.500", "gray.400");
  console.log("đây là giờ comment", comment.createdAt);
  // Precompute relative time label to avoid calling hook inside conditional directly in JSX
  const commentTimeLabel = useRelativeTime(comment.createdAt ? normalizeTimestamp(comment.createdAt) : undefined);
  // Check if this comment should be highlighted based on URL hash
  useEffect(() => {
    // Only run on client side after component mounts
    const checkHighlight = () => {
      if (typeof window !== 'undefined' && router.isReady) {
        const hash = window.location.hash;
        const targetCommentId = hash.replace('#comment-', '');
        
        if (targetCommentId === comment.id) {
          setIsHighlighted(true);
          // Scroll to the comment
          setTimeout(() => {
            commentRef.current?.scrollIntoView({
              behavior: 'smooth',
              block: 'center'
            });
          }, 100);
          
          // Remove highlight after 2 seconds
          setTimeout(() => {
            setIsHighlighted(false);
          }, 2000);
        }
      }
    };

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(checkHighlight, 0);
    
    return () => clearTimeout(timeoutId);
  }, [comment.id, router.asPath, router.isReady]);

  const handleReply = async (replyText: string) => {
    setReplyLoading(true);
    try {
      await onReply(comment, replyText);
      setReplyText("");
      setShowReplyInput(false);
    } catch (error: any) {
  console.error("Error creating reply:", error?.message || error);
    }
    setReplyLoading(false);
  };

  const handleCancelReply = () => {
    setShowReplyInput(false);
    setReplyText("");
  };

  const setLevel = async (level: number) => {
    if (!comment.id) return;
    if (updating) return;
    // Toggle off if same level clicked (local only for now)
    if (likeLevel === level) {
      setLikeLevel(undefined);
      return;
    }
    const prev = likeLevel;
    setLikeLevel(level);
    setUpdating(true);
    inflightRef.current = comment.id;
    try {
      console.debug('[CommentItem] update-level start', { commentId: comment.id, level });
      await fetch('/api/update-level', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ commentId: comment.id, level })
      });
      console.debug('[CommentItem] update-level done');
    } catch (e) {
      // rollback
      setLikeLevel(prev);
      console.warn('[CommentItem] update-level failed', e);
    }
    inflightRef.current = null;
    setUpdating(false);
  };

  const isPositive = likeLevel === 3 || likeLevel === 4;
  const isNegative = likeLevel === 1 || likeLevel === 2;

  return (
    <Box>
      <Flex
        ref={commentRef}
        id={`comment-${comment.id}`}
        bg={isHighlighted ? highlightBg : "transparent"}
        p={isHighlighted ? 2 : 0}
        borderRadius={isHighlighted ? "md" : "none"}
        transition="all 0.2s ease"
        borderColor={isHighlighted ? highlightBorder : "transparent"}
        ml={level * 4} // Indent based on nesting level
      >
        <Box mr={2}>
          <Image src="/images/logo.png" alt="logo" boxSize="30px" borderRadius="full" />
        </Box>
        <Stack spacing={1} flex={1}>
          <Stack direction="row" align="center" spacing={2} fontSize="8pt">
            <Text
              fontWeight={700}
              _hover={{ textDecoration: "underline", cursor: "pointer" }}
            >
              {comment.creatorDisplayText}
            </Text>
            {comment.createdAt ? (
              <Text color={timestampColor}>{commentTimeLabel}</Text>
            ) : (
              <Text color={timestampColor}>sai thoi gian</Text>
            )}
            {isLoading && <Spinner size="sm" />}
          </Stack>
          <Text fontSize="10pt">{comment.text}</Text>
          <Stack direction="row" align="center" fontWeight={600} color={actionsColor}>
            <Popover placement="top" trigger="click">
              <PopoverTrigger>
                <Button
                  size="xs"
                  variant={likeLevel ? 'solid' : 'outline'}
                  fontSize="9pt"
                  isLoading={updating}
                  colorScheme={isPositive ? 'green' : isNegative ? 'red' : undefined}
                >
                  {isPositive ? 'Hài lòng' : isNegative ? 'Không hài lòng' : 'Phản hồi'}
                </Button>
              </PopoverTrigger>
              <PopoverContent w="auto" bg={useColorModeValue('white', 'gray.700')} _focus={{ outline: 'none' }}>
                <PopoverArrow />
                <PopoverBody p={2}>
                  <HStack spacing={2}>
                    <Button
                      size="xs"
                      leftIcon={<Icon as={FaThumbsUp} />}
                      bg={isPositive ? likePosBg : undefined}
                      color={isPositive ? 'white' : 'green.500'}
                      _hover={{ bg: isPositive ? likePosBgHover : 'green.50' }}
                      onClick={() => !updating && setLevel(3)}
                    >
                      Hài lòng
                    </Button>
                    <Button
                      size="xs"
                      leftIcon={<Icon as={FaThumbsDown} />}
                      bg={isNegative ? likeNegBg : undefined}
                      color={isNegative ? 'white' : 'red.500'}
                      _hover={{ bg: isNegative ? likeNegBgHover : 'red.50' }}
                      onClick={() => !updating && setLevel(1)}
                    >
                      Không hài lòng
                    </Button>
                  </HStack>
                </PopoverBody>
              </PopoverContent>
            </Popover>
            <Text fontSize="9pt" _hover={{ color: hoverLinkColor }} onClick={() => setShowReplyInput(!showReplyInput)}>
              Trả lời
            </Text>
            {comment.replyCount && comment.replyCount > 0 && (
              <Text fontSize="9pt" color={likeCountColor}>
                {comment.replyCount} {comment.replyCount === 1 ? 'reply' : 'replies'}
              </Text>
            )}
            {userId === comment.creatorId && (
              <>
                <Text fontSize="9pt" _hover={{ color: hoverLinkColor }}>
                  Edit
                </Text>
                <Text
                  fontSize="9pt"
                  _hover={{ color: hoverLinkColor }}
                  onClick={() => onDeleteComment(comment)}
                >
                  Delete
                </Text>
              </>
            )}
          </Stack>
        </Stack>
      </Flex>
      
      {/* Reply Input */}
      {showReplyInput && (
        <ReplyInput
          comment={replyText}
          setComment={setReplyText}
          loading={replyLoading}
          user={user}
          onReply={handleReply}
          onCancel={handleCancelReply}
          parentCommentText={comment.text}
        />
      )}
      
      {/* Nested Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <Stack spacing={2} mt={2}>
          {comment.replies.map((reply) => (
            <CommentItemComponent
              key={reply.id}
              comment={reply}
              onDeleteComment={onDeleteComment}
              onReply={onReply}
              isLoading={isLoading}
              userId={userId}
              user={user}
              level={level + 1}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
};

export default DynamicCommentItem;
