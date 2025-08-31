import React, { useEffect } from "react";
import { useRouter } from "next/router";
import About from "../../../../components/Community/About";
import PageContentLayout from "../../../../components/Layout/PageContent";
import Comments from "../../../../components/Post/Comments";
import PostLoader from "../../../../components/Post/Loader";
import PostItem from "../../../../components/Post/PostItem";
import useCommunityData from "../../../../hooks/useCommunityData";
import usePosts from "../../../../hooks/usePosts";

type PostPageProps = {};

const PostPage: React.FC<PostPageProps> = () => {
	const user = null as any;
	const router = useRouter();
	const { community, pid } = router.query;
	const { communityStateValue } = useCommunityData();

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
			const { PostsService } = await import("../../../../services");
			const posts = await PostsService.getPosts();
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
			console.error("fetchPost error", error?.message || error);
		}
		setLoading(false);
	};

	useEffect(() => {
		const { pid } = router.query;
		if (pid) {
			if (postStateValue.selectedPost?.id !== pid) {
				fetchPost();
			}
		}
	}, [router.query.pid, postStateValue.selectedPost?.id, fetchPost]);

	useEffect(() => {
		if (router.isReady && typeof window !== 'undefined') {
			const hash = window.location.hash;
			if (hash.startsWith('#comment-')) {
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
