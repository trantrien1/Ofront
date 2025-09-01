import React, { useEffect } from "react";
import { useRouter } from "next/router";
import About from "../../../../components/Community/About";
import PageContentLayout from "../../../../components/Layout/PageContent";
import Comments from "../../../../components/Post/Comments";
import PostLoader from "../../../../components/Post/Loader";
import PostItem from "../../../../components/Post/PostItem";
import useCommunityData from "../../../../hooks/useCommunityData";
import usePosts from "../../../../hooks/usePosts";
import useAuth from "../../../../hooks/useAuth";

type PostPageProps = {};

const PostPage: React.FC<PostPageProps> = () => {
	const { currentUser } = useAuth();
	const user = currentUser as any;
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

		// Fetch selected post once when pid changes (and selectedPost not already matching)
		// Avoid including a changing function in deps to prevent repeated calls
		// and only run when pid actually differs from current selectedPost id

		useEffect(() => {
			const pidParam = router.query.pid as string | undefined;
			if (!pidParam) return;
			if (postStateValue.selectedPost?.id === pidParam) return;
				(async () => {
				setLoading(true);
						try {
							const { PostsService } = await import("../../../../services");
							let mapped: any = null;
							try {
								mapped = await PostsService.getPostById({ postId: pidParam });
							} catch (e) {
								// continue to fallback
							}
							if (!mapped || !mapped.id) {
								// Fallback: fetch posts by group/community and find by id
								try {
									const groupId = community as string | undefined;
									if (groupId) {
										const list = await PostsService.getPostsByGroup({ groupId, sort: "like" });
										const found = Array.isArray(list) ? list.find((p: any) => String(p.id) === String(pidParam)) : null;
										if (found) mapped = found;
									}
								} catch (e2) {
									// ignore
								}
							}
							if (mapped && mapped.id) {
								setPostStateValue((prev) => ({ ...prev, selectedPost: mapped as any }));
							} else {
								console.warn("Post not found for id=", pidParam);
							}
						} catch (error: any) {
							console.error("fetchPost error", error?.message || error);
						} finally {
					setLoading(false);
				}
			})();
		}, [router.query.pid, postStateValue.selectedPost?.id, community, setLoading, setPostStateValue]);

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
