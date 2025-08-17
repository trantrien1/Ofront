import React, { useEffect, useState } from "react";
import { Stack, Text, Center, Spinner, Icon } from "@chakra-ui/react";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
} from "firebase/firestore";
import type { NextPage } from "next";
import { FaFire } from "react-icons/fa";
import { Post } from "../atoms/postsAtom";
import CreatePostLink from "../components/Community/CreatePostLink";
import PageContentLayout from "../components/Layout/PageContent";
import PostLoader from "../components/Post/Loader";
import PostItem from "../components/Post/PostItem";
import { firestore } from "../firebase/clientApp";
import usePosts from "../hooks/usePosts";

const Popular: NextPage = () => {
  const [popularPosts, setPopularPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const { onVote, onDeletePost, onSelectPost } = usePosts();

  const getPopularPosts = async () => {
    setLoading(true);
    try {
      const postsQuery = query(
        collection(firestore, "posts"),
        orderBy("voteStatus", "desc"),
        limit(20)
      );
      const postDocs = await getDocs(postsQuery);
      const posts = postDocs.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Post[];
      
      setPopularPosts(posts);
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

        <CreatePostLink />
        
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
      <Stack spacing={5} position="sticky" top="14px">
        {/* Right sidebar content can be added here */}
      </Stack>
    </PageContentLayout>
  );
};

export default Popular;
