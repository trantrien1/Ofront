import React, { useEffect, useState } from "react";
import { Stack } from "@chakra-ui/react";

import { useRecoilState, useSetRecoilState } from "recoil";
import { authModalState } from "../../atoms/authModalAtom";
import { Community } from "../../atoms/communitiesAtom";

import PostLoader from "./Loader";
import { Post, postState, PostVote } from "../../atoms/postsAtom";
import PostItem from "./PostItem";
import { useRouter } from "next/router";
import usePosts from "../../hooks/usePosts";
import { PostsService } from "../../services";
import { useCommunityPermissions } from "../../hooks/useCommunityPermissions";

type PostsProps = {
  communityData?: Community;
  userId?: string;
  loadingUser: boolean;
};

const Posts: React.FC<PostsProps> = ({
  communityData,
  userId,
  loadingUser,
}) => {
  /**
   * PART OF INITIAL SOLUTION BEFORE CUSTOM HOOK
   */
  const [loading, setLoading] = useState(false);
  // const setAuthModalState = useSetRecoilState(authModalState);
  const router = useRouter();

  const { postStateValue, setPostStateValue, onVote, onDeletePost } = usePosts(
    communityData!
  );

  // Get user permissions for moderation
  const { canModerate } = useCommunityPermissions();

  /**
   * USE ALL BELOW INITIALLY THEN CONVERT TO A CUSTOM HOOK AFTER
   * CREATING THE [PID] PAGE TO EXTRACT REPEATED LOGIC
   */
  // const onVote = async (
  //   event: React.MouseEvent<SVGElement, MouseEvent>,
  //   post: Post,
  //   vote: number
  // ) => {
  //   event.stopPropagation();
  //   if (!userId) {
  //     setAuthModalState({ open: true, view: "login" });
  //     return;
  //   }

  //   const { voteStatus } = post;

  //   // is this an upvote or a downvote?
  //   // has this user voted on this post already? was it up or down?
  //   const existingVote = postItems.postVotes.find(
  //     (item: PostVote) => item.postId === post.id
  //   );

  //   try {
  //     let voteChange = vote;
  //     const batch = writeBatch(firestore);

  //     // New vote
  //     if (!existingVote) {
  //       const newVote: PostVote = {
  //         postId: post.id,
  //         communityId: communityData.id!,
  //         voteValue: vote,
  //       };

  //       const postVoteRef = doc(
  //         collection(firestore, "users", `${userId}/postVotes`)
  //       );

  //       // Needed for frontend state since we're not getting resource back
  //       newVote.id = postVoteRef.id;
  //       batch.set(postVoteRef, {
  //         postId: post.id,
  //         communityId: communityData.id!,
  //         voteValue: vote,
  //       });

  //       // Optimistically update state
  //       setPostItems((prev) => ({
  //         ...prev,
  //         postVotes: [...prev.postVotes, newVote],
  //       }));
  //     }
  //     // Removing existing vote
  //     else {
  //       // Used for both possible cases of batch writes
  //       const postVoteRef = doc(
  //         firestore,
  //         "users",
  //         `${userId}/postVotes/${existingVote.id}`
  //       );

  //       // Removing vote
  //       if (existingVote.voteValue === vote) {
  //         voteChange *= -1;

  //         setPostItems((prev) => ({
  //           ...prev,
  //           postVotes: prev.postVotes.filter((item) => item.postId !== post.id),
  //         }));
  //         batch.delete(postVoteRef);
  //       }
  //       // Changing vote
  //       else {
  //         voteChange = 2 * vote;

  //         batch.update(postVoteRef, {
  //           voteValue: vote,
  //         });
  //         // Optimistically update state
  //         const existingPostIdx = postItems.postVotes.findIndex(
  //           (item) => item.postId === post.id
  //         );
  //         const updatedVotes = [...postItems.postVotes];
  //         updatedVotes[existingPostIdx] = { ...existingVote, voteValue: vote };
  //         setPostItems((prev) => ({
  //           ...prev,
  //           postVotes: updatedVotes,
  //         }));
  //       }
  //     }

  //     const postRef = doc(firestore, "posts", post.id);
  //     batch.update(postRef, { voteStatus: voteStatus + voteChange });

  //     /**
  //      * Perform writes
  //      * Could move state updates to after this
  //      * but decided to optimistically update
  //      */
  //     await batch.commit();
  //   } catch (error) {
  //     console.log("onVote error", error);
  //   }
  // };

  // const getUserPostVotes = async () => {
  //   try {
  //     const postVotesQuery = query(
  //       collection(firestore, `users/${userId}/postVotes`),
  //       where("communityId", "==", communityData.id)
  //     );

  //     const postVoteDocs = await getDocs(postVotesQuery);
  //     const postVotes = postVoteDocs.docs.map((doc) => ({
  //       id: doc.id,
  //       ...doc.data(),
  //     }));
  //     setPostItems((prev) => ({
  //       ...prev,
  //       postVotes: postVotes as PostVote[],
  //     }));
  //   } catch (error) {
  //     console.log("getUserPostVotes error", error);
  //   }
  // };

  const onSelectPost = (post: Post, postIdx: number) => {
    setPostStateValue((prev) => ({
      ...prev,
      selectedPost: { ...post, postIdx },
    }));
  router.push(`/community/${communityData?.id!}/comments/${post.id}`);
  };

  // Clear posts when community changes
  useEffect(() => {
    if (communityData?.id) {
      setPostStateValue((prev) => ({
        ...prev,
        posts: [],
      }));
    }
  }, [communityData?.id]);

  useEffect(() => {
    // If we have a community id, try to use cache else fetch
    if (communityData?.id) {
      if (
        postStateValue.postsCache[communityData?.id!] &&
        !postStateValue.postUpdateRequired
      ) {
        setPostStateValue((prev) => ({
          ...prev,
          posts: postStateValue.postsCache[communityData?.id!],
        }));
        return;
      }

      getPosts();
      return;
    }

    // No communityData: fetch global posts if needed
    if (!postStateValue.postUpdateRequired && postStateValue.posts.length > 0) {
      return;
    }
    getPosts();
    /**
     * REAL-TIME POST LISTENER
     * IMPLEMENT AT FIRST THEN CHANGE TO POSTS CACHE
     *
     * UPDATE - MIGHT KEEP THIS AS CACHE IS TOO COMPLICATED
     *
     * LATEST UPDATE - FOUND SOLUTION THAT MEETS IN THE MIDDLE
     * CACHE POST DATA, BUT REMOVE POSTVOTES CACHE AND HAVE
     * REAL-TIME LISTENER ON POSTVOTES
     */
    // const postsQuery = query(
    //   collection(firestore, "posts"),
    //   where("communityId", "==", communityData.id),
    //   orderBy("createdAt", "desc")
    // );
    // const unsubscribe = onSnapshot(postsQuery, (querySnaption) => {
    //   const posts = querySnaption.docs.map((post) => ({
    //     id: post.id,
    //     ...post.data(),
    //   }));
    //   setPostItems((prev) => ({
    //     ...prev,
    //     posts: posts as [],
    //   }));
    //   setLoading(false);
    // });

    // // Remove real-time listener on component dismount
    // return () => unsubscribe();
  }, [communityData, postStateValue.postUpdateRequired]);

  const getPosts = async () => {
    setLoading(true);
    try {
      // Fetch posts: if viewing a community, get only that community's posts; else fetch global feed
      let response: any[] = [];
      if (communityData?.id) {
        try {
          const svc: any = PostsService as any;
          if (typeof svc.getPostsByGroup === 'function') {
            response = await svc.getPostsByGroup({ groupId: communityData.id, sort: "like" });
          } else {
            // Fallback to legacy endpoint by communityId (scoped)
            const legacy = await fetch(`/api/group/posts?communityId=${encodeURIComponent(String(communityData.id))}`);
            try { response = await legacy.json(); } catch { response = []; }
          }
        } catch (e) {
          // On error, try legacy scoped endpoint before giving up
          try {
            const legacy = await fetch(`/api/group/posts?communityId=${encodeURIComponent(String(communityData.id))}`);
            try { response = await legacy.json(); } catch { response = []; }
          } catch {
            response = [];
          }
        }
      } else {
        response = await PostsService.getPosts({});
      }
      const posts: Post[] = (response as Post[]) || [];
      setPostStateValue((prev) => ({
        ...prev,
        posts,
        postsCache: {
          ...prev.postsCache,
          [communityData?.id!]: posts,
        },
        postUpdateRequired: false,
      }));
    } catch (error: any) {
      console.error("getPosts error", error?.message || error);
    }
    setLoading(false);
  };



  return (
    <>
      {loading ? (
        <PostLoader />
      ) : (
        <Stack>
          {(postStateValue.posts || []).filter((p) => {
            // Show all if user can moderate; otherwise only approved or no-status posts
            if (canModerate(communityData?.id || "")) return true;
            // Only posts of this community when in a community page
            if (communityData?.id) {
              const cid = String(communityData.id);
              const pid = String(p.communityId || (p as any).communityDisplayText || (p as any).groupId || "");
              if (cid && pid && cid !== pid) return false;
            }
            if (typeof p.status === 'number') return p.status === 1;
            if (typeof p.approved === 'boolean') return p.approved === true;
            return true;
          }).map((post: Post, index) => (
            <PostItem
              key={post.id}
              post={post}
              // postIdx={index}
              onVote={onVote}
              onDeletePost={onDeletePost}
              userVoteValue={
                postStateValue.postVotes.find((item) => item.postId === post.id)
                  ?.voteValue
              }
              userIsCreator={userId === post.creatorId}
              onSelectPost={onSelectPost}
              canModerate={canModerate(communityData?.id || "")}
            />
          ))}
        </Stack>
      )}
    </>
  );
};
export default Posts;
