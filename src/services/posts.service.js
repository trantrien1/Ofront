import request from "./request";

export const getPosts = async (options = {}) => {
	const response = await request.get("posts", { params: options });
	return response.data;
};

export default {
	getPosts,
};


