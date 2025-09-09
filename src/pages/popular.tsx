import React, { useEffect, useState } from "react";
import { Stack, Text, Center, Spinner, Icon } from "@chakra-ui/react";

import type { NextPage } from "next";
import { FaFire } from "react-icons/fa";
import { Post } from "../atoms/postsAtom";

import PageContentLayout from "../components/Layout/PageContent";
import PostLoader from "../components/Post/Loader";
import PostItem from "../components/Post/PostItem";

import usePosts from "../hooks/usePosts";

const Popular: NextPage = () => {
  const [popularPosts, setPopularPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const { onVote, onDeletePost, onSelectPost, onUpdateLikeLevel } = usePosts();

  const getPopularPosts = async () => {
    setLoading(true);
    try {
      const { PostsService } = await import("../services/index");
      const posts = await PostsService.getPosts();
      setPopularPosts(posts as Post[]);
    } catch (error) {
      console.error("Error fetching popular posts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getPopularPosts();
  }, []);

  return (
    <PageContentLayout>
      <>
        {/* Header */}
        <Stack
          direction="row"
          align="center"
          bg="white"
          p={4}
          borderRadius={4}
          border="1px solid"
          borderColor="gray.300"
          mb={4}
        >
          <Icon as={FaFire} fontSize={24} color="orange.400" />
          <Text fontSize="xl" fontWeight="bold">
            Popular Posts
          </Text>
        </Stack>


        
        {loading ? (
          <PostLoader />
        ) : (
          <Stack>
            {popularPosts.map((post: Post, index) => (
              <PostItem
                key={post.id}
                post={post}
                postIdx={index}
                onVote={onVote}
                onUpdateLikeLevel={onUpdateLikeLevel}
                onDeletePost={onDeletePost}
                userVoteValue={undefined}
                userIsCreator={false}
                onSelectPost={onSelectPost}
                homePage
              />
            ))}
          </Stack>
        )}
      </>
  <Stack spacing={5} position="sticky" top="44px" zIndex={1000}>
        {/* Right sidebar content can be added here */}
      </Stack>
    </PageContentLayout>
  );
};

export default Popular;
