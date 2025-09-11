import request from "./request";
// In-memory cache: last successful raw posts array for reuse on 304
let __lastPostsRaw = [];

// Like level meanings (1..4):
// 1 = không hài lòng
// 2 = cực kì không hài lòng
// 3 = hài lòng
// 4 = cực kì hài lòng
export const LIKE_LEVEL_LABELS = {
	1: "Không hài lòng",
	2: "Cực kì không hài lòng",
	3: "Hài lòng",
	4: "Cực kì hài lòng",
};

export const getPosts = async (options = {}) => {
	const title = options.title != null ? String(options.title).trim() : '';
	const rawSort = options.sort ? String(options.sort).trim().toLowerCase() : 'like';
	const sort = (rawSort === 'like' || rawSort === 'time') ? rawSort : 'like';
	const typeSort = (String(options.typeSort ?? 'desc').toLowerCase() === 'asc') ? 'asc' : 'desc';
	const usp = new URLSearchParams();
	if (title.length > 0) usp.set('title', title);
	if (sort) usp.set('sort', sort);
	if (typeSort) usp.set('typeSort', typeSort);
	const query = usp.toString();
	const url = `post/get${query ? "?" + query : ""}`;

	let response;
	try {
		response = await request.get(url, { validateStatus: s => [200,304].includes(s) });
	} catch (e) {
		return __lastPostsRaw.map(p => mapFromPostResponse(p));
	}
	if (response.status === 304) {
		if (__lastPostsRaw.length) return __lastPostsRaw.map(p => mapFromPostResponse(p));
		return [];
	}
	const raw = response.data;
	const arr = Array.isArray(raw) ? raw : [];
	__lastPostsRaw = arr;
	return arr.map((p) => mapFromPostResponse(p));
};

// Get posts filtered by group/community using new upstream endpoint /post/get/by-group
export const getPostsByGroup = async ({ groupId, sort = "like", typeSort } = {}) => {
	if (groupId === undefined || groupId === null || groupId === "") {
		throw new Error("groupId is required");
	}
	const usp = new URLSearchParams();
	usp.set("groupId", String(groupId));
	// Backend expects sort values: 'time' or 'like'. Map 'createdAt' -> 'time'.
	let finalSort = sort ? String(sort).trim() : 'like';
	if (finalSort.toLowerCase() === 'createdat' || finalSort === 'createdAt') finalSort = 'time';
	if (finalSort) usp.set('sort', finalSort);
	// Always include typeSort; default to 'desc' for stability
	usp.set('typeSort', (String(typeSort ?? 'desc').toLowerCase() === 'asc') ? 'asc' : 'desc');
	const url = `post/get/by-group?${usp.toString()}`;
	const response = await request.get(url);
	const raw = response.data;
	const arr = Array.isArray(raw) ? raw : [];
	return arr.map((p) => mapFromPostResponse(p, { groupIdFallback: groupId }));
};

export const likePost = async ({ postId } = {}) => {
	// backend LikeDTO expects { postId }
	const numericId = typeof postId === 'string' ? Number(postId) : postId;
	const payload = { postId: Number.isFinite(numericId) ? numericId : postId };
	// Use generic API route and preserve method (PUT per your upstream)
	const response = await request.put("like", payload);
	return response.data;
};

export const approvePost = async ({ postId, approve = true } = {}) => {
	// Backend expects { id, status } at post/update-status
	if (!postId) throw new Error('postId required');
	const payload = { id: Number(postId), status: approve ? 1 : 0 };
	const response = await request.put("post/update-status", payload);
	return response.data;
};

export const updatePost = async ({ postId, title, content } = {}) => {
	const response = await request.put("post/update", { id: postId, title, content });
	return response.data;
};

export const deletePost = async ({ postId } = {}) => {
	if (!postId) throw new Error('postId required');
	const response = await request.delete(`post/delete/${postId}`);
	return response.data;
};

export const updateLikeLevel = async ({ postId, commentId, level } = {}) => {
	// Backend expects exactly the field name 'level' (see LikeDTO)
	if ((!postId && !commentId) || level === undefined || level === null) {
		throw new Error('postId/commentId và level bắt buộc');
	}
	// Normalize numeric ids to numbers when possible to align with repository lookups
	const norm = (v) => {
		if (v == null) return v;
		const n = Number(v);
		return Number.isFinite(n) ? n : v;
	};
	const payload = { level: Number(level), ...(postId ? { postId: norm(postId) } : {}), ...(commentId ? { commentId: norm(commentId) } : {}) };
	const resp = await request.put('update-level', payload);
	return resp.data;
};

// Explicit re-export for TypeScript tooling (some setups need this in .js files)
export { updateLikeLevel as __updateLikeLevelRef, LIKE_LEVEL_LABELS as __LIKE_LEVEL_LABELS_REF };

export const createPost = async (postData) => {
	const payload = { ...postData };
	if (typeof payload.anonymous === 'boolean' && typeof payload.isAnonymous !== 'boolean') {
		payload.isAnonymous = !!payload.anonymous;
	}
	if (typeof payload.isAnonymous === 'boolean' && typeof payload.anonymous !== 'boolean') {
		payload.anonymous = !!payload.isAnonymous;
	}
	try { console.log('[posts.service.createPost] payload', payload); } catch {}
	const response = await request.post("post/create", payload);
	try { console.log('[posts.service.createPost] response.data=', response.data); } catch {}
	return response.data;
};

// Map a single raw API post object to frontend Post
function mapFromPostResponse(p, opts = {}) {
	const username = extractUsername(p?.userOfPost);
	const creatorId = p?.creatorId || p?.userId || p?.userUID || p?.userOfPost?.userUID || p?.userOfPost?.id || '';
	const communityId = p?.communityId || p?.groupId || p?.group?.id || p?.originGroupId || '';
	return {
		id: String(p?.id ?? ""),
		userDisplayText: username,
		creatorId: String(creatorId || '').trim(),
		communityId: String(communityId || '').trim(),
		title: p?.title || "",
		body: p?.content || "",
		countComment: Number(p?.countComment ?? 0),
		countLike: Number(p?.countLike ?? 0),
		numberOfComments: Number(p?.countComment ?? 0),
		voteStatus: Number(p?.countLike ?? 0),
		likeLevel: typeof p?.levelIcon === 'number' ? p.levelIcon : undefined,
		createdAt: p?.createdAt ?? null,
		editedAt: p?.editedAt ?? null,
		anonymous: !!p?.anonymous,
		// also honor 'isAnonymous' if backend uses Java style boolean naming
		...(p?.isAnonymous !== undefined ? { anonymous: !!p.isAnonymous } : {}),
		status: typeof p?.status === 'number' ? p.status : undefined,
		approved: typeof p?.approved === 'boolean' ? p.approved : undefined,
		...(opts?.groupIdFallback != null ? { groupId: String(opts.groupIdFallback) } : {}),
	};
}

export const getPostById = async ({ postId } = {}) => {
	const id = typeof postId === 'string' ? postId : String(postId);
	const url = `post/get/${id}`; // via local API proxy
	let response;
	try {
		response = await request.get(url);
	} catch (err) {
		throw err;
	}
	const raw = response.data;
	return mapFromPostResponse(raw || {});
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
