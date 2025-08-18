import React, { useEffect, useState } from "react";
// Firebase removed
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import { authModalState } from "../atoms/authModalAtom";
import { Community, communityState } from "../atoms/communitiesAtom";
import { Post, postState, PostVote } from "../atoms/postsAtom";
// Firebase removed
import { useRouter } from "next/router";

const usePosts = (communityData?: Community) => {
  const user = null as any;
  const loadingUser = false;
  const [postStateValue, setPostStateValue] = useRecoilState(postState);
  const setAuthModalState = useSetRecoilState(authModalState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const communityStateValue = useRecoilValue(communityState);

  const onSelectPost = (post: Post, postIdx: number) => {
    console.log("HERE IS STUFF", post, postIdx);

    setPostStateValue((prev) => ({
      ...prev,
      selectedPost: { ...post, postIdx },
    }));
    router.push(`/r/${post.communityId}/comments/${post.id}`);
  };

  const onVote = async (
    event: React.MouseEvent<HTMLButtonElement | SVGElement, MouseEvent>,
    post: Post,
    vote: number,
    communityId: string
    // postIdx?: number
  ) => {
    event.stopPropagation();
    if (!user?.uid) {
      setAuthModalState({ open: true, view: "login" });
      return;
    }

    const { voteStatus } = post;
    // const existingVote = post.currentUserVoteStatus;
    const existingVote = postStateValue.postVotes.find(
      (vote) => vote.postId === post.id
    );

    // is this an upvote or a downvote?
    // has this user voted on this post already? was it up or down?

    try {
      let voteChange = vote;
      const updatedPost = { ...post };
      const updatedPosts = [...postStateValue.posts];
      let updatedPostVotes = [...postStateValue.postVotes];

      // New vote
      if (!existingVote) {
        const newVote: PostVote = {
          id: `${user?.uid || "anon"}_${post.id}`,
          postId: post.id,
          communityId,
          voteValue: vote,
        };

        updatedPost.voteStatus = voteStatus + vote;
        updatedPostVotes = [...updatedPostVotes, newVote];
      }
      // Removing existing vote
      else {
        // Used for both possible cases of batch writes
        // Removing vote
        if (existingVote.voteValue === vote) {
          voteChange *= -1;
          updatedPost.voteStatus = voteStatus - vote;
          updatedPostVotes = updatedPostVotes.filter(
            (vote) => vote.id !== existingVote.id
          );
        }
        // Changing vote
        else {
          voteChange = 2 * vote;
          updatedPost.voteStatus = voteStatus + 2 * vote;
          const voteIdx = postStateValue.postVotes.findIndex(
            (vote) => vote.id === existingVote.id
          );
          // console.log("HERE IS VOTE INDEX", voteIdx);

          // Vote was found - findIndex returns -1 if not found
          if (voteIdx !== -1) {
            updatedPostVotes[voteIdx] = {
              ...existingVote,
              voteValue: vote,
            };
          }
        }
      }

      let updatedState = { ...postStateValue, postVotes: updatedPostVotes };

      const postIdx = postStateValue.posts.findIndex(
        (item) => item.id === post.id
      );

      // if (postIdx !== undefined) {
      updatedPosts[postIdx!] = updatedPost;
      updatedState = {
        ...updatedState,
        posts: updatedPosts,
        postsCache: {
          ...updatedState.postsCache,
          [communityId]: updatedPosts,
        },
      };
      // }

      /**
       * Optimistically update the UI
       * Used for single page view [pid]
       * since we don't have real-time listener there
       */
      if (updatedState.selectedPost) {
        updatedState = {
          ...updatedState,
          selectedPost: updatedPost,
        };
      }

      // Optimistically update the UI
      setPostStateValue(updatedState);

      // TODO: Replace with API call for votes. For now, UI-only update.
    } catch (error) {
      console.log("onVote error", error);
    }
  };

  const onDeletePost = async (post: Post): Promise<boolean> => {
    console.log("DELETING POST: ", post.id);

    try {
      // if post has an image url, delete it from storage
      // TODO: call DELETE /api/posts?id=... once implemented

      // Update post state
      setPostStateValue((prev) => ({
        ...prev,
        posts: prev.posts.filter((item) => item.id !== post.id),
        postsCache: {
          ...prev.postsCache,
          [post.communityId]: prev.postsCache[post.communityId]?.filter(
            (item) => item.id !== post.id
          ),
        },
      }));

      /**
       * Cloud Function will trigger on post delete
       * to delete all comments with postId === post.id
       */
      return true;
    } catch (error) {
      console.log("THERE WAS AN ERROR", error);
      return false;
    }
  };

  const getCommunityPostVotes = async (communityId: string) => {
    // TODO: fetch post votes from API once implemented
    const postVotes: any[] = [];
    setPostStateValue((prev) => ({
      ...prev,
      postVotes: postVotes as PostVote[],
    }));

    // const unsubscribe = onSnapshot(postVotesQuery, (querySnapshot) => {
    //   const postVotes = querySnapshot.docs.map((postVote) => ({
    //     id: postVote.id,
    //     ...postVote.data(),
    //   }));

    // });

    // return () => unsubscribe();
  };

  useEffect(() => {
    if (!user?.uid || !communityStateValue.currentCommunity) return;
    getCommunityPostVotes(communityStateValue.currentCommunity.id);
  }, [user, communityStateValue.currentCommunity]);

  /**
   * DO THIS INITIALLY FOR POST VOTES
   */
  // useEffect(() => {
  //   if (!user?.uid || !communityData) return;
  //   const postVotesQuery = query(
  //     collection(firestore, `users/${user?.uid}/postVotes`),
  //     where("communityId", "==", communityData?.id)
  //   );
  //   const unsubscribe = onSnapshot(postVotesQuery, (querySnapshot) => {
  //     const postVotes = querySnapshot.docs.map((postVote) => ({
  //       id: postVote.id,
  //       ...postVote.data(),
  //     }));

  //     setPostStateValue((prev) => ({
  //       ...prev,
  //       postVotes: postVotes as PostVote[],
  //     }));
  //   });

  //   return () => unsubscribe();
  // }, [user, communityData]);

  useEffect(() => {
    // Logout or no authenticated user
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
