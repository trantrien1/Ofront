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
import { userState } from "../atoms/userAtom";
import PostsService from "../services/posts.service";



const Home: NextPage = () => {
  const router = useRouter();
  const user = useRecoilValue(userState) as any;
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
    setLoading(true);
    try {
      /**
       * if snippets has no length (i.e. user not in any communities yet)
       * do query for 20 posts ordered by voteStatus
       */
      const feedPosts: Post[] = [];

      // User has joined communities
  if (communityStateValue.mySnippets.length) {

        // TODO: Replace with user feed API; fallback to general posts for now
        // No backend: use empty list (or add mock data here)
        const posts: Post[] = [];
        feedPosts.push(...posts);
      }
      // User has not joined any communities yet
  else {

        const posts: Post[] = [];
        feedPosts.push(...posts);
      }

  // feedPosts ready

      setPostStateValue((prev) => ({
        ...prev,
        posts: feedPosts,
      }));

      // if not in any, get 5 communities ordered by number of members
      // for each one, get 2 posts ordered by voteStatus and set these to postState posts
    } catch (error: any) {
      console.error("getUserHomePosts error", error.message);
    }
    setLoading(false);
  };

  const getNoUserHomePosts = async () => {
    setLoading(true);
    try {
      // New logic: when logged out, do not fetch posts
      setPostStateValue((prev) => ({
        ...prev,
        posts: [],
      }));
    } catch (error: any) {
      console.error("getNoUserHomePosts error", error.message);
    }
    setLoading(false);
  };

  const getUserPostVotes = async () => {
    // TODO: Load votes via API; for now, clear
    setPostStateValue((prev) => ({ ...prev, postVotes: [] }));
    return () => {};
  };

  useEffect(() => {
    // Fetch on login or when refresh flag is present
    const run = async () => {
      if (!user) return;
      try {
        const posts = await PostsService.getPosts({});
        setPostStateValue((prev) => ({ ...prev, posts }));
      } catch (e) {
        console.error("home: fetch posts after login failed", (e as any)?.message || e);
      }
    };
    // Read from router.query so client-side navigation with query triggers this effect
    const refreshParam = router.query?.refresh;
    const refreshDelayParam = router.query?.refreshDelay;
    const refreshFlag = refreshParam === '1' || (Array.isArray(refreshParam) && refreshParam.includes('1'));
    const parsedDelay = Array.isArray(refreshDelayParam) ? refreshDelayParam[0] : refreshDelayParam;
    const refreshDelay = parsedDelay ? Math.max(0, Math.min(10000, Number(parsedDelay))) : 0;

    let timer: any;
    if (user) {
      if (refreshFlag) {
        // Immediate refresh
        run();
        try { router.replace('/', undefined, { shallow: true }); } catch {}
      } else if (refreshDelay && Number.isFinite(refreshDelay)) {
        // Delayed refresh
        timer = setTimeout(() => {
          run();
          try { router.replace('/', undefined, { shallow: true }); } catch {}
        }, refreshDelay);
      } else if (!postStateValue.posts.length) {
        // Initial load when no posts yet
        run();
      }
    }
    return () => { if (timer) clearTimeout(timer); };
  }, [user, router.query]);

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
            {Array.isArray(postStateValue.posts) && postStateValue.posts.map((post: Post, index) => (
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
      <Stack gap={5} position="sticky" top="14px">
        <Recommendations />
      </Stack>
    </PageContentLayout>
  );
};

export default Home;
