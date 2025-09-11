import request from "./request";

export const getCommentsByPost = async (options) => {
	const response = await request.get("comments", { params: options });
	return response.data;
};

export const getCommentsByPostId = async (postId, params = {}) => {
	if (!postId) throw new Error('postId is required');
	const url = `comment/get/by-posts/${postId}`;
	const response = await request.get(url, { params });
	return response.data;
};

export const createComment = async (payload) => {
	// payload: { content, postId, parentId?, isAnonymous? }
	const data = { ...payload };
	if (data.anonymous != null && data.isAnonymous == null) data.isAnonymous = data.anonymous;
	const response = await request.post("comment/create", data);
	return response.data;
};

export const likeComment = async ({ commentId }) => {
	const response = await request.put("comment/like", { commentId });
	return response.data;
};

export const replyToComment = async ({ content, postId, parentId, anonymous }) => {
	if (!parentId) throw new Error('parentId is required for reply');
	const response = await request.post("comment/create", { content, postId, parentId, isAnonymous: !!anonymous, anonymous: !!anonymous });
	return response.data;
};

export const deleteComment = async (commentId) => {
	if (!commentId) throw new Error('commentId is required');
	const response = await request.delete(`comment/delete/${commentId}`);
	return response.data;
};

export default {
	getCommentsByPost,
	getCommentsByPostId,
	createComment,
	likeComment,
	replyToComment,
	deleteComment,
};