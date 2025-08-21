import React, { useEffect, useState } from "react";
import { Box, Button, Flex, Icon, Stack, Text, SkeletonCircle, SkeletonText } from "@chakra-ui/react";
import { Post, postState } from "../../../atoms/postsAtom";
import { useNotifications } from "../../../hooks/useNotifications";
import CommentItem, { Comment } from "./CommentItem";
import CommentInput from "./Input";
import { useSetRecoilState, useRecoilValue } from "recoil";
import { authModalState } from "../../../atoms/authModalAtom";
import { IoIosArrowDown, IoIosArrowUp } from "react-icons/io";
import dynamic from "next/dynamic";

// Disable SSR for this component to prevent hydration issues
const Comments = dynamic(() => Promise.resolve(CommentsComponent), {
  ssr: false,
  loading: () => <CommentsSkeleton />
});

const CommentsSkeleton = () => (
  <Box bg="white" borderRadius="0px 0px 4px 4px" p={2}>
    <Text fontSize="10pt" fontWeight={700}>
      Loading comments...
    </Text>
  </Box>
);

type CommentsProps = {
  user: any;
  selectedPost: Post | null;
  community: string;
};

const CommentsComponent: React.FC<CommentsProps> = ({
  user,
  selectedPost,
  community,
}) => {
  console.log("=== Comments Component Render ===");
  console.log("User passed to Comments:", user);
  console.log("Selected post:", selectedPost?.id, selectedPost?.title);
  console.log("Community:", community);
  console.log("===================================");
  
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentFetchLoading, setCommentFetchLoading] = useState(true);
  const [commentCreateLoading, setCommentCreateLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState("");
  const setAuthModalState = useSetRecoilState(authModalState);
  const setPostState = useSetRecoilState(postState);
  const { createNotification } = useNotifications();

  const onCreateComment = async (comment: string) => {
    if (!user) {
      console.log("❌ No user found, opening auth modal");
      setAuthModalState({ open: true, view: "login" });
      return;
    }

    console.log("=== CREATING COMMENT ===");
    console.log("User:", { uid: user.uid, email: user.email });
    console.log("Comment content:", comment);
    console.log("Post ID:", selectedPost?.id);
    console.log("Selected post:", selectedPost);

    if (!selectedPost?.id) {
      console.error("❌ No selected post or post ID");
      return;
    }

    setCommentCreateLoading(true);
    try {
      const newId = `${Date.now()}`;
      setComment("");
      const { id: postId, title } = selectedPost!;
      
      const optimisticComment = {
        id: newId,
        creatorId: user.uid,
        creatorDisplayText: user.email?.split("@")[0] || user.displayName || user.uid || "user",
        creatorPhotoURL: user.photoURL,
        communityId: community,
        postId,
        postTitle: title,
        text: comment,
        createdAt: { seconds: Date.now() / 1000 } as any,
      } as Comment;

      console.log("Adding optimistic comment:", optimisticComment);
      setComments((prev) => [optimisticComment, ...prev]);

      // Fetch posts again to update number of comments
      setPostState((prev) => ({
        ...prev,
        selectedPost: {
          ...prev.selectedPost,
          numberOfComments: prev.selectedPost?.numberOfComments! + 1,
        } as Post,
        postUpdateRequired: true,
      }));

      // Persist comment to backend
      try {
        console.log("Calling backend to create comment...");
        console.log("Payload:", { content: comment, postId });
        const { CommentsService } = await import("../../../services/index");
        const result = await CommentsService.createComment({ content: comment, postId });
        console.log("Backend comment create result:", result);
        console.log("✅ Comment created successfully!");
        console.log("=========================");
      } catch (err: any) {
        console.error("❌ createComment backend error", err?.message || err);
        console.error("Full error:", err);
        // Remove optimistic comment on error
        setComments((prev) => prev.filter(c => c.id !== newId));
        setPostState((prev) => ({
          ...prev,
          selectedPost: {
            ...prev.selectedPost,
            numberOfComments: Math.max(0, prev.selectedPost?.numberOfComments! - 1),
          } as Post,
        }));
      }

    } catch (error: any) {
      console.error("❌ onCreateComment error", error?.message || error);
      console.error("Full error:", error);
    }
    setCommentCreateLoading(false);
  };

  const onReply = async (parentComment: Comment, replyText: string) => {
    if (!user) {
      setAuthModalState({ open: true, view: "login" });
      return;
    }

    try {
      const newId = `${Date.now()}`;

      // Update local state
      const newReply: Comment = {
        id: newId,
        creatorId: user.uid,
        creatorDisplayText: user.email?.split("@")[0] || user.displayName || user.uid || "user",
        creatorPhotoURL: user.photoURL,
        communityId: community,
        postId: selectedPost?.id!,
        postTitle: selectedPost?.title!,
        text: replyText,
        createdAt: {
          seconds: Date.now() / 1000,
          nanoseconds: 0,
        } as any,
        parentId: parentComment.id,
        replyCount: 0,
      };

      // Add reply to parent comment's replies array
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === parentComment.id) {
            return {
              ...c,
              replies: [...(c.replies || []), newReply],
              replyCount: (c.replyCount || 0) + 1,
            };
          }
          return c;
        })
      );

      // Update post state
      setPostState((prev) => ({
        ...prev,
        selectedPost: {
          ...prev.selectedPost,
          numberOfComments: prev.selectedPost?.numberOfComments! + 1,
        } as Post,
        postUpdateRequired: true,
      }));

      // Create notification for parent comment creator
      // no-op notification in frontend-only mode

    } catch (error: any) {
  console.error("onReply error", error?.message || error);
    }
  };

  const onDeleteComment = async (comment: Comment) => {
    setDeleteLoading(comment.id as string);
    try {
      if (!comment.id) throw "Comment has no ID";
      // frontend-only: just remove from state

      setPostState((prev) => ({
        ...prev,
        selectedPost: {
          ...prev.selectedPost,
          numberOfComments: prev.selectedPost?.numberOfComments! - 1,
        } as Post,
        postUpdateRequired: true,
      }));

      setComments((prev) => prev.filter((item) => item.id !== comment.id));
      // return true;
    } catch (error: any) {
  console.error("Error deleting comment", error?.message || error);
      // return false;
    }
    setDeleteLoading("");
  };

  const getPostComments = async () => {
    try {
      console.log("=== FETCHING COMMENTS ===");
      console.log("Fetching comments for post:", selectedPost?.id);

      const { CommentsService } = await import("../../../services/index");
      const apiComments = await CommentsService.getCommentsByPostId(selectedPost?.id);

      console.log("Raw API comments received:", apiComments);

      const allComments: Comment[] = (apiComments || []).map((c: any) => ({
        id: c.id?.toString?.() || c.id,
        creatorId: c.userId,
        creatorDisplayText: c.user?.username || c.creatorDisplayText || (user?.email?.split("@")[0] || "user"),
        creatorPhotoURL: c.creatorPhotoURL || user?.photoURL,
        communityId: community,
        postId: c.postId?.toString?.() || c.postId,
        postTitle: selectedPost?.title || "",
        text: c.content,
        createdAt: c.createdAt ? { seconds: Math.floor(new Date(c.createdAt).getTime() / 1000) } as any : { seconds: Date.now() / 1000 } as any,
        parentId: c.parentId ? (c.parentId.toString?.() || c.parentId) : null,
        replyCount: 0,
      }));
      
      console.log("Mapped comments:", allComments);
      
      // Organize comments into a tree structure
      const commentMap = new Map<string, Comment>();
      const topLevelComments: Comment[] = [];
      
      // First pass: create a map of all comments
      allComments.forEach((comment) => {
        commentMap.set(comment.id!, comment);
        comment.replies = [];
      });
      
      // Second pass: organize into parent-child relationships
      allComments.forEach((comment) => {
        if (comment.parentId) {
          // This is a reply
          const parentComment = commentMap.get(comment.parentId);
          if (parentComment) {
            parentComment.replies = parentComment.replies || [];
            parentComment.replies.push(comment);
          }
        } else {
          // This is a top-level comment
          topLevelComments.push(comment);
        }
      });
      
      console.log("Final organized comments:", topLevelComments);
      console.log("=========================");
      setComments(topLevelComments);
      
    } catch (error: any) {
      console.error("getPostComments error", error?.message || error);
    }
    setCommentFetchLoading(false);
  };  useEffect(() => {
    if (selectedPost?.id) {
      getPostComments();
    }
  }, [selectedPost?.id]);

  // Don't render if no selectedPost
  if (!selectedPost?.id) {
    return null;
  }

  return (
    <Box bg="white" p={2} borderRadius="0px 0px 4px 4px">
      <Flex
        direction="column"
        pl={10}
        pr={4}
        mb={6}
        fontSize="10pt"
        width="100%"
      >
        <CommentInput
          comment={comment}
          setComment={setComment}
          loading={commentCreateLoading}
          user={user}
          onCreateComment={onCreateComment}
        />
      </Flex>
      <Stack spacing={6} p={2}>
        {commentFetchLoading ? (
          <>
            {[0, 1, 2].map((item) => (
              <Box key={item} padding="6" bg="white">
                <SkeletonCircle size="10" />
                <SkeletonText mt="4" noOfLines={2} spacing="4" />
              </Box>
            ))}
          </>
        ) : (
          <>
            {!!comments.length ? (
              <>
                {comments.map((item: Comment) => (
                  <CommentItem
                    key={item.id}
                    comment={item}
                    onDeleteComment={onDeleteComment}
                    onReply={onReply}
                    isLoading={deleteLoading === (item.id as string)}
                    userId={user?.uid}
                    user={user}
                  />
                ))}
              </>
            ) : (
              <Flex
                direction="column"
                justify="center"
                align="center"
                borderTop="1px solid"
                borderColor="gray.100"
                p={20}
              >
                <Text fontWeight={700} opacity={0.3}>
                  No Comments Yet
                </Text>
              </Flex>
            )}
          </>
        )}
      </Stack>
    </Box>
  );
};
export default Comments;
