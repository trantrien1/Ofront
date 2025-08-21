import React, { useEffect, useState } from "react";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import { authModalState } from "../atoms/authModalAtom";
import { Community, communityState } from "../atoms/communitiesAtom";
import { Post, postState, PostVote } from "../atoms/postsAtom";
import { useRouter } from "next/router";
import { userState } from "../atoms/userAtom";
import { likePost } from "../services/posts.service";

const usePosts = (communityData?: Community) => {
  const user = useRecoilValue(userState) as any;
  const loadingUser = false;
  const [postStateValue, setPostStateValue] = useRecoilState(postState);
  const setAuthModalState = useSetRecoilState(authModalState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const communityStateValue = useRecoilValue(communityState);

  const onSelectPost = (post: Post, postIdx: number) => {
    console.log("=== usePosts onSelectPost called ===");
    console.log("Setting selectedPost:", { 
      postId: post?.id, 
      postTitle: post?.title?.slice(0, 50),
      postIdx 
    });
    
    setPostStateValue((prev) => ({
      ...prev,
      selectedPost: { ...post, postIdx },
    }));

    // Navigate directly to post comments without community - posts are from users now
    const targetUrl = `/comments/${post.id}`;
    console.log("✅ Navigating to:", targetUrl);
    
    // Use router.push with callback to log navigation result
    router.push(targetUrl).then(() => {
      console.log("✅ Navigation completed successfully");
    }).catch((err) => {
      console.error("❌ Navigation failed:", err);
    });
    
    console.log("Navigation command sent");
    console.log("====================================");
  };

  const onVote = async (
    event: React.MouseEvent<HTMLButtonElement | SVGElement, MouseEvent>,
    post: Post,
    vote: number,
    communityId?: string
  ) => {
    event.stopPropagation();
    if (!user?.uid) {
      setAuthModalState({ open: true, view: "login" });
      return;
    }

    const currentCommunityId = communityId || post.communityId || communityStateValue.currentCommunity?.id;

    // Determine existing vote (from mapped post data or recoil cache)
    const existingVote = post.currentUserVoteStatus
      ? {
          id: post.currentUserVoteStatus.id,
          postId: post.id,
          communityId: currentCommunityId,
          voteValue: post.currentUserVoteStatus.voteValue,
        }
      : postStateValue.postVotes.find((v) => v.postId === post.id);

    try {
      // Prepare copies for optimistic update
      const updatedPost: any = { ...post };
      const updatedPosts = [...postStateValue.posts];
      let updatedPostVotes: PostVote[] = [...postStateValue.postVotes];

      const existing: any = existingVote as any;

      if (!existing) {
        const newVote: PostVote = {
          id: `${user?.uid || "anon"}_${post.id}`,
          postId: post.id,
          communityId: currentCommunityId || "",
          voteValue: vote,
        };

        updatedPost.currentUserVoteStatus = { id: newVote.id, voteValue: vote } as any;
        updatedPost.voteStatus = (post.voteStatus || 0) + vote;
        updatedPostVotes = [...updatedPostVotes, newVote];
      } else if (existing.voteValue === vote) {
        // removing existing vote
        updatedPost.voteStatus = (post.voteStatus || 0) - vote;
        updatedPost.currentUserVoteStatus = undefined;
        updatedPostVotes = updatedPostVotes.filter((v) => v.postId !== post.id);
      } else {
        // flipping vote
        updatedPost.voteStatus = (post.voteStatus || 0) + 2 * vote;
        const voteIdx = updatedPostVotes.findIndex((v) => v.postId === post.id);
        if (voteIdx !== -1) {
          updatedPostVotes[voteIdx] = { ...updatedPostVotes[voteIdx], voteValue: vote };
        }
        updatedPost.currentUserVoteStatus = { id: existing.id, voteValue: vote } as any;
      }

      const idx = postStateValue.posts.findIndex((p) => p.id === post.id);
      if (idx !== -1) updatedPosts[idx] = updatedPost;

      const updatedState = {
        ...postStateValue,
        posts: updatedPosts,
        postVotes: updatedPostVotes,
        postsCache: {
          ...postStateValue.postsCache,
          [currentCommunityId || ""]: updatedPosts,
        },
      } as typeof postStateValue;

      if (updatedState.selectedPost && updatedState.selectedPost.id === post.id) {
        updatedState.selectedPost = updatedPost;
      }

      setPostStateValue(updatedState);

      try {
        // backend likePost expects { postId, commentId } shape; commentId may be undefined for post likes
        await likePost({ postId: post.id, commentId: undefined });
      } catch (e) {
        console.error("Failed to persist like to backend", e);
      }
    } catch (error) {
      console.error("onVote error", error);
    }
  };

  const onDeletePost = async (post: Post): Promise<boolean> => {
    try {
      setPostStateValue((prev) => ({
        ...prev,
        posts: prev.posts.filter((item) => item.id !== post.id),
        postsCache: {
          ...prev.postsCache,
          [post.communityId]: prev.postsCache[post.communityId]?.filter((item) => item.id !== post.id),
        },
      }));

      return true;
    } catch (error) {
      console.error("onDeletePost error", error);
      return false;
    }
  };

  const getCommunityPostVotes = async (communityId: string) => {
    // placeholder: backend integration can be added later to fetch post votes for the community
    const postVotes: any[] = [];
    setPostStateValue((prev) => ({
      ...prev,
      postVotes: postVotes as PostVote[],
    }));
  };

  useEffect(() => {
    if (!user?.uid || !communityStateValue.currentCommunity) return;
    getCommunityPostVotes(communityStateValue.currentCommunity.id);
  }, [user, communityStateValue.currentCommunity]);

  useEffect(() => {
    if (!user?.uid && !loadingUser) {
      setPostStateValue((prev) => ({
        ...prev,
        postVotes: [],
      }));
      return;
    }
  }, [user, loadingUser]);

  return {
    postStateValue,
    setPostStateValue,
    onSelectPost,
    onDeletePost,
    loading,
    setLoading,
    onVote,
    error,
  };
};

export default usePosts;
