import React, { useEffect, useState } from "react";
import { Box, Button, Flex, Icon, Stack, Text, SkeletonCircle, SkeletonText } from "@chakra-ui/react";
import { Post, postState } from "../../../atoms/postsAtom";
import { firestore } from "../../../firebase/clientApp";
import { useNotifications } from "../../../hooks/useNotifications";
import CommentItem, { Comment } from "./CommentItem";
import CommentInput from "./Input";
import {
  collection,
  doc,
  getDocs,
  increment,
  orderBy,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { useSetRecoilState, useRecoilValue } from "recoil";
import { authModalState } from "../../../atoms/authModalAtom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../../../firebase/clientApp";
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
      setAuthModalState({ open: true, view: "login" });
      return;
    }

    setCommentCreateLoading(true);
    try {
      const batch = writeBatch(firestore);

      // Create comment document
      const commentDocRef = doc(collection(firestore, "comments"));
      batch.set(commentDocRef, {
        postId: selectedPost?.id,
        creatorId: user.uid,
        creatorDisplayText: user.email!.split("@")[0],
        creatorPhotoURL: user.photoURL,
        communityId: community,
        text: comment,
        postTitle: selectedPost?.title,
        createdAt: serverTimestamp(),
        parentId: null, // Top-level comment
        replyCount: 0,
      });

      // Update post numberOfComments
      batch.update(doc(firestore, "posts", selectedPost?.id!), {
        numberOfComments: increment(1),
      });
      await batch.commit();

      setComment("");
      const { id: postId, title } = selectedPost!;
      setComments((prev) => [
        {
          id: commentDocRef.id,
          creatorId: user.uid,
          creatorDisplayText: user.email!.split("@")[0],
          creatorPhotoURL: user.photoURL,
          communityId: community,
          postId,
          postTitle: title,
          text: comment,
          createdAt: {
            seconds: Date.now() / 1000,
          },
        } as Comment,
        ...prev,
      ]);

      // Fetch posts again to update number of comments
      setPostState((prev) => ({
        ...prev,
        selectedPost: {
          ...prev.selectedPost,
          numberOfComments: prev.selectedPost?.numberOfComments! + 1,
        } as Post,
        postUpdateRequired: true,
      }));

      // Create notification for post creator
      if (selectedPost?.creatorId !== user.uid) {
        createNotification({
          type: "comment",
          message: "commented on your post",
          userId: user.uid,
          targetUserId: selectedPost?.creatorId!,
          postId: selectedPost?.id,
          commentId: commentDocRef.id,
          postTitle: selectedPost?.title,
          communityName: community,
        });
      }

    } catch (error: any) {
      console.log("onCreateComment error", error.message);
    }
    setCommentCreateLoading(false);
  };

  const onReply = async (parentComment: Comment, replyText: string) => {
    if (!user) {
      setAuthModalState({ open: true, view: "login" });
      return;
    }

    try {
      const batch = writeBatch(firestore);

      // Create reply document
      const replyDocRef = doc(collection(firestore, "comments"));
      batch.set(replyDocRef, {
        postId: selectedPost?.id,
        creatorId: user.uid,
        creatorDisplayText: user.email!.split("@")[0],
        creatorPhotoURL: user.photoURL,
        communityId: community,
        text: replyText,
        postTitle: selectedPost?.title,
        createdAt: serverTimestamp(),
        parentId: parentComment.id, // Link to parent comment
        replyCount: 0,
      });

      // Update parent comment's reply count
      if (parentComment.id) {
        batch.update(doc(firestore, "comments", parentComment.id), {
          replyCount: increment(1),
        });
      }

      // Update post numberOfComments
      batch.update(doc(firestore, "posts", selectedPost?.id!), {
        numberOfComments: increment(1),
      });

      await batch.commit();

      // Update local state
      const newReply: Comment = {
        id: replyDocRef.id,
        creatorId: user.uid,
        creatorDisplayText: user.email!.split("@")[0],
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
      if (parentComment.creatorId !== user.uid) {
        createNotification({
          type: "comment",
          message: "replied to your comment",
          userId: user.uid,
          targetUserId: parentComment.creatorId,
          postId: selectedPost?.id,
          commentId: replyDocRef.id,
          postTitle: selectedPost?.title,
          communityName: community,
        });
      }

    } catch (error: any) {
      console.log("onReply error", error.message);
    }
  };

  const onDeleteComment = async (comment: Comment) => {
    setDeleteLoading(comment.id as string);
    try {
      if (!comment.id) throw "Comment has no ID";
      const batch = writeBatch(firestore);
      const commentDocRef = doc(firestore, "comments", comment.id);
      batch.delete(commentDocRef);

      batch.update(doc(firestore, "posts", comment.postId), {
        numberOfComments: increment(-1),
      });

      await batch.commit();

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
      console.log("Error deletig comment", error.message);
      // return false;
    }
    setDeleteLoading("");
  };

  const getPostComments = async () => {
    try {
      console.log("Fetching comments for post:", selectedPost?.id);
      
      // Fetch all comments for this post
      const commentsQuery = query(
        collection(firestore, "comments"),
        where("postId", "==", selectedPost?.id)
      );
      const commentDocs = await getDocs(commentsQuery);
      const allComments = commentDocs.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Comment[];
      
      console.log("All comments for this post:", allComments);
      
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
      
      console.log("Organized comments:", topLevelComments);
      setComments(topLevelComments);
      
    } catch (error: any) {
      console.log("getPostComments error", error.message);
      console.log("Full error:", error);
    }
    setCommentFetchLoading(false);
  };

  useEffect(() => {
    if (selectedPost?.id) {
      console.log("HERE IS SELECTED POST", selectedPost.id);
      getPostComments();
    }
  }, [selectedPost?.id]);

  // Move console.log inside useEffect to avoid hydration issues
  useEffect(() => {
    console.log("Comments component state:", {
      comments: comments,
      commentsLength: comments.length,
      loading: commentFetchLoading,
      selectedPostId: selectedPost?.id
    });
  }, [comments, commentFetchLoading, selectedPost?.id]);

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
