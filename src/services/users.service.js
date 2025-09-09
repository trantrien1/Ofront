import request from "./request";

export const getUsers = async (options = {}) => {
	const response = await request.get("users", { params: options });
	return response.data;
};

export const createUser = async (payload) => {
	const response = await request.post("users", payload);
	return response.data;
};

export const login = async (payload) => {
	// Debug outgoing login payload
	console.debug("UsersService.login: payload=", payload);
	// The backend sometimes returns raw text; try to parse JSON but fallback to text
	const response = await request.post("login", payload, {
		headers: { "Content-Type": "application/json" },
	});
	// log upstream result status/type
	try {
		console.debug("UsersService.login: response.data=", response.data);
	} catch (e) {}
	return response.data;
};

export const register = async (payload) => {
	console.debug("UsersService.register: payload=", payload);
	// Call through local API so we can normalize errors and handle upstream text/json
	const response = await request.post("register", payload, {
		headers: { "Content-Type": "application/json" },
	});
	try { console.debug("UsersService.register: response.data=", response.data); } catch(e) {}
	return response.data;
};

export default {
	getUsers,
	createUser,
};


