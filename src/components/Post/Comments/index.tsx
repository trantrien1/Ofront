import React, { useEffect, useMemo, useRef, useState } from "react";
import { Box, Button, Flex, Icon, Stack, Text, SkeletonCircle, SkeletonText, useToast, useColorModeValue } from "@chakra-ui/react";
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

const CommentsSkeleton = () => {
  const bg = useColorModeValue("white", "gray.800");
  const color = useColorModeValue("gray.800", "gray.100");
  return (
    <Box bg={bg} borderRadius="0px 0px 4px 4px" p={2} color={color}>
      <Text fontSize="10pt" fontWeight={700}>
        Loading comments...
      </Text>
    </Box>
  );
};

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
  // Start as not-loading so first effect can trigger
  const [commentFetchLoading, setCommentFetchLoading] = useState(false);
  // Prevent duplicate fetches (Strict Mode / re-renders)
  const hasFetchedRef = useRef<string | null>(null);
  const [commentCreateLoading, setCommentCreateLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState("");
  const setAuthModalState = useSetRecoilState(authModalState);
  const setPostState = useSetRecoilState(postState);
  const { createNotification } = useNotifications();
  const toast = useToast();

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
        // Replace optimistic ID if backend returns a real one
        const realId = result?.id?.toString?.() || result?.data?.id?.toString?.();
        if (realId) {
          setComments((prev) => prev.map(c => c.id === newId ? { ...c, id: realId } : c));
        }
        toast({ status: 'success', title: 'Comment posted' });
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
        toast({ status: 'error', title: 'Failed to post comment' });
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

    const insertReply = (nodes: Comment[], parentId: string, reply: Comment): Comment[] =>
      nodes.map((n) => {
        if (n.id === parentId) {
          const replies = [...(n.replies || []), reply];
          return { ...n, replies, replyCount: (n.replyCount || 0) + 1 };
        }
        if (n.replies && n.replies.length) {
          return { ...n, replies: insertReply(n.replies, parentId, reply) };
        }
        return n;
      });

    const removeReply = (nodes: Comment[], parentId: string, replyId: string): Comment[] =>
      nodes.map((n) => {
        if (n.id === parentId) {
          const filtered = (n.replies || []).filter((r) => r.id !== replyId);
          return { ...n, replies: filtered, replyCount: Math.max(0, (n.replyCount || 0) - 1) };
        }
        if (n.replies && n.replies.length) {
          return { ...n, replies: removeReply(n.replies, parentId, replyId) };
        }
        return n;
      });

    const replaceReplyId = (nodes: Comment[], tempId: string, realId: string): Comment[] =>
      nodes.map((n) => {
        if (n.replies && n.replies.length) {
          const replaced = n.replies.map((r) => (r.id === tempId ? { ...r, id: realId } : r));
          return { ...n, replies: replaceReplyId(replaced, tempId, realId) } as Comment;
        }
        return n;
      });

    try {
      const newId = `${Date.now()}`;

      const newReply: Comment = {
        id: newId,
        creatorId: user.uid,
        creatorDisplayText: user.email?.split("@")[0] || user.displayName || user.uid || "user",
        creatorPhotoURL: user.photoURL,
        communityId: community,
        postId: selectedPost?.id!,
        postTitle: selectedPost?.title!,
        text: replyText,
        createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
        parentId: parentComment.id,
        replyCount: 0,
      };

      // Insert reply under the correct parent at any depth
      setComments((prev) => insertReply(prev, parentComment.id!, newReply));

      // Update post number of comments optimistically
      setPostState((prev) => ({
        ...prev,
        selectedPost: {
          ...prev.selectedPost,
          numberOfComments: prev.selectedPost?.numberOfComments! + 1,
        } as Post,
        postUpdateRequired: true,
      }));

      // Persist reply to backend
      try {
        const { CommentsService } = await import("../../../services/index");
        const result = await CommentsService.replyToComment({ content: replyText, postId: selectedPost?.id!, parentId: parentComment.id });
        const realId = result?.id?.toString?.() || result?.data?.id?.toString?.();
        if (realId) {
          setComments((prev) => replaceReplyId(prev, newId, realId));
        }
        toast({ status: 'success', title: 'Reply posted' });
      } catch (e) {
        // Rollback optimistic UI if backend fails
        setComments((prev) => removeReply(prev, parentComment.id!, newId));
        setPostState((prev) => ({
          ...prev,
          selectedPost: {
            ...prev.selectedPost,
            numberOfComments: Math.max(0, prev.selectedPost?.numberOfComments! - 1),
          } as Post,
        }));
        toast({ status: 'error', title: 'Failed to post reply' });
      }

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

      // Mapper that supports both flat responses and nested commentsChildren
      const mapNode = (node: any): Comment => ({
        id: node.id?.toString?.() || node.id,
        creatorId: node.userId || node.user?.id || node.user?.userId || "",
        creatorDisplayText: node.user?.username || node.creatorDisplayText || (user?.email?.split("@")[0] || "user"),
        creatorPhotoURL: node.creatorPhotoURL || user?.photoURL,
        communityId: community,
        postId: node.postId?.toString?.() || selectedPost?.id || "",
        postTitle: selectedPost?.title || "",
        text: node.content,
        createdAt: node.createdAt ? { seconds: Math.floor(new Date(node.createdAt).getTime() / 1000) } as any : { seconds: Date.now() / 1000 } as any,
        parentId: node.parentId ? (node.parentId.toString?.() || node.parentId) : null,
        replies: Array.isArray(node.commentsChildren) ? node.commentsChildren.map(mapNode) : [],
        replyCount: Array.isArray(node.commentsChildren) ? node.commentsChildren.length : (node.replyCount || 0),
        likeCount: typeof node.likeCount === 'number' ? node.likeCount : (Array.isArray(node.likes) ? node.likes.length : (typeof node.likesCount === 'number' ? node.likesCount : 0)),
        likedByMe: !!(node.likedByMe || node.liked || (Array.isArray(node.likes) && user?.uid && node.likes.includes(user.uid))),
      });

      let topLevel: Comment[] = [];
      if (Array.isArray(apiComments)) {
        const hasNestedChildren = apiComments.some((n: any) => Array.isArray(n?.commentsChildren));
        if (hasNestedChildren) {
          // API already returns nested structure; keep only top-level nodes
          topLevel = apiComments
            .filter((n: any) => n?.parentId == null)
            .map(mapNode);
        } else {
          // Flat list with parentId: build tree
          const allComments: Comment[] = apiComments.map((c: any) => mapNode(c));
          const commentMap = new Map<string, Comment>();
          const roots: Comment[] = [];
          allComments.forEach((c) => { commentMap.set(c.id!, { ...c, replies: [] }); });
          allComments.forEach((c) => {
            const pid = c.parentId ? c.parentId.toString() : "";
            if (pid) {
              const parent = commentMap.get(pid);
              if (parent) parent.replies!.push(commentMap.get(c.id!)!);
              else roots.push(commentMap.get(c.id!)!); // fallback if missing parent
            } else {
              roots.push(commentMap.get(c.id!)!);
            }
          });
          topLevel = roots;
        }
      }

      // Merge local like state to preserve likedByMe/likeCount if backend omits them
      const mergeLocalLikes = (list: Comment[]): Comment[] => {
        let store: any = {};
        try { if (typeof window !== 'undefined') { const raw = localStorage.getItem('commentLikes'); if (raw) store = JSON.parse(raw); } } catch {}
        const apply = (c: Comment): Comment => {
          const saved = c.id ? store[c.id] : undefined;
          let likedByMe = c.likedByMe;
          let likeCount = typeof c.likeCount === 'number' ? c.likeCount : 0;
          if (saved && saved.liked) {
            likedByMe = true;
            // If backend didn't include our like yet, bump count visually
            if (!c.likedByMe && (typeof c.likeCount !== 'number' || c.likeCount === 0)) {
              likeCount = (likeCount || 0) + 1;
            }
          }
          const replies = Array.isArray(c.replies) ? c.replies.map(apply) : [];
          return { ...c, likedByMe: !!likedByMe, likeCount, replies };
        };
        return list.map(apply);
      };

      const merged = mergeLocalLikes(topLevel);

      console.log("Final organized comments:", merged);
      console.log("=========================");
      setComments(merged);
      
    } catch (error: any) {
      console.error("getPostComments error", error?.message || error);
    }
    setCommentFetchLoading(false);
  };
  // Fetch once per post id change
  useEffect(() => {
    if (!selectedPost?.id) return;
    if (hasFetchedRef.current === selectedPost.id) return;
    hasFetchedRef.current = selectedPost.id;
    setCommentFetchLoading(true);
    getPostComments();
  }, [selectedPost?.id]);

  // Don't render if no selectedPost
  if (!selectedPost?.id) {
    return null;
  }

  return (
    <Box bg={useColorModeValue("white", "gray.800")} p={2} borderRadius="0px 0px 4px 4px">
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
              <Box key={item} padding="6" bg={useColorModeValue("white", "gray.800")}>
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
                borderColor={useColorModeValue("gray.100", "gray.700")}
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
