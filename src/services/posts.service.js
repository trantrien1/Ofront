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

	// Map upstream post shape to frontend Post type
	try {
		const raw = response.data;
		if (Array.isArray(raw)) {
			const mapped = raw.map((p) => {
				// Use username from userOfPost field in database
				const correctUsername = extractUsername(p.userOfPost);

				return {
					id: String(p.id),
					communityId: p.communityId || p.communityDisplayText || "general",
					communityImageURL: p.communityImageURL || null,
					userDisplayText: correctUsername,
					userUID: p.userUID || p.userOfPost?.userUID || "",
					title: p.title || "",
					body: p.body || "",
					numberOfComments: Number(p.numberOfComments) || 0,
					voteStatus: Number(p.voteStatus) || Number(p.likes) || Number(p.numberOfLikes) || Number(p.upvotes) || Number(p.voteCount) || 0,
					imageURL: p.imageURL || null,
					postType: p.postType || "",
					createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
					editedAt: p.editedAt ? new Date(p.editedAt) : null,
					communityDisplayText: p.communityDisplayText || p.communityId || "",
					isPinned: Boolean(p.isPinned),
					communityRuleNumber: p.communityRuleNumber || null,
				};
			});
			response.data = mapped;
		}
	} catch (e) {
		console.debug("PostsService.getPosts: mapping error", e);
	}
	return response.data;
};

export const likePost = async ({ postId, commentId } = {}) => {
	// backend LikeDTO expects { postId, commentId }
	const payload = { postId, commentId };
	const response = await request.put("like", payload);
	try { console.debug("PostsService.likePost: response=", response.data); } catch (e) {}
	return response.data;
};

export const createPost = async (postData) => {
	// Create new post via API proxy
	const response = await request.post("post/create", postData);
	try { console.debug("PostsService.createPost: response=", response.data); } catch (e) {}
	return response.data;
};

export default {
	getPosts,
	likePost,
	createPost
};
function extractUsername(userOfPost) {
  if (!userOfPost) return "anonymous";
  if (typeof userOfPost === "string") return userOfPost;      // trường hợp backend trả string
  if (typeof userOfPost === "object" && userOfPost.username) {
    return userOfPost.username;                               // trường hợp backend trả object
  }
  return "anonymous";
}
