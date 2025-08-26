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
} from "@chakra-ui/react";
type Timestamp = any;
import { FaReddit, FaThumbsUp } from "react-icons/fa";
import { Image } from "@chakra-ui/react";
import { normalizeTimestamp, formatTimeAgo } from "../../../helpers/timestampHelpers";
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

  return (
    <Box>
      <Flex
        ref={commentRef}
        id={`comment-${comment.id}`}
        bg={isHighlighted ? "gray.100" : "transparent"}
        p={isHighlighted ? 2 : 0}
        borderRadius={isHighlighted ? "md" : "none"}
        transition="all 0.2s ease"
        borderColor={isHighlighted ? "gray.400" : "transparent"}
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
            {comment.createdAt && (
              <Text color="gray.600">
                {formatTimeAgo(normalizeTimestamp(comment.createdAt))}
              </Text>
            )}
            {isLoading && <Spinner size="sm" />}
          </Stack>
          <Text fontSize="10pt">{comment.text}</Text>
          <Stack
            direction="row"
            align="center"
            cursor="pointer"
            fontWeight={600}
            color="gray.500"
          >
            <Icon as={FaThumbsUp} onClick={async()=>{
              try { await CommentsService.likeComment({ commentId: comment.id }); } catch(e) { /* ignore for now */ }
            }} />
            <Text fontSize="9pt">Like</Text>
            <Text 
              fontSize="9pt" 
              _hover={{ color: "blue.500" }}
              onClick={() => setShowReplyInput(!showReplyInput)}
            >
              Reply
            </Text>
            {comment.replyCount && comment.replyCount > 0 && (
              <Text fontSize="9pt" color="gray.400">
                {comment.replyCount} {comment.replyCount === 1 ? 'reply' : 'replies'}
              </Text>
            )}
            {userId === comment.creatorId && (
              <>
                <Text fontSize="9pt" _hover={{ color: "blue.500" }}>
                  Edit
                </Text>
                <Text
                  fontSize="9pt"
                  _hover={{ color: "blue.500" }}
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
