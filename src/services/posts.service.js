import request from "./request";

export const getPosts = async (options = {}) => {
	// Use local Next.js API proxy which forwards cookie token to upstream
	// request.baseURL already points to the local API root (e.g. http://localhost:3000/api/)
	// so use a relative path without leading slash to avoid duplicate /api segments.
	// Ensure upstream-required query params exist (match screenshot/example)
	const params = {
		// Upstream expects these keys to exist; title/typeSort can be empty strings
		title: typeof options.title !== "undefined" ? String(options.title) : "",
		sort: typeof options.sort !== "undefined" ? String(options.sort) : "like",
		typeSort: typeof options.typeSort !== "undefined" ? String(options.typeSort) : "",
	};
	const usp = new URLSearchParams();
	if (typeof params.title !== 'undefined') usp.set('title', params.title);
	if (params.sort) usp.set('sort', params.sort);
	if (typeof params.typeSort !== 'undefined') usp.set('typeSort', params.typeSort);
	const query = usp.toString();
	// Use local API proxy so cookies/withCredentials are sent to our domain,
	// and the proxy forwards Authorization/cookies to upstream.
	// request.baseURL already points to /api, so a relative path is correct here.
	// Use local Next.js API route so cookies & auth are included automatically
	const url = `post/get${query ? "?" + query : ""}`;
	// For unauthenticated or general feed, callers may omit options.auth; if explicitly public, pass x-public header
	const isPublic = options && (options.public === true || options.auth === false);
			let response;
			try {
					// Prefer a simple public proxy when fetching public feed
					if (isPublic) {
							try {
									response = await request.get("posts/community-feed", { headers: { 'x-public': '1' } });
							} catch (e) {
									// fall back to regular endpoint with explicit public header
							}
					}
					if (!response) {
							// Build per-request config; for public calls, also remove Authorization just for this request
							const config = isPublic
								? {
										headers: { 'x-public': '1' },
										transformRequest: [
											(data, headers) => {
												try { if (headers && 'Authorization' in headers) delete headers.Authorization; } catch {}
												return data;
											},
										],
									}
								: { headers: {} };
							response = await request.get(url, config);
					}
	} catch (err) {
		const status = err?.response?.status;
		// On unauthorized/forbidden, retry explicitly as public to avoid 403 when token is invalid/missing
					if (!isPublic && (status === 401 || status === 403)) {
							try {
									response = await request.get("posts/community-feed", { headers: { 'x-public': '1' } });
							} catch (_) {
									response = await request.get(url, { headers: { 'x-public': '1' } });
							}
		} else {
			throw err;
		}
	}

	console.debug("PostsService.getPosts: raw response=", response.data);

	// Map upstream post shape to frontend Post type
	try {
		const raw = response.data;
		let postsArray = [];

		// Handle different response formats
		if (Array.isArray(raw)) {
			postsArray = raw;
		} else if (raw && Array.isArray(raw.posts)) {
			// Handle mock data format: {posts: [...]} 
			postsArray = raw.posts;
		} else if (raw && raw.data && Array.isArray(raw.data)) {
			// Handle wrapped data format: {data: [...]} 
			postsArray = raw.data;
		}

		if (postsArray.length > 0) {
			const mapped = postsArray.map((p) => {
				// Use username from userOfPost field in database
				const correctUsername = extractUsername(p.userOfPost);
				return {
					id: String(p.id),
					communityId: p.communityId || p.communityDisplayText || "general",
					communityImageURL: p.communityImageURL || null,
					userDisplayText: correctUsername,
					userUID: p.userUID || p.userOfPost?.userUID || "",
					title: p.title || "",
					body: p.body || p.content || "",
					numberOfComments: Number(p.numberOfComments ?? p.countComment ?? p.commentCount) || 0,
					voteStatus: Number(p.voteStatus) || Number(p.likes) ||  Number(p.countLike) || 0,
					status: typeof p.status === 'number' ? p.status : (p.approved === true ? 1 : (p.approved === false ? 0 : undefined)),
					approved: typeof p.approved === 'boolean' ? p.approved : (typeof p.status === 'number' ? Number(p.status) === 1 : undefined),
					currentUserVoteStatus: p.userIsLike ? { id: `self_${p.id}`, voteValue: 1 } : undefined,
					imageURL: p.imageURL || null,
					postType: p.postType || "",
					createdAt: p.createdAt || new Date().toISOString(),
					editedAt: p.editedAt || null,
					communityDisplayText: p.communityDisplayText || p.communityId || "",
					isPinned: Boolean(p.isPinned),
					communityRuleNumber: p.communityRuleNumber || null,
				};
			});
			response.data = mapped;
		} else {
			// If no posts, return empty array
			response.data = [];
		}
	} catch (e) {
		console.debug("PostsService.getPosts: mapping error", e);
		// Fallback to empty array if mapping fails
		response.data = [];
	}

	console.debug("PostsService.getPosts: final response=", response.data);
	return response.data;
	};

export const likePost = async ({ postId } = {}) => {
	// backend LikeDTO expects { postId }
	const numericId = typeof postId === 'string' ? Number(postId) : postId;
	const payload = { postId: Number.isFinite(numericId) ? numericId : postId };
	try { console.debug("PostsService.likePost: sending payload=", payload); } catch (e) {}
	// Use generic API route and preserve method (PUT per your upstream)
	const response = await request.put("like", payload);
	try { console.debug("PostsService.likePost: response=", response.data); } catch (e) {}
	return response.data;
};

export const approvePost = async ({ postId, approve = true } = {}) => {
	const payload = { postId, approve: !!approve };
	const response = await request.post("posts/approve", payload);
	return response.data;
};

export const updatePost = async ({ postId, title, content } = {}) => {
	const response = await request.put("post/update", { postId, title, content });
	return response.data;
};

export const deletePost = async ({ postId } = {}) => {
	const response = await request.post("post/delete", { postId });
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
	approvePost,
	updatePost,
	deletePost,
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
