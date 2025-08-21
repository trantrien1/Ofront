import request from "./request";

export const getCommentsByPost = async (options) => {
	const response = await request.get("comments", { params: options });
	return response.data;
};

export default {
	getCommentsByPost,
};


