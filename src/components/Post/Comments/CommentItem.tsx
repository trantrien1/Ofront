import React, { useCallback, useState, useEffect, useRef } from "react";
import {
  Avatar,
  Box,
  Flex,
  Icon,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import { Timestamp } from "firebase/firestore";
import { FaReddit } from "react-icons/fa";
import {
  IoArrowDownCircleOutline,
  IoArrowUpCircleOutline,
} from "react-icons/io5";
import { normalizeTimestamp, formatTimeAgo } from "../../../helpers/timestampHelpers";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";

// Disable SSR for this component to prevent hydration issues
const DynamicCommentItem = dynamic(() => Promise.resolve(CommentItemComponent), {
  ssr: false,
  loading: () => <CommentItemSkeleton />
});

const CommentItemSkeleton = () => (
  <Flex>
    <Box mr={2}>
      <Icon as={FaReddit} fontSize={30} color="gray.300" />
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
};

type CommentItemProps = {
  comment: Comment;
  onDeleteComment: (comment: Comment) => void;
  isLoading: boolean;
  userId?: string;
};

const CommentItemComponent: React.FC<CommentItemProps> = ({
  comment,
  onDeleteComment,
  isLoading,
  userId,
}) => {
  const router = useRouter();
  const commentRef = useRef<HTMLDivElement>(null);
  const [isHighlighted, setIsHighlighted] = useState(false);

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

  // const [loading, setLoading] = useState(false);

  // const handleDelete = useCallback(async () => {
  //   setLoading(true);
  //   try {
  //     const success = await onDeleteComment(comment);

  //     if (!success) {
  //       throw new Error("Error deleting comment");
  //     }
  //   } catch (error: any) {
  //     console.log(error.message);
  //     // setError
  //     setLoading(false);
  //   }
  // }, [setLoading]);

  return (
    <Flex
      ref={commentRef}
      id={`comment-${comment.id}`}
      bg={isHighlighted ? "gray.100" : "transparent"}
      p={isHighlighted ? 2 : 0}
      borderRadius={isHighlighted ? "md" : "none"}
      transition="all 0.2s ease"
      //border={isHighlighted ? "2px solid" : "none"}
      borderColor={isHighlighted ? "gray.400" : "transparent"}
    >
      <Box mr={2}>
        <Icon as={FaReddit} fontSize={30} color="gray.300" />
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
          <Icon as={IoArrowUpCircleOutline} />
          <Icon as={IoArrowDownCircleOutline} />
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
  );
};

export default DynamicCommentItem;
