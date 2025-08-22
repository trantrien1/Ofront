import axios from "axios";
import nookies from "nookies";

// Use explicit NEXT_PUBLIC_API_BASE_URL when provided (useful in production or remote dev).
// Default to relative `/api/` so client code talks to the running Next server regardless of port.
const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || "/api/";

// Read token from cookie (works on client and server with nookies)
let token = "";
try {
	const cookies = nookies.get(undefined);
	token = cookies?.token || "";
	
	// Fallback: try localStorage if no cookie (VS Code Simple Browser compatibility)
	if (!token && typeof window !== "undefined") {
		try {
			token = localStorage.getItem("authToken") || "";
		} catch (e) {
			// localStorage not available
		}
	}
} catch (e) {
	token = "";
}

const request = axios.create({
	baseURL,
	// allow browser to send cookies to same-origin API routes
	withCredentials: true,
});

if (token) {
	request.defaults.headers.common["Authorization"] = `Bearer ${token}`;
	try {
		console.debug("request: initialized with token (length)", token.length);
	} catch (e) {}
}

// Function to update token after login
export const updateRequestToken = (newToken) => {
	try {
		if (newToken) {
			request.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
			console.debug("request: token updated (length)", newToken.length);
		} else {
			delete request.defaults.headers.common["Authorization"];
			console.debug("request: token cleared");
		}
	} catch (e) {
		console.error("request: failed to update token", e);
	}
};

// Response interceptor: if we get 401, clear token and reload (force logout)
request.interceptors.response.use(
	(response) => response,
	(error) => {
		try {
			const status = error?.response?.status;
			if (status === 401) {
				try {
					nookies.destroy(undefined, "token");
				} catch (e) {}
				try {
					if (request && request.defaults && request.defaults.headers) {
						delete request.defaults.headers.common["Authorization"];
					}
				} catch (e) {}
				if (typeof window !== "undefined") {
					// redirect to home or login
					window.location.href = "/";
				}
			}
		} catch (e) {
			// ignore
		}
		return Promise.reject(error);
	}
);

export default request;


