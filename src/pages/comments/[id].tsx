import React, { useEffect } from "react";
import { useRouter } from "next/router";
import { Post } from "../../atoms/postsAtom";
import PageContentLayout from "../../components/Layout/PageContent";
import Comments from "../../components/Post/Comments";
import PostLoader from "../../components/Post/Loader";
import PostItem from "../../components/Post/PostItem";
import useCommunityData from "../../hooks/useCommunityData";
import usePosts from "../../hooks/usePosts";
import useAuth from "../../hooks/useAuth";

type PostPageProps = {};

const PostPage: React.FC<PostPageProps> = () => {
  const { currentUser } = useAuth();
  const user = currentUser as any; // Type assertion for now
  const router = useRouter();
  const { id } = router.query;
  const { communityStateValue } = useCommunityData();

  // Need to pass community data here to see if current post has been voted on
  const {
    postStateValue,
    setPostStateValue,
    onDeletePost,
    loading,
    setLoading,
    onVote,
    onUpdateLikeLevel,
  } = usePosts(communityStateValue.currentCommunity);

  const fetchPost = async () => {
    setLoading(true);
    try {
      const { PostsService } = await import("../../services");
      const mapped = await PostsService.getPostById({ postId: id as string });
      if (mapped && mapped.id) {
        setPostStateValue((prev) => ({ ...prev, selectedPost: mapped as any }));
      } else {
      }
    } catch (error: any) {
    }
    setLoading(false);
  };

  // Fetch post if not in already in state
  useEffect(() => {
    const postId = id;
    if (postId) {
      fetchPost();
    }
  }, [router.query.id]);

  // Handle hash-based comment highlighting
  useEffect(() => {
    // This effect will trigger when the router is ready and the hash changes
    if (router.isReady && typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash.startsWith('#comment-')) {
        // Small delay to ensure comments are rendered
        setTimeout(() => {
          const element = document.querySelector(hash);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 500);
      }
    }
  }, [router.isReady, router.asPath]);

  return (
    <PageContentLayout>
      <>
        {loading ? (
          <PostLoader />
        ) : (
          <>
            {postStateValue.selectedPost ? (
              <>
                <PostItem
                  post={postStateValue.selectedPost}
                  onVote={onVote}
                  onUpdateLikeLevel={onUpdateLikeLevel}
                  onDeletePost={onDeletePost}
                  userVoteValue={
                    postStateValue.postVotes.find(
                      (item) => item.postId === postStateValue.selectedPost!.id
                    )?.voteValue
                  }
                  userIsCreator={
                    user?.uid === postStateValue.selectedPost.creatorId
                  }
                  router={router}
                />
                <Comments
                  user={user}
                  community="user-posts" // Static community for user posts
                  selectedPost={postStateValue.selectedPost}
                />
              </>
            ) : (
              <div>Post not found</div>
            )}
          </>
        )}
      </>
      <></>
    </PageContentLayout>
  );
};

export default PostPage;
