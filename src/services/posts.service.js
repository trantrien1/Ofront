import request from "./request";

export const getPosts = async (options = {}) => {
	// Use local Next.js API proxy which forwards cookie token to upstream
	// request.baseURL already points to the local API root (e.g. http://localhost:3000/api/)
	// so use a relative path without leading slash to avoid duplicate /api segments.
	// Ensure upstream-required query params exist (match screenshot/example)
	const params = {
		// title may be empty string when searching all
		title: typeof options.title !== "undefined" ? options.title : "",
		// sort defaults to 'like' per upstream expectation
		sort: typeof options.sort !== "undefined" ? options.sort : "like",
		// typeSort may be present but empty
		typeSort: typeof options.typeSort !== "undefined" ? options.typeSort : "",
		...options,
	};
	const query = new URLSearchParams(params).toString();
	// request.baseURL already points to the local API root (e.g. http://localhost:3000/api/)
	// use relative path so axios baseURL resolves to the proxy endpoint
	const url = `post/get${query ? "?" + query : ""}`;
	const response = await request.get(url);
	// debug log (can be removed later)
	console.debug("PostsService.getPosts: fetched", Array.isArray(response.data) ? response.data.length : typeof response.data);

	// Map upstream post shape to frontend Post type
	try {
		const raw = response.data;
		if (Array.isArray(raw)) {
			const mapped = raw.map((p) => ({
				id: String(p.id),
				communityId: p.communityId || "",
				communityImageURL: p.communityImageURL || null,
				userDisplayText: p.userOfPost?.username || p.userOfPost?.displayName || p.userDisplayText || "",
				creatorId: p.userOfPost?.id || p.userOfPost?.username || p.creatorId || "",
				title: p.title || "",
				body: p.content || p.body || "",
				numberOfComments: p.numberOfComments || 0,
				voteStatus: typeof p.countLike === "number" ? p.countLike : 0,
				currentUserVoteStatus: p.userIsLike ? { id: `${p.userOfPost?.username || "u"}_${p.id}`, voteValue: 1 } : undefined,
				imageURL: p.userOfPost?.urlAvatar || p.imageURL || null,
				postIdx: undefined,
				visibility: p.visibility || "public",
				createdAt: p.createdAt ? new Date(p.createdAt) : undefined,
				editedAt: p.updatedAt ? new Date(p.updatedAt) : undefined,
			}));
			return mapped;
		}
	} catch (e) {
		console.debug("PostsService.getPosts: mapping error", e);
	}
	return response.data;
};

export default {
	getPosts,
};

export const likePost = async ({ postId, commentId } = {}) => {
	// backend LikeDTO expects { postId, commentId }
	const payload = { postId, commentId };
	const response = await request.put("like", payload);
	try { console.debug("PostsService.likePost: response=", response.data); } catch (e) {}
	return response.data;
};


