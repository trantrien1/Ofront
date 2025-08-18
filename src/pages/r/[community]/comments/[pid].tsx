import React, { useEffect } from "react";
// Firebase removed
import { useRouter } from "next/router";
// Firebase removed
import { Post } from "../../../../atoms/postsAtom";
import About from "../../../../components/Community/About";
import PageContentLayout from "../../../../components/Layout/PageContent";
import Comments from "../../../../components/Post/Comments";
import PostLoader from "../../../../components/Post/Loader";
import PostItem from "../../../../components/Post/PostItem";
// Firebase removed
import useCommunityData from "../../../../hooks/useCommunityData";
import usePosts from "../../../../hooks/usePosts";

type PostPageProps = {};

const PostPage: React.FC<PostPageProps> = () => {
  const user = null as any;
  const router = useRouter();
  const { community, pid } = router.query;
  const { communityStateValue } = useCommunityData();

  // Need to pass community data here to see if current post [pid] has been voted on
  const {
    postStateValue,
    setPostStateValue,
    onDeletePost,
    loading,
    setLoading,
    onVote,
  } = usePosts(communityStateValue.currentCommunity);

  const fetchPost = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`/api/posts`);
      const posts = await resp.json();
      const found = (posts as any[]).find(p => p.id?.toString?.() === (pid as string));
      if (found) {
        setPostStateValue((prev) => ({
          ...prev,
          selectedPost: {
            id: found.id?.toString?.() || found.id,
            creatorId: found.userId,
            communityId: found.categoryId || community as string,
            title: found.title,
            body: found.content,
            numberOfComments: 0,
            voteStatus: 0,
            userDisplayText: "",
          } as any,
        }));
      }
    } catch (error: any) {
      console.log("fetchPost error", error.message);
    }
    setLoading(false);
  };

  // Fetch post if not in already in state
  useEffect(() => {
    const { pid } = router.query;

    if (pid) {
      // Always fetch post when pid changes, regardless of selectedPost state
      if (postStateValue.selectedPost?.id !== pid) {
        fetchPost();
      }
    }
  }, [router.query.pid, postStateValue.selectedPost?.id, fetchPost]);

  // Handle hash-based comment highlighting
  useEffect(() => {
    // This effect will trigger when the router is ready and the hash changes
    // The highlighting logic is handled in CommentItem component
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
            {postStateValue.selectedPost && (
              <>
                <PostItem
                  post={postStateValue.selectedPost}
                  onVote={onVote}
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
                  community={community as string}
                  selectedPost={postStateValue.selectedPost}
                />
              </>
            )}
          </>
        )}
      </>
      <About
        communityData={
          communityStateValue.currentCommunity
        }
        loading={loading}
      />
    </PageContentLayout>
  );
};
export default PostPage;
