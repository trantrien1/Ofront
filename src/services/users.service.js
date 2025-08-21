import request from "./request";

export const getUsers = async (options = {}) => {
	const response = await request.get("users", { params: options });
	return response.data;
};

export const createUser = async (payload) => {
	const response = await request.post("users", payload);
	return response.data;
};

export default {
	getUsers,
	createUser,
};


