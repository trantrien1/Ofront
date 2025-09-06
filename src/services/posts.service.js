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
				// Use username from backend userOfPost
				const correctUsername = extractUsername(p.userOfPost);
				const nestedGroupId = (p.group && (p.group.id ?? p.group.groupId)) || (p.groupOfPost && (p.groupOfPost.id ?? p.groupOfPost.groupId));
				const nestedGroupName = (p.group && (p.group.name ?? p.group.displayName)) || (p.groupOfPost && (p.groupOfPost.name ?? p.groupOfPost.displayName));
				const cid = p.communityId || p.groupId || nestedGroupId || p.categoryId || p.communityDisplayText || "general";
				const cdisp = p.communityDisplayText || nestedGroupName || p.communityName || (p.communityId ? String(p.communityId) : "");
				return {
					id: String(p.id),
		communityId: cid,
					communityImageURL: p.communityImageURL || null,
					userDisplayText: correctUsername,
					userUID: p.userUID || p.userOfPost?.userUID || "",
					creatorId: String(p.creatorId || p.userId || p.userOfPost?.id || p.userOfPost?.userId || ""),
					title: p.title || "",
					body: p.body || p.content || "",
					numberOfComments: Number(p.countComment ?? p.commentCount ?? p.numberOfComments) || 0,
					voteStatus: Number(p.countLike ?? p.likes ?? p.voteStatus) || 0,
					status: typeof p.status === 'number' ? p.status : (p.approved === true ? 1 : (p.approved === false ? 0 : undefined)),
					approved: typeof p.approved === 'boolean' ? p.approved : (typeof p.status === 'number' ? Number(p.status) === 1 : undefined),
					currentUserVoteStatus: p.userIsLike ? { id: `self_${p.id}`, voteValue: 1 } : undefined,
					imageURL: p.imageURL || null,
					postType: p.postType || "",
					createdAt: p.createdAt || new Date().toISOString(),
					editedAt: p.editedAt || null,
					communityDisplayText: cdisp,
					isPinned: Boolean(p.isPinned),
					communityRuleNumber: p.communityRuleNumber || null,
					// extras for UI without changing Post type
					// @ts-ignore
					authorAvatarURL: p.userOfPost?.urlAvatar || null,
					// @ts-ignore
					userOfPost: p.userOfPost || null,
					// @ts-ignore
					likedByMe: !!p.userIsLike,
					// @ts-ignore
					likeCount: Number(p.countLike ?? 0),
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

// Get posts filtered by group/community using new upstream endpoint /post/get/by-group
export const getPostsByGroup = async ({ groupId, sort = "like", typeSort } = {}) => {
	if (groupId === undefined || groupId === null || groupId === "") {
		throw new Error("groupId is required");
	}
	const usp = new URLSearchParams();
	usp.set("groupId", String(groupId));
		if (sort) usp.set("sort", String(sort));
		if (typeSort) usp.set("typeSort", String(typeSort));
	const url = `post/get/by-group?${usp.toString()}`;
		let response;
	try {
		response = await request.get(url);
	} catch (err) {
		// If unauthorized/forbidden, try explicit public fetch (no auth)
		const status = err?.response?.status;
		if (status === 401 || status === 403) {
			try {
				response = await request.get(url, { headers: { 'x-public': '1' } });
			} catch (e2) {
					// fall through to legacy attempt below
					response = undefined;
			}
		} else {
				// Not an auth error; try legacy endpoint scoped by communityId
				response = undefined;
		}
	}

		// If still no response, try legacy scoped endpoint: /api/group/posts?communityId={id}
		if (!response) {
			try {
				const legacy = await request.get(`group/posts`, { params: { communityId: String(groupId) } });
				response = legacy;
			} catch (e3) {
				// Final fallback: return empty array instead of throwing to avoid UI crash
				return [];
			}
		}

	// Map like getPosts
	try {
		const raw = response.data;
		let postsArray = [];
		if (Array.isArray(raw)) {
			postsArray = raw;
		} else if (raw && Array.isArray(raw.posts)) {
			postsArray = raw.posts;
		} else if (raw && raw.data && Array.isArray(raw.data)) {
			postsArray = raw.data;
		}
		if (postsArray.length > 0) {
				const mapped = postsArray.map((p) => {
				const correctUsername = extractUsername(p.userOfPost);
				return {
					id: String(p.id),
			// Ensure posts are scoped to the requested group; fallback to data fields if missing
			communityId: (typeof groupId !== 'undefined' && groupId !== null && String(groupId) !== '')
				? String(groupId)
				: (p.communityId || p.groupId || p.categoryId || p.communityDisplayText || "general"),
					communityImageURL: p.communityImageURL || null,
					userDisplayText: correctUsername,
					userUID: p.userUID || p.userOfPost?.userUID || "",
					creatorId: String(p.creatorId || p.userId || p.userOfPost?.id || p.userOfPost?.userId || ""),
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
			response.data = [];
		}
		} catch (e) {
			response.data = [];
	}
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
	if (!postId) throw new Error('postId required');
	let idPart = postId;
	// Try numeric coercion if possible
	try {
		const n = typeof postId === 'string' ? Number(postId) : postId;
		if (Number.isFinite(n)) idPart = n;
	} catch {}
	const response = await request.delete(`post/delete/${idPart}`);
	return response.data;
};

export const createPost = async (postData) => {
	// Create new post via API proxy; ensure groupId is present for backend
	const payload = { ...postData };
	if (payload && payload.communityId != null && payload.groupId == null) {
		const n = typeof payload.communityId === 'string' ? Number(payload.communityId) : payload.communityId;
		payload.groupId = Number.isFinite(n) ? n : payload.communityId;
	}
	const response = await request.post("post/create", payload);
	try { console.debug("PostsService.createPost: response=", response.data); } catch (e) {}
	return response.data;
};

// Map a single raw API post object to frontend Post
function mapRawToPost(p) {
	const correctUsername = extractUsername(p?.userOfPost);
	const nestedGroupId = (p?.group && (p.group.id ?? p.group.groupId)) || (p?.groupOfPost && (p.groupOfPost.id ?? p.groupOfPost.groupId));
	const nestedGroupName = (p?.group && (p.group.name ?? p.group.displayName)) || (p?.groupOfPost && (p.groupOfPost.name ?? p.groupOfPost.displayName));
	const cid = p?.communityId || p?.groupId || nestedGroupId || p?.categoryId || p?.communityDisplayText || "general";
	const cdisp = p?.communityDisplayText || nestedGroupName || p?.communityName || (p?.communityId ? String(p.communityId) : "");
	return {
		id: String(p?.id ?? ""),
		communityId: cid,
		communityImageURL: p?.communityImageURL || null,
		userDisplayText: correctUsername,
		userUID: p?.userUID || p?.userOfPost?.userUID || "",
		creatorId: String(p?.creatorId || p?.userId || p?.userOfPost?.id || p?.userOfPost?.userId || ""),
		title: p?.title || "",
	body: p?.body || p?.content || "",
	numberOfComments: Number(p?.countComment ),
	voteStatus: Number(p?.countLike),
		status: typeof p?.status === 'number' ? p.status : (p?.approved === true ? 1 : (p?.approved === false ? 0 : undefined)),
		approved: typeof p?.approved === 'boolean' ? p.approved : (typeof p?.status === 'number' ? Number(p.status) === 1 : undefined),
		currentUserVoteStatus: p?.userIsLike ? { id: `self_${p?.id}`, voteValue: 1 } : undefined,
		imageURL: p?.imageURL || null,
		postType: p?.postType || "",
		createdAt: p?.createdAt || new Date().toISOString(),
		editedAt: p?.editedAt || null,
		communityDisplayText: cdisp,
		isPinned: Boolean(p?.isPinned),
		communityRuleNumber: p?.communityRuleNumber || null,
	// extras for UI
	// @ts-ignore
	authorAvatarURL: p?.userOfPost?.urlAvatar || null,
	// @ts-ignore
	userOfPost: p?.userOfPost || null,
	// @ts-ignore
	likedByMe: !!p?.userIsLike,
	// @ts-ignore
	likeCount: Number(p?.countLike ?? 0),
	};
}

export const getPostById = async ({ postId } = {}) => {
	const id = typeof postId === 'string' ? postId : String(postId);
	const url = `post/get/${id}`; // via local API proxy
	let response;
	try {
		response = await request.get(url);
	} catch (err) {
		// Retry public if auth fails
		const status = err?.response?.status;
		if (status === 401 || status === 403) {
			response = await request.get(url, { headers: { 'x-public': '1' } });
		} else {
			throw err;
		}
	}
	const raw = response.data;
	const rawPost = Array.isArray(raw) ? raw[0] : (raw && raw.data ? raw.data : raw);
	return mapRawToPost(rawPost || {});
};

export default {
	getPosts,
	getPostsByGroup,
	likePost,
	approvePost,
	updatePost,
	deletePost,
	createPost,
	getPostById
};
function extractUsername(userOfPost) {
  if (!userOfPost) return "anonymous";
  if (typeof userOfPost === "string") return userOfPost;      // trường hợp backend trả string
  if (typeof userOfPost === "object" && userOfPost.username) {
    return userOfPost.username;                               // trường hợp backend trả object
  }
  return "anonymous";
}
