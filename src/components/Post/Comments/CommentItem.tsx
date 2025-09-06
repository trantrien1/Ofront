import React, { useCallback, useState, useEffect, useRef } from "react";
import {
  Avatar,
  Box,
  Flex,
  Icon,
  Spinner,
  Stack,
  Text,
  Button,
  useColorModeValue,
} from "@chakra-ui/react";
type Timestamp = any;
import { FaReddit, FaThumbsUp } from "react-icons/fa";
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
  const [liking, setLiking] = useState(false);
  const [likedByMe, setLikedByMe] = useState<boolean>(!!comment.likedByMe);
  const [likeCount, setLikeCount] = useState<number>(typeof comment.likeCount === 'number' ? comment.likeCount : 0);

  // Theming colors
  const highlightBg = useColorModeValue("gray.100", "whiteAlpha.100");
  const highlightBorder = useColorModeValue("gray.300", "whiteAlpha.300");
  const timestampColor = useColorModeValue("gray.600", "gray.400");
  const actionsColor = useColorModeValue("gray.600", "gray.400");
  const likeNeutralIcon = useColorModeValue("gray.500", "gray.400");
  const likeCountColor = useColorModeValue("gray.500", "gray.400");
  const hoverLinkColor = useColorModeValue("blue.600", "blue.300");
  const likedLabelColor = useColorModeValue("blue.600", "blue.300");
  console.log("đây là giờ comment", comment.createdAt);
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

  const handleToggleLike = async () => {
    if (!comment.id || liking) return;
    // Optimistic update
    const nextLiked = !likedByMe;
    const delta = nextLiked ? 1 : -1;
    setLikedByMe(nextLiked);
    setLikeCount((c) => Math.max(0, (c || 0) + delta));
    // persist locally so reload keeps the state
    try {
      if (typeof window !== 'undefined') {
        const raw = window.localStorage.getItem('commentLikes');
        const obj = raw ? JSON.parse(raw) : {};
        obj[comment.id] = { liked: nextLiked, at: Date.now() };
        window.localStorage.setItem('commentLikes', JSON.stringify(obj));
      }
    } catch {}
    setLiking(true);
    try {
      await CommentsService.likeComment({ commentId: comment.id });
    } catch (e) {
      // rollback on error
      setLikedByMe(likedByMe);
      setLikeCount((c) => Math.max(0, (c || 0) - delta));
      // rollback persisted state
      try {
        if (typeof window !== 'undefined') {
          const raw = window.localStorage.getItem('commentLikes');
          const obj = raw ? JSON.parse(raw) : {};
          obj[comment.id] = { liked: !nextLiked, at: Date.now() };
          window.localStorage.setItem('commentLikes', JSON.stringify(obj));
        }
      } catch {}
    }
    setLiking(false);
  };

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
              <Text color={timestampColor}>
                {useRelativeTime(normalizeTimestamp(comment.createdAt))}
              </Text>
            ) : (
              <Text color={timestampColor}>sai thoi gian</Text>
            )}
            {isLoading && <Spinner size="sm" />}
          </Stack>
          <Text fontSize="10pt">{comment.text}</Text>
          <Stack
            direction="row"
            align="center"
            cursor="pointer"
            fontWeight={600}
            color={actionsColor}
          >
            <Flex align="center" onClick={handleToggleLike} opacity={liking ? 0.6 : 1}>
              <Icon as={FaThumbsUp} color={likedByMe ? 'blue.500' : likeNeutralIcon} mr={1} />
              <Text fontSize="9pt" mr={2} color={likedByMe ? likedLabelColor : 'inherit'}>
                {likedByMe ? 'Liked' : 'Like'}
              </Text>
              <Text fontSize="9pt" color={likeCountColor}>{likeCount || 0}</Text>
            </Flex>
            <Text 
              fontSize="9pt" 
              _hover={{ color: hoverLinkColor }}
              onClick={() => setShowReplyInput(!showReplyInput)}
            >
              Reply
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
