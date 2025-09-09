import React, { useEffect, useState } from "react";
import { Stack, Text, Icon } from "@chakra-ui/react";
import type { NextPage } from "next";
import { BsFillPeopleFill } from "react-icons/bs";
import PageContentLayout from "../components/Layout/PageContent";
import PostLoader from "../components/Post/Loader";
import PostItem from "../components/Post/PostItem";
import { Post } from "../atoms/postsAtom";
import usePosts from "../hooks/usePosts";

const CommunityFeed: NextPage = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const { onVote, onDeletePost, onSelectPost, onUpdateLikeLevel } = usePosts();

  const load = async () => {
    setLoading(true);
    try {
      const { PostsService } = await import("../services/index");
      const data = await PostsService.getPosts({});
      setPosts((data as Post[]) || []);
    } catch (e) {
      console.error("Community feed error", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <PageContentLayout>
      <Stack>
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
          <Icon as={BsFillPeopleFill} fontSize={24} color="blue.500" />
          <Text fontSize="xl" fontWeight="bold">
            Community Feed
          </Text>
        </Stack>
        {loading ? (
          <PostLoader />
        ) : (
          <Stack>
            {posts.map((post: Post, index) => (
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
                // Không truyền homePage khi ở cộng đồng
              />
            ))}
          </Stack>
        )}
      </Stack>
  <Stack spacing={5} position="sticky" top="44px" >
        {/* Right sidebar space */}
      </Stack>
    </PageContentLayout>
  );
};

export default CommunityFeed;
