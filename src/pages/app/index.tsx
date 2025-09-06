import React, { useEffect, useRef } from "react";
import type { NextPage } from "next";
import { Stack } from "@chakra-ui/react";
import { useRouter } from "next/router";
import { useRecoilValue } from "recoil";
import { communityState } from "../../atoms/communitiesAtom";
import { Post } from "../../atoms/postsAtom";
import PageContentLayout from "../../components/Layout/PageContent";
import PostItem from "../../components/Post/PostItem";
import Recommendations from "../../components/Community/Recommendations";
import usePosts from "../../hooks/usePosts";
import { userState } from "../../atoms/userAtom";
import PostsService from "../../services/posts.service";

const AppHome: NextPage = () => {
  const router = useRouter();
  const user = useRecoilValue(userState) as any;
  const hasFetchedRef = useRef(false);
  const loadingUser = false;
  const { postStateValue, setPostStateValue, onVote, onSelectPost, onDeletePost, loading, setLoading } = usePosts();
  const communityStateValue = useRecoilValue(communityState);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const posts = await PostsService.getPosts({ public: !user });
      setPostStateValue((prev) => ({ ...prev, posts }));
    } catch (e: any) {
      console.error("/app fetch posts error", e?.message || e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch on first mount OR when ?refresh=1 changes
  useEffect(() => {
    const { refresh } = router.query || {};
    // If refresh param present, always refetch
    if (refresh === '1') {
      fetchPosts();
      return; // don't mark hasFetchedRef so normal flow continues if needed
    }
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchPosts();
    }
  }, [user, router.query]);

  // Clean up refresh param after handled to avoid sticky state
  useEffect(() => {
    const { refresh, ...rest } = router.query || {} as any;
    if (refresh === '1') {
      const newQuery = { ...rest };
      router.replace({ pathname: router.pathname, query: newQuery }, undefined, { shallow: true });
    }
  }, [router.query]);

  return (
    <PageContentLayout>
      <Stack>
        {postStateValue.posts.map((post: Post, idx) => (
          <PostItem
            key={post.id}
            post={post}
            postIdx={idx}
            onVote={onVote}
            onDeletePost={onDeletePost}
            userVoteValue={undefined}
            userIsCreator={user?.uid === post.creatorId}
            onSelectPost={onSelectPost}
            homePage
          />
        ))}
      </Stack>
      <Stack gap={5} position="sticky" top="44px">
        <Recommendations />
      </Stack>
    </PageContentLayout>
  );
};

export default AppHome;
