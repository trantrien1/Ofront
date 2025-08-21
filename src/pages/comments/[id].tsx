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

  console.log("=== Direct Comments Page Loaded ===");
  console.log("Post ID from route:", id);

  // Need to pass community data here to see if current post has been voted on
  const {
    postStateValue,
    setPostStateValue,
    onDeletePost,
    loading,
    setLoading,
    onVote,
  } = usePosts(communityStateValue.currentCommunity);

  const fetchPost = async () => {
    console.log("Fetching post with ID:", id);
    setLoading(true);
    try {
      const { PostsService } = await import("../../services");
      const posts = await PostsService.getPosts();
      const found = (posts as any[]).find(p => p.id?.toString?.() === (id as string));
      if (found) {
        console.log("✅ Post found:", found.title);
        
        // Fetch comment count for this post
        let commentCount = 0;
        try {
          const { CommentsService } = await import("../../services");
          const comments = await CommentsService.getCommentsByPostId(found.id);
          commentCount = comments?.length || 0;
          console.log("✅ Comment count:", commentCount);
        } catch (err) {
          console.error("Failed to fetch comment count:", err);
        }
        
        setPostStateValue((prev) => ({
          ...prev,
          selectedPost: {
            id: found.id?.toString?.() || found.id,
            creatorId: found.userId,
            communityId: found.categoryId || 'user-posts', // Default for user posts
            title: found.title,
            body: found.content,
            numberOfComments: commentCount,
            voteStatus: 0,
            userDisplayText: "",
            createdAt: found.createdAt ? { seconds: Math.floor(new Date(found.createdAt).getTime() / 1000) } : undefined,
            updatedAt: found.updatedAt ? { seconds: Math.floor(new Date(found.updatedAt).getTime() / 1000) } : undefined,
            imageURL: found.imageUrl,
            communityImageURL: "",
            userImageURL: "",
          } as any,
        }));
      } else {
        console.error("❌ Post not found with ID:", id);
      }
    } catch (error: any) {
      console.error("❌ fetchPost error", error?.message || error);
    }
    setLoading(false);
  };

  // Fetch post if not in already in state
  useEffect(() => {
    const postId = id;

    if (postId) {
      console.log("Effect triggered - fetching post for ID:", postId);
      // Always fetch post when id changes, regardless of selectedPost state
      if (postStateValue.selectedPost?.id !== postId) {
        fetchPost();
      }
    }
  }, [router.query.id, postStateValue.selectedPost?.id]);

  // Handle hash-based comment highlighting
  useEffect(() => {
    // This effect will trigger when the router is ready and the hash changes
    if (router.isReady && typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash.startsWith('#comment-')) {
        console.log("Scrolling to comment:", hash);
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
