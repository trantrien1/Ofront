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
  Tooltip,
  HStack,
} from "@chakra-ui/react";
type Timestamp = any;
import { FaCheckCircle, FaCircle } from "react-icons/fa";
import { keyframes } from '@emotion/react';
import { REACTIONS } from '../../../constants/reactions';
import { Image } from "@chakra-ui/react";
import { normalizeTimestamp, useRelativeTime } from "../../../helpers/timestampHelpers";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import ReplyInput from "./ReplyInput";
import CommentsService from "../../../services/comments.service";
import request from "../../../services/request"; // use shared axios instance for auth headers

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
  anonymous?: boolean; // Whether comment is anonymous
  // Optional client-side hints to match ownership when backend returns varying id fields
  creatorAltIds?: string[];
};

type CommentItemProps = {
  comment: Comment;
  onDeleteComment: (comment: Comment) => void;
  onReply: (parentComment: Comment, replyText: string, anonymous?: boolean) => void;
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

  // Reaction hover state (mimic PostItem)
  const [showReactions, setShowReactions] = useState(false);
  const hoverTimer = useRef<any>(null);
  const hideTimer = useRef<any>(null);
  const clearTimers = () => { if (hoverTimer.current) { clearTimeout(hoverTimer.current); hoverTimer.current = null; } if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null; } };
  const handleMainEnter = () => { clearTimers(); hoverTimer.current = setTimeout(() => setShowReactions(true), 300); };
  const handleMainLeave = () => { clearTimers(); hideTimer.current = setTimeout(() => setShowReactions(false), 150); };
  const handleBarEnter = () => { clearTimers(); setShowReactions(true); };
  const handleBarLeave = () => { clearTimers(); hideTimer.current = setTimeout(() => setShowReactions(false), 150); };

  const chipBg = useColorModeValue("gray.100", "whiteAlpha.100");
  const chipHoverBg = useColorModeValue("gray.200", "whiteAlpha.200");
  const borderCol = useColorModeValue("gray.200", "whiteAlpha.300");
  const iconMuted = useColorModeValue("gray.600", "gray.300");

  const slideIn = keyframes`
    from { transform: translateX(-10px); opacity: 0.9; }
    to { transform: translateX(0); opacity: 1; }
  `;

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
  // Used for reaction bar background (must not call hook conditionally)
  const reactionBarBg = useColorModeValue('white','gray.800');
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

  const handleReply = async (replyText: string, anonymous?: boolean) => {
    setReplyLoading(true);
    try {
      await onReply(comment, replyText, anonymous);
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
  // Use axios request instance so Authorization + cookie headers are attached
  // IMPORTANT: don't force Number() on comment.id; if it's not purely digits, Number() => NaN -> JSON null -> proxy rejects
  await request.put('update-level', { commentId: comment.id, level: Number(level) });
      console.debug('[CommentItem] update-level done');
    } catch (e: any) {
      let fallbackTried = false;
      const status = e?.response?.status;
      if (status === 400 || status === 404) {
        // Fallback to legacy /like endpoint (service supports create/toggle) similar to post path
        try {
          fallbackTried = true;
          console.warn('[CommentItem] update-level failed, trying /like fallback', { commentId: comment.id, level, status });
          await request.put('like', { commentId: comment.id, level: Number(level) });
          console.debug('[CommentItem] /like fallback success');
          inflightRef.current = null;
          setUpdating(false);
          return; // keep optimistic likeLevel
        } catch (e2: any) {
          try { console.warn('[CommentItem] /like fallback also failed', { status: e2?.response?.status, data: e2?.response?.data }); } catch {}
        }
      }
      // rollback if both failed or non-retryable error
      setLikeLevel(prev);
      try {
        const data = e?.response?.data;
        console.warn('[CommentItem] update-level failed', { err: e?.message, status, data, fallbackTried });
      } catch {}
    }
    inflightRef.current = null;
    setUpdating(false);
  };

  const currentReaction = likeLevel ? REACTIONS.find(r => r.lv === likeLevel) : undefined;
  const mainIcon = currentReaction ? currentReaction.icon : REACTIONS[0].icon;
  const mainColor = currentReaction ? currentReaction.color : iconMuted;
  const mainLabel = currentReaction ? currentReaction.label : 'Đánh giá';

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
          <Image src={comment.anonymous ? '/images/avatar-placeholder.png' : comment.creatorPhotoURL || '/images/logo.png'} alt={comment.anonymous ? 'anonymous' : 'avatar'} boxSize="30px" borderRadius="full" />
        </Box>
        <Stack spacing={1} flex={1}>
          <Stack direction="row" align="center" spacing={2} fontSize="8pt">
            <Text
              fontWeight={700}
              _hover={{ textDecoration: "underline", cursor: "pointer" }}
            >
              {comment.anonymous ? 'anonymous' : comment.creatorDisplayText}
            </Text>
            {comment.createdAt ? (
              <Text color={timestampColor}>{commentTimeLabel}</Text>
            ) : (
              <Text color={timestampColor}>sai thoi gian</Text>
            )}
            {isLoading && <Spinner size="sm" />}
          </Stack>
          <Text fontSize="10pt">{comment.text}</Text>
          <Stack direction="row" align="center" fontWeight={600} color={actionsColor} position="relative">
            {/* Reaction chip */}
            <HStack
              spacing={1.5}
              px={2.5}
              py={1}
              rounded="full"
              border="1px solid"
              borderColor={currentReaction ? mainColor : borderCol}
              bg={chipBg}
              cursor="pointer"
              onMouseEnter={handleMainEnter}
              onMouseLeave={handleMainLeave}
              onClick={(e) => {
                e.stopPropagation();
                if (likeLevel === REACTIONS[0].lv) {
                  setLevel(REACTIONS[0].lv); // triggers toggle off logic inside setLevel
                } else {
                  setLevel(REACTIONS[0].lv);
                }
              }}
              transition="all .15s ease"
              _hover={{ bg: chipHoverBg, transform: 'scale(1.03)' }}
            >
              <Icon as={mainIcon as any} color={currentReaction ? mainColor : iconMuted} boxSize={3.5} />
              <Text fontSize="9pt" fontWeight="medium">{mainLabel}</Text>
            </HStack>

            {/* Hover reaction bar */}
      {showReactions && (
              <HStack
                spacing={2}
                position="absolute"
                top="-54px"
                left={0}
        bg={reactionBarBg}
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
                {REACTIONS.map(r => {
                  const active = likeLevel === r.lv;
                  return (
                    <Tooltip key={r.lv} label={r.label} hasArrow>
                      <Box
                        as="button"
                        onClick={(e: any) => {
                          e.stopPropagation();
                          if (likeLevel === r.lv) {
                            // Toggle off via setting same level then inside setLevel it unsets
                            setLevel(r.lv);
                          } else {
                            setLevel(r.lv);
                          }
                          setShowReactions(false);
                        }}
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        w="34px"
                        h="34px"
                        rounded="full"
                        bg={active ? chipHoverBg : chipBg}
                        border="1px solid"
                        borderColor={active ? r.color : borderCol}
                        transition="transform 120ms ease, background 120ms ease"
                        _hover={{ transform: 'scale(1.15)' }}
                      >
                        <Icon as={r.icon as any} color={active ? r.color : iconMuted} boxSize={4} />
                      </Box>
                    </Tooltip>
                  );
                })}
              </HStack>
            )}
            <Text fontSize="9pt" _hover={{ color: hoverLinkColor }} onClick={() => setShowReplyInput(!showReplyInput)}>
              Trả lời
            </Text>
            {comment.replyCount && comment.replyCount > 0 && (
              <Text fontSize="9pt" color={likeCountColor}>
                {comment.replyCount} {comment.replyCount === 1 ? 'reply' : 'replies'}
              </Text>
            )}
            {/* Determine ownership more robustly (backend may return different id fields after reload) */}
            {(() => {
              // Never allow edit/delete for anonymous comments (even if client still knows who posted)
              if (!user || comment.anonymous) return null;
              const u: any = user;
              // Gather candidate ids for current user
              const userIds = [u.uid, u.id, u.userId, u.userUID, u.username, u.email, u.email?.split?.('@')[0]]
                .filter(Boolean)
                .map((v: any) => String(v).toLowerCase());
              // Gather candidate ids for comment's creator
              const commentIds = [comment.creatorId, comment.creatorDisplayText, ...(comment.creatorAltIds || [])]
                .filter(Boolean)
                .map(v => String(v).toLowerCase());
              let owned = false;
              for (const a of userIds) {
                if (commentIds.includes(a)) { owned = true; break; }
              }
              if (!owned) return null;
              return (
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
              );
            })()}
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
