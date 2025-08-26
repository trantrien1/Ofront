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
	// payload: { content, postId }
	const response = await request.post("comment/create", payload);
	return response.data;
};

export const likeComment = async ({ commentId }) => {
	const response = await request.put("comment/like", { commentId });
	return response.data;
};

export default {
	getCommentsByPost,
	getCommentsByPostId,
	createComment,
	likeComment,
};