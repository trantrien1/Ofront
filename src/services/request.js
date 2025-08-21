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


