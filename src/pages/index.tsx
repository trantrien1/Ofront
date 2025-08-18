import { useEffect } from "react";
import { Stack } from "@chakra-ui/react";
// Firebase removed
import type { NextPage } from "next";
import { useRouter } from "next/router";
// import { useAuthState } from "react-firebase-hooks/auth";
import { useRecoilValue } from "recoil";
import { communityState } from "../atoms/communitiesAtom";
import { Post, PostVote } from "../atoms/postsAtom";

import Recommendations from "../components/Community/Recommendations";
import PageContentLayout from "../components/Layout/PageContent";
import PostLoader from "../components/Post/Loader";
import PostItem from "../components/Post/PostItem";
// Firebase removed
import usePosts from "../hooks/usePosts";



const Home: NextPage = () => {
  const user = null as any;
  const loadingUser = false;
  const {
    postStateValue,
    setPostStateValue,
    onVote,
    onSelectPost,
    onDeletePost,
    loading,
    setLoading,
  } = usePosts();
  const communityStateValue = useRecoilValue(communityState);

  const getUserHomePosts = async () => {
    console.log("GETTING USER FEED");
    setLoading(true);
    try {
      /**
       * if snippets has no length (i.e. user not in any communities yet)
       * do query for 20 posts ordered by voteStatus
       */
      const feedPosts: Post[] = [];

      // User has joined communities
      if (communityStateValue.mySnippets.length) {
        console.log("GETTING POSTS IN USER COMMUNITIES");

        // TODO: Replace with user feed API; fallback to general posts for now
        const resp = await fetch(`/api/posts`);
        const posts = resp.ok ? await resp.json() : [];
        if (Array.isArray(posts)) feedPosts.push(...(posts as Post[]));
      }
      // User has not joined any communities yet
      else {
        console.log("USER HAS NO COMMUNITIES - GETTING GENERAL POSTS");

        const resp = await fetch(`/api/posts`);
        const posts = resp.ok ? await resp.json() : [];
        if (Array.isArray(posts)) feedPosts.push(...(posts as Post[]));
      }

      console.log("HERE ARE FEED POSTS", feedPosts);

      setPostStateValue((prev) => ({
        ...prev,
        posts: feedPosts,
      }));

      // if not in any, get 5 communities ordered by number of members
      // for each one, get 2 posts ordered by voteStatus and set these to postState posts
    } catch (error: any) {
      console.log("getUserHomePosts error", error.message);
    }
    setLoading(false);
  };

  const getNoUserHomePosts = async () => {
    console.log("GETTING NO USER FEED");
    setLoading(true);
    try {
      const resp = await fetch(`/api/posts`);
      const posts = resp.ok ? await resp.json() : [];
      console.log("NO USER FEED", posts);

      setPostStateValue((prev) => ({
        ...prev,
        posts: Array.isArray(posts) ? (posts as Post[]) : [],
      }));
    } catch (error: any) {
      console.log("getNoUserHomePosts error", error.message);
    }
    setLoading(false);
  };

  const getUserPostVotes = async () => {
    // TODO: Load votes via API; for now, clear
    setPostStateValue((prev) => ({ ...prev, postVotes: [] }));
    return () => {};
  };

  useEffect(() => {
    /**
     * initSnippetsFetched ensures that user snippets have been retrieved;
     * the value is set to true when snippets are first retrieved inside
     * of getSnippets in useCommunityData
     */
    if (!communityStateValue.initSnippetsFetched) return;

    if (user) {
      getUserHomePosts();
    }
  }, [user, communityStateValue.initSnippetsFetched]);

  useEffect(() => {
    if (!user && !loadingUser) {
      getNoUserHomePosts();
    }
  }, [user, loadingUser]);

  useEffect(() => {
    if (!user?.uid || !postStateValue.posts.length) return;
    getUserPostVotes();

    // Clear postVotes on dismount
    return () => {
      setPostStateValue((prev) => ({
        ...prev,
        postVotes: [],
      }));
    };
  }, [postStateValue.posts, user?.uid]);

  return (
    <PageContentLayout>
      <>

        {loading ? (
          <PostLoader />
        ) : (
          <Stack>
            {postStateValue.posts.map((post: Post, index) => (
              <PostItem
                key={post.id}
                post={post}
                postIdx={index}
                onVote={onVote}
                onDeletePost={onDeletePost}
                userVoteValue={
                  postStateValue.postVotes.find(
                    (item) => item.postId === post.id
                  )?.voteValue
                }
                userIsCreator={user?.uid === post.creatorId}
                onSelectPost={onSelectPost}
                homePage
              />
            ))}
          </Stack>
        )}
      </>
      <Stack spacing={5} position="sticky" top="14px">
        <Recommendations />
      </Stack>
    </PageContentLayout>
  );
};

export default Home;
